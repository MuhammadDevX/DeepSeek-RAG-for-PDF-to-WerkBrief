"""
audit.py — Read-only diagnostic for the ship2aruba Pinecone index.

Investigates two observed problems:
  1. "Found document with no `text` key. Skipping." warnings from
     PineconeVectorStore.similarity_search()
  2. Why a Miss Kay Eau de Parfum query returns unexpected results

Nothing in this file writes, updates, or deletes any Pinecone record.
"""

import os
import sys
import threading
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv(override=True)

# How many fetch requests to run concurrently against Pinecone.
FETCH_WORKERS = 12
# Max combined length (chars) of all IDs in a single fetch request.
# IDs are product-name strings and go into the GET query string, so we cap
# total length to stay well under the server's URL / header-field limits.
ID_CHAR_BUDGET = 2000

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")
INDEX_NAME       = os.getenv("PINECONE_INDEX", "ship2aruba")

AUDIT_QUERY = (
    "Miss Kay Eau de Parfum - Your Vibe Your Scent Fragrance Collection - "
    "First Love,Soft Cuddle & Queen of Hearts in 25ml Travel Friendly Spray Bottles"
)

if not PINECONE_API_KEY:
    sys.exit("ERROR: PINECONE_API_KEY not set in .env")
if not OPENAI_API_KEY:
    sys.exit("ERROR: OPENAI_API_KEY not set in .env")

# ---------------------------------------------------------------------------
# Clients
# ---------------------------------------------------------------------------
from pinecone import Pinecone
from openai import OpenAI

pc     = Pinecone(api_key=PINECONE_API_KEY)
index  = pc.Index(INDEX_NAME)
openai = OpenAI(api_key=OPENAI_API_KEY)


# ---------------------------------------------------------------------------
# Helper: normalise SDK objects vs plain dicts
# ---------------------------------------------------------------------------
def get_meta(vec_or_match) -> dict:
    """Return metadata as a plain dict regardless of SDK response type."""
    raw = getattr(vec_or_match, "metadata", None)
    if raw is None and isinstance(vec_or_match, dict):
        raw = vec_or_match.get("metadata")
    if raw is None:
        return {}
    # Pinecone SDK may return a MapComposite or similar; cast to dict
    return dict(raw)

def get_attr(obj, attr, default=None):
    """Get attribute from object or dict."""
    if hasattr(obj, attr):
        return getattr(obj, attr)
    if isinstance(obj, dict):
        return obj.get(attr, default)
    return default


# ---------------------------------------------------------------------------
# Helper: paginate through every vector id in the index
# ---------------------------------------------------------------------------
def iter_all_ids(index, namespace=""):
    """Yield every vector ID via the list endpoint (read-only)."""
    for page in index.list(namespace=namespace):
        if isinstance(page, list):
            yield from page
        elif isinstance(page, str):
            yield page
        else:
            # Some SDK versions yield objects
            yield from (getattr(page, "ids", []) or [])


# ---------------------------------------------------------------------------
# Helper: split ids into batches bounded by total encoded char length
# ---------------------------------------------------------------------------
def build_char_budget_batches(ids, char_budget=ID_CHAR_BUDGET, max_count=80):
    """Group IDs so each batch's URL-encoded length stays under char_budget.

    IDs are long product-name strings placed in the fetch GET query string,
    so a fixed item count overflows the URL. We bound by encoded length and
    also cap the item count as a secondary safety limit.
    """
    batches = []
    current, current_len = [], 0
    for vid in ids:
        enc_len = len(quote(str(vid))) + 5  # +5 for "&ids=" separator overhead
        # A single very long ID still goes in its own batch.
        if current and (current_len + enc_len > char_budget or len(current) >= max_count):
            batches.append(current)
            current, current_len = [], 0
        current.append(vid)
        current_len += enc_len
    if current:
        batches.append(current)
    return batches


# ---------------------------------------------------------------------------
# Helper: fetch all vectors in parallel (read-only)
# ---------------------------------------------------------------------------
def fetch_all_parallel(index, ids, namespace=""):
    batches = build_char_budget_batches(ids)
    total_batches = len(batches)
    print(f"    split {len(ids)} ids into {total_batches} char-budget batches; "
          f"fetching with {FETCH_WORKERS} parallel workers…", flush=True)

    results = {}
    lock = threading.Lock()
    done = {"n": 0}

    def fetch_one(batch):
        response = index.fetch(ids=batch, namespace=namespace)
        vectors = getattr(response, "vectors", None)
        if vectors is None and isinstance(response, dict):
            vectors = response.get("vectors", {})
        return dict(vectors) if vectors else {}

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as pool:
        futures = {pool.submit(fetch_one, b): b for b in batches}
        for fut in as_completed(futures):
            try:
                vectors = fut.result()
            except Exception as e:
                # Per-batch failure shouldn't abort the whole audit.
                print(f"      WARN: batch failed ({len(futures[fut])} ids): {e}", flush=True)
                vectors = {}
            with lock:
                results.update(vectors)
                done["n"] += 1
                if done["n"] % 25 == 0 or done["n"] == total_batches:
                    print(f"      {done['n']}/{total_batches} batches done "
                          f"({len(results)} vectors)…", flush=True)
    return results


