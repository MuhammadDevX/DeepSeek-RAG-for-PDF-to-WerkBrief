"""
fix_embeddings.py — Re-embed the legacy "/n-bug" knowledgebase vectors so the
whole index uses ONE consistent embedding format.

BACKGROUND
  The original ~532 vectors (createKnowledgebase.ipynb) were embedded with a
  literal "/n" typo and a different boilerplate than the newer upload path,
  so they sit in a slightly different semantic region than vectors added via
  /api/add-to-knowledgebase. Those legacy vectors are exactly the ones that
  LACK a 'text' metadata key.

  This script finds the missing-'text' vectors, rebuilds their content in the
  canonical format used by add-to-knowledgebase/route.ts:

      Item: {desc}
      Goederen Omschrijving: {gdesc}
      Goederen Code: {code}
      [Category: {category}]      <- only if category is meaningful

  re-embeds with text-embedding-ada-002, and UPSERTS BY THE SAME ID
  (overwrite — no deletes, no orphaned vectors). All existing metadata is
  preserved; we only add/overwrite 'text' and add a 'reembedded_at' marker.

SAFETY
  * DRY-RUN BY DEFAULT — prints what it would change and writes NOTHING.
  * Pass --apply to actually re-embed + upsert.
  * Targets ONLY vectors missing the 'text' key. Vectors that already have
    'text' (the newer, clean cohort) are never touched.

USAGE
  python fix_embeddings.py            # dry run, no writes
  python fix_embeddings.py --apply    # perform the re-embed + upsert
"""

import os
import sys
import threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")
INDEX_NAME       = os.getenv("PINECONE_INDEX", "ship2aruba")
EMBED_MODEL      = "text-embedding-ada-002"

FETCH_WORKERS   = 12
ID_CHAR_BUDGET  = 2000     # cap combined URL-encoded ID length per fetch
EMBED_WORKERS   = 8        # parallel OpenAI embedding calls
UPSERT_BATCH    = 50       # vectors per upsert call
APPLY           = "--apply" in sys.argv

if not PINECONE_API_KEY:
    sys.exit("ERROR: PINECONE_API_KEY not set in .env")
if not OPENAI_API_KEY:
    sys.exit("ERROR: OPENAI_API_KEY not set in .env")

from pinecone import Pinecone
from openai import OpenAI

pc     = Pinecone(api_key=PINECONE_API_KEY)
index  = pc.Index(INDEX_NAME)
openai = OpenAI(api_key=OPENAI_API_KEY)


# ---------------------------------------------------------------------------
# Helpers (shared shape with audit.py)
# ---------------------------------------------------------------------------
def get_meta(obj) -> dict:
    raw = getattr(obj, "metadata", None)
    if raw is None and isinstance(obj, dict):
        raw = obj.get("metadata")
    return dict(raw) if raw else {}


def get_values(obj):
    vals = getattr(obj, "values", None)
    if vals is None and isinstance(obj, dict):
        vals = obj.get("values")
    return vals


def iter_all_ids(index, namespace=""):
    for page in index.list(namespace=namespace):
        if isinstance(page, list):
            yield from page
        elif isinstance(page, str):
            yield page
        else:
            yield from (getattr(page, "ids", []) or [])


def build_char_budget_batches(ids, char_budget=ID_CHAR_BUDGET, max_count=80):
    batches, current, current_len = [], [], 0
    for vid in ids:
        enc_len = len(quote(str(vid))) + 5
        if current and (current_len + enc_len > char_budget or len(current) >= max_count):
            batches.append(current)
            current, current_len = [], 0
        current.append(vid)
        current_len += enc_len
    if current:
        batches.append(current)
    return batches


def fetch_all_parallel(index, ids, namespace=""):
    batches = build_char_budget_batches(ids)
    total = len(batches)
    print(f"    {len(ids)} ids → {total} batches, {FETCH_WORKERS} workers…", flush=True)
    results, lock, done = {}, threading.Lock(), {"n": 0}

    def fetch_one(batch):
        resp = index.fetch(ids=batch, namespace=namespace)
        vectors = getattr(resp, "vectors", None)
        if vectors is None and isinstance(resp, dict):
            vectors = resp.get("vectors", {})
        return dict(vectors) if vectors else {}

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {pool.submit(fetch_one, b): b for b in batches}
        for fut in as_completed(futures):
            try:
                vecs = fut.result()
            except Exception as e:
                print(f"      WARN: batch failed ({len(futures[fut])} ids): {e}", flush=True)
                vecs = {}
            with lock:
                results.update(vecs)
                done["n"] += 1
                if done["n"] % 25 == 0 or done["n"] == total:
                    print(f"      {done['n']}/{total} batches ({len(results)} vectors)…", flush=True)
    return results


def build_canonical_text(meta: dict) -> str:
    """Mirror add-to-knowledgebase/route.ts content format exactly."""
    desc  = str(meta.get("desc", "")).strip()
    gdesc = str(meta.get("gdesc", "")).strip()
    code  = str(meta.get("code", "")).strip()
    category = str(meta.get("category", "")).strip()
    text = f"Item: {desc}\nGoederen Omschrijving: {gdesc}\nGoederen Code: {code}"
    # The newer route only appends Category when it's a real value.
    if category and category.upper() not in ("", "NAN", "N/A", "NONE"):
        text += f"\nCategory: {category}"
    return text


# ---------------------------------------------------------------------------
# Step 1 — discover + fetch every vector, select the missing-'text' ones
# ---------------------------------------------------------------------------
print("=" * 70)
print(f"fix_embeddings.py — mode: {'APPLY (will write)' if APPLY else 'DRY RUN (no writes)'}")
print("=" * 70)

print("\nStep 1: listing + fetching all vectors…")
all_ids = list(iter_all_ids(index))
print(f"  IDs discovered: {len(all_ids)}")
if not all_ids:
    sys.exit("  No vectors found — nothing to do.")

all_vectors = fetch_all_parallel(index, all_ids)
print(f"  Vectors fetched: {len(all_vectors)}")

targets = []   # list of (id, meta) for vectors missing 'text'
for vid, vec in all_vectors.items():
    meta = get_meta(vec)
    if "text" not in meta:
        targets.append((vid, meta))

print(f"\n  Vectors MISSING 'text' (re-embed targets): {len(targets)}")
print(f"  Vectors WITH 'text' (left untouched)      : {len(all_vectors) - len(targets)}")

if not targets:
    print("\n  Nothing to re-embed. Exiting.")
    sys.exit(0)

# Sanity: how many targets have the metadata we need to rebuild content?
missing_fields = [vid for vid, m in targets if not str(m.get("desc", "")).strip()]
if missing_fields:
    print(f"\n  WARNING: {len(missing_fields)} target(s) have an empty 'desc' and "
          f"cannot be rebuilt reliably. They will be SKIPPED.")
targets = [(vid, m) for vid, m in targets if str(m.get("desc", "")).strip()]

print("\n  Source breakdown of re-embed targets:")
for src, cnt in Counter(m.get("source", "<none>") for _, m in targets).most_common():
    print(f"    source={src!r:<20} → {cnt}")


# ---------------------------------------------------------------------------
# Step 2 — preview a few canonical-text rebuilds
# ---------------------------------------------------------------------------
print("\nStep 2: preview of canonical content rebuild (first 5 targets):")
for vid, meta in targets[:5]:
    new_text = build_canonical_text(meta)
    print(f"\n  ID: {vid!r}")
    print(f"    will set text = {new_text!r}")


# ---------------------------------------------------------------------------
# DRY-RUN stops here
# ---------------------------------------------------------------------------
if not APPLY:
    print(f"""

{"=" * 70}
DRY RUN COMPLETE — nothing was written.
  {len(targets)} vector(s) would be re-embedded and upserted by the same ID.
  Existing metadata preserved; 'text' + 'reembedded_at' added.

  Review the previews above, then run:
      python fix_embeddings.py --apply
{"=" * 70}
""")
    sys.exit(0)


# ---------------------------------------------------------------------------
# Step 3 — APPLY: embed in parallel, then upsert in batches (same IDs)
# ---------------------------------------------------------------------------
print(f"\nStep 3: APPLY — re-embedding {len(targets)} vectors…")
now_iso = datetime.now(timezone.utc).isoformat()

def embed_one(item):
    vid, meta = item
    new_text = build_canonical_text(meta)
    resp = openai.embeddings.create(input=new_text, model=EMBED_MODEL)
    new_meta = dict(meta)
    new_meta["text"] = new_text
    new_meta["reembedded_at"] = now_iso
    return {"id": vid, "values": resp.data[0].embedding, "metadata": new_meta}

upsert_records = []
errors = 0
lock = threading.Lock()
done = {"n": 0}

with ThreadPoolExecutor(max_workers=EMBED_WORKERS) as pool:
    futures = {pool.submit(embed_one, t): t for t in targets}
    for fut in as_completed(futures):
        try:
            rec = fut.result()
            with lock:
                upsert_records.append(rec)
        except Exception as e:
            with lock:
                errors += 1
            print(f"    WARN: embed failed for {futures[fut][0]!r}: {e}", flush=True)
        with lock:
            done["n"] += 1
            if done["n"] % 50 == 0 or done["n"] == len(targets):
                print(f"    embedded {done['n']}/{len(targets)}…", flush=True)

print(f"\n  Embeddings ready: {len(upsert_records)} (errors: {errors})")
print(f"  Upserting in batches of {UPSERT_BATCH} (overwrite by same ID)…")

upserted = 0
for i in range(0, len(upsert_records), UPSERT_BATCH):
    batch = upsert_records[i : i + UPSERT_BATCH]
    try:
        index.upsert(vectors=batch)
        upserted += len(batch)
        print(f"    upserted {upserted}/{len(upsert_records)}…", flush=True)
    except Exception as e:
        print(f"    ERROR upserting batch at {i}: {e}", flush=True)

print(f"""

{"=" * 70}
APPLY COMPLETE
  Re-embedded + upserted : {upserted}/{len(targets)}
  Embed errors           : {errors}
  Each vector kept its original ID (overwrite — no deletes).

  Re-run audit.py to confirm 0 missing-'text' vectors remain, and
  compare_retrieval.py to see the two paths now agree.
{"=" * 70}
""")