# ---------------------------------------------------------------------------
# SECTION 1 – Index-level stats
# ---------------------------------------------------------------------------
print("=" * 70)
print("SECTION 1 — Index stats")
print("=" * 70)

stats = index.describe_index_stats()
total_count = get_attr(stats, "total_vector_count") or (stats.get("total_vector_count") if isinstance(stats, dict) else 0)
dimension   = get_attr(stats, "dimension") or (stats.get("dimension") if isinstance(stats, dict) else "?")
print(f"  Total vector count : {total_count}")
print(f"  Dimension          : {dimension}")
namespaces = get_attr(stats, "namespaces") or (stats.get("namespaces") if isinstance(stats, dict) else {}) or {}
if namespaces:
    for ns, ns_stats in namespaces.items():
        label = repr(ns) if ns else "(default namespace)"
        vc = get_attr(ns_stats, "vector_count") or (ns_stats.get("vector_count") if isinstance(ns_stats, dict) else "?")
        print(f"  Namespace {label}: {vc} vectors")
else:
    print("  Namespace          : (default, no named namespaces)")


# ---------------------------------------------------------------------------
# SECTION 2 – Fetch ALL vectors and audit metadata keys
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("SECTION 2 — Metadata key audit  (searching for missing `text` key)")
print("=" * 70)

all_ids = list(iter_all_ids(index))
print(f"\n  IDs discovered via list(): {len(all_ids)}")

if not all_ids:
    print("  No vectors found — nothing to audit.")
    sys.exit(0)

print("  Fetching all vectors in parallel (this may take a minute)…")
all_vectors = fetch_all_parallel(index, all_ids)
print(f"  Vectors returned by fetch(): {len(all_vectors)}")

# Classify by which top-level metadata keys are present
missing_text   = []
has_text       = []
key_freq       = Counter()
source_counter = Counter()

for vid, vec in all_vectors.items():
    meta = get_meta(vec)
    for k in meta:
        key_freq[k] += 1
    source_counter[meta.get("source", "<none>")] += 1
    if "text" in meta:
        has_text.append(vid)
    else:
        missing_text.append(vid)

print(f"\n  Vectors WITH    'text' key : {len(has_text)}")
print(f"  Vectors MISSING 'text' key : {len(missing_text)}")

print("\n  Metadata key frequency across ALL vectors:")
for k, cnt in key_freq.most_common():
    print(f"    {k:<20} {cnt}")

print("\n  Breakdown by 'source' field:")
for src, cnt in source_counter.most_common():
    print(f"    {src:<25} {cnt}")


# ---------------------------------------------------------------------------
# SECTION 3 – Sample the "missing text" vectors to understand their structure
# ---------------------------------------------------------------------------
SAMPLE_LIMIT = 10

print()
print("=" * 70)
print(f"SECTION 3 — Sample of up to {SAMPLE_LIMIT} vectors missing 'text' key")
print("=" * 70)

if not missing_text:
    print("  None found — all vectors have a 'text' key.")
else:
    sample = missing_text[:SAMPLE_LIMIT]
    for vid in sample:
        meta = get_meta(all_vectors[vid])
        print(f"\n  ID      : {vid!r}")
        print(f"  Keys    : {list(meta.keys())}")
        for k, v in meta.items():
            vstr = str(v)
            if len(vstr) > 120:
                vstr = vstr[:117] + "..."
            print(f"    {k:<20}: {vstr}")

    if len(missing_text) > SAMPLE_LIMIT:
        print(f"\n  ... and {len(missing_text) - SAMPLE_LIMIT} more.")

    # Check for alternative text-like keys
    alt_text_keys = ["page_content", "content", "body", "description", "text_content"]
    print("\n  Checking for alternative text-like keys in missing-text vectors:")
    alt_found = defaultdict(int)
    for vid in missing_text:
        meta = get_meta(all_vectors[vid])
        for ak in alt_text_keys:
            if ak in meta:
                alt_found[ak] += 1
    if alt_found:
        for ak, cnt in alt_found.items():
            print(f"    '{ak}' found in {cnt} vectors")
    else:
        print("    None of the common alternative keys were found.")
        print("    → These vectors were stored WITHOUT any text field at all.")


# ---------------------------------------------------------------------------
# SECTION 4 – Source-level breakdown of missing-text vectors
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("SECTION 4 — Source breakdown of missing-text vectors")
print("=" * 70)

missing_by_source = Counter()
for vid in missing_text:
    meta = get_meta(all_vectors[vid])
    missing_by_source[meta.get("source", "<none>")] += 1

if missing_by_source:
    for src, cnt in missing_by_source.most_common():
        print(f"  source={src!r:<25} → {cnt} missing-text vectors")
else:
    print("  (no missing-text vectors)")


# ---------------------------------------------------------------------------
# SECTION 5 – Similarity search with scores for the Miss Kay query
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("SECTION 5 — Raw similarity search (direct Pinecone, bypasses LangChain)")
print(f"  Query: {AUDIT_QUERY[:80]}...")
print("=" * 70)

embed_resp = openai.embeddings.create(
    input=AUDIT_QUERY,
    model="text-embedding-ada-002",
)
query_vec = embed_resp.data[0].embedding

raw_results = index.query(
    vector=query_vec,
    top_k=20,
    include_metadata=True,
)

print(f"\n  Top-20 matches (score | has_text | source | id):")
print(f"  {'Score':>7}  {'text?':<6}  {'source':<16}  ID")
print("  " + "-" * 68)

matches = getattr(raw_results, "matches", None) or []
for m in matches:
    meta   = get_meta(m)
    score  = get_attr(m, "score", 0.0)
    has_t  = "YES" if "text" in meta else "NO "
    source = meta.get("source", "<none>")
    vid    = get_attr(m, "id", "")
    vid_disp = vid if len(vid) <= 50 else vid[:47] + "..."
    print(f"  {score:>7.4f}  {has_t:<6}  {source:<16}  {vid_disp}")

print()
print("  Full metadata of the TOP match:")
if matches:
    top  = matches[0]
    meta = get_meta(top)
    for k, v in meta.items():
        vstr = str(v)
        if len(vstr) > 120:
            vstr = vstr[:117] + "..."
        print(f"    {k:<20}: {vstr}")


# ---------------------------------------------------------------------------
# SECTION 6 – Check how 'text' vectors store their page content
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("SECTION 6 — How 'text' key vectors store their page content")
print("=" * 70)

SAMPLE_HAS = 5
for vid in has_text[:SAMPLE_HAS]:
    meta = get_meta(all_vectors[vid])
    text_val = str(meta.get("text", ""))
    print(f"\n  ID    : {vid!r}")
    print(f"  text  : {text_val[:200]!r}")


# ---------------------------------------------------------------------------
# SECTION 7 – Summary & diagnosis
# ---------------------------------------------------------------------------
print()
print("=" * 70)
print("SECTION 7 — Diagnosis summary")
print("=" * 70)

pct_missing = 100 * len(missing_text) / max(len(all_vectors), 1)
print(f"""
  Total vectors      : {len(all_vectors)}
  Missing 'text' key : {len(missing_text)}  ({pct_missing:.1f}%)
  Has 'text' key     : {len(has_text)}

  ROOT CAUSE of "Found document with no `text` key. Skipping." warnings
  ─────────────────────────────────────────────────────────────────────
  PineconeVectorStore (langchain_pinecone) reconstructs a LangChain
  Document by reading the 'text' field from Pinecone metadata.
  Vectors stored via the .ipynb notebook used an older langchain_pinecone
  version (or stored without the 'text' key), so they are silently
  skipped during similarity_search() even though they may be the best
  semantic matches.

  IMPACT ON SIMILARITY SEARCH
  ────────────────────────────
  When k=65 is requested but {len(missing_text)} candidates are skipped,
  the effective result pool is severely reduced.  Perfume entries from
  the original knowledgebase that lack the 'text' key never appear,
  even if they are the closest semantic matches for a given query.

  NEXT STEPS (no destructive action — just re-upsert with text field)
  ───────────────────────────────────────────────────────────────────
  1. For each missing-text vector, rebuild the document with a 'text'
     field added to its existing metadata, e.g.:
         metadata['text'] = f"Item: {{desc}}\\nGoederen Omschrijving: {{gdesc}}\\n"
                            f"Goederen Code: {{code}}"
     then upsert using the SAME vector ID (overwrite, no delete needed).
  2. Re-run this audit to confirm 0 missing-text vectors remain.
""")
