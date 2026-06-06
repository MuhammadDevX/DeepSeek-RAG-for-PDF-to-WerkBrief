"""
compare_retrieval.py — Read-only A/B comparison of the two retrieval paths
against the SAME query and the SAME index, so you can see whether the
"no text key" skipping actually changes what gets retrieved.

  PATH A  index.query()                — what PRODUCTION uses
          (lib/ai/tool-pinecone.ts -> retrieveRelevantSnippets)
          Raw Pinecone SDK. Reads desc/gdesc/code from metadata.
          Does NOT require or skip on the 'text' key.

  PATH B  PineconeVectorStore.similarity_search()  — what the NOTEBOOK uses
          (createKnowledgebase.ipynb)
          LangChain wrapper. Rebuilds a Document from the 'text' key and
          SKIPS any vector that lacks it ("Found document with no `text`
          key. Skipping.").

The script reports, for one query:
  - how many hits each path returns
  - which IDs path A returns that path B dropped (the skipped ones)
  - whether those dropped IDs are the .ipynb-sourced vectors

Nothing here writes, updates, or deletes any Pinecone record. Fetch only.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")
INDEX_NAME       = os.getenv("PINECONE_INDEX", "ship2aruba")

# Production embeds with text-embedding-ada-002 (see tool-pinecone.ts).
EMBED_MODEL = "text-embedding-ada-002"

# Same k for both paths so the comparison is fair.
TOP_K = 65

QUERY = (
    "Miss Kay Eau de Parfum - Your Vibe Your Scent Fragrance Collection - "
    "First Love,Soft Cuddle & Queen of Hearts in 25ml Travel Friendly Spray Bottles"
)

# Production prepends this string before embedding (tool-pinecone.ts:19).
# Set to True to mirror production exactly; False to embed the raw query.
MIRROR_PRODUCTION_PREFIX = True
PRODUCTION_PREFIX = "All of the products mentioned in this description:\n"

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


def get_meta(obj) -> dict:
    """Metadata as a plain dict regardless of SDK response type."""
    raw = getattr(obj, "metadata", None)
    if raw is None and isinstance(obj, dict):
        raw = obj.get("metadata")
    return dict(raw) if raw else {}


def get_attr(obj, attr, default=None):
    if hasattr(obj, attr):
        return getattr(obj, attr)
    if isinstance(obj, dict):
        return obj.get(attr, default)
    return default


# ===========================================================================
# PATH A — index.query()  (production path)
# ===========================================================================
print("=" * 74)
print("PATH A — index.query()   [ what production agents use ]")
print("=" * 74)

embed_input = (PRODUCTION_PREFIX + QUERY) if MIRROR_PRODUCTION_PREFIX else QUERY
embed_resp  = openai.embeddings.create(input=embed_input, model=EMBED_MODEL)
query_vec   = embed_resp.data[0].embedding

raw = index.query(vector=query_vec, top_k=TOP_K, include_metadata=True)
raw_matches = getattr(raw, "matches", None) or []

# Build an ordered record of path-A hits keyed by id.
path_a = []   # list of (id, score, source, has_text, desc)
for m in raw_matches:
    meta = get_meta(m)
    path_a.append({
        "id":       get_attr(m, "id", ""),
        "score":    get_attr(m, "score", 0.0),
        "source":   meta.get("source", "<none>"),
        "has_text": "text" in meta,
        "desc":     meta.get("desc", ""),
    })

print(f"  Returned: {len(path_a)} hits (requested top_k={TOP_K})")
a_with_text    = sum(1 for r in path_a if r["has_text"])
a_without_text = len(path_a) - a_with_text
print(f"    of which WITH    'text' key: {a_with_text}")
print(f"    of which MISSING 'text' key: {a_without_text}")


# ===========================================================================
# PATH B — PineconeVectorStore.similarity_search()  (notebook path)
# ===========================================================================
print()
print("=" * 74)
print("PATH B — similarity_search()   [ what the notebook uses ]")
print("=" * 74)

# Use the same LangChain stack the notebook uses so we reproduce the skip.
try:
    from langchain_openai import OpenAIEmbeddings
except ImportError:
    from langchain.embeddings.openai import OpenAIEmbeddings  # notebook's import
from langchain_pinecone import PineconeVectorStore

lc_embeddings  = OpenAIEmbeddings(api_key=OPENAI_API_KEY, model=EMBED_MODEL)
vector_store   = PineconeVectorStore(index=index, embedding=lc_embeddings)

# NOTE: similarity_search embeds the RAW query (no production prefix), exactly
# like the notebook does. That alone is one behavioural difference.
print("  (watch for 'Found document with no `text` key. Skipping.' below)\n")
lc_docs = vector_store.similarity_search(query=QUERY, k=TOP_K)

path_b_ids = set()
path_b = []
for d in lc_docs:
    did = getattr(d, "id", None) or d.metadata.get("desc", "")
    path_b_ids.add(did)
    path_b.append({
        "id":     did,
        "source": d.metadata.get("source", "<none>"),
        "desc":   d.metadata.get("desc", ""),
    })

print(f"\n  Returned: {len(path_b)} hits (requested k={TOP_K})")
print(f"  → similarity_search silently dropped {TOP_K - len(path_b)} "
      f"candidate(s) that lacked a 'text' key.")


# ===========================================================================
# DIFF — what PATH A returned that PATH B dropped
# ===========================================================================
print()
print("=" * 74)
print("DIFF — hits PRODUCTION (A) keeps but the NOTEBOOK (B) drops")
print("=" * 74)

path_a_ids = {r["id"] for r in path_a}
only_in_a  = [r for r in path_a if r["id"] not in path_b_ids]
only_in_b  = [r for r in path_b if r["id"] not in path_a_ids]

print(f"\n  In A but NOT in B : {len(only_in_a)}")
print(f"  In B but NOT in A : {len(only_in_b)}")

if only_in_a:
    print("\n  Dropped-by-notebook hits (these DO reach the production agents):")
    print(f"  {'Score':>7}  {'text?':<6}  {'source':<14}  desc")
    print("  " + "-" * 70)
    # Sort by score desc so you see the most relevant dropped items first.
    for r in sorted(only_in_a, key=lambda x: x["score"], reverse=True)[:30]:
        has_t = "YES" if r["has_text"] else "NO "
        desc  = r["desc"] if len(r["desc"]) <= 38 else r["desc"][:35] + "..."
        print(f"  {r['score']:>7.4f}  {has_t:<6}  {r['source']:<14}  {desc}")
    if len(only_in_a) > 30:
        print(f"  ... and {len(only_in_a) - 30} more.")

# Source breakdown of the dropped hits — proves WHICH upload path is affected.
from collections import Counter
dropped_by_source = Counter(r["source"] for r in only_in_a)
print("\n  Source of the dropped hits:")
for src, cnt in dropped_by_source.most_common():
    print(f"    source={src!r:<20} → {cnt}")


# ===========================================================================
# VERDICT
# ===========================================================================
print()
print("=" * 74)
print("VERDICT")
print("=" * 74)

if a_without_text == 0:
    print("""
  For THIS query, every path-A hit already has a 'text' key, so the two
  paths would return the same pool. (Try a query that hits .ipynb-sourced
  vectors to see the divergence.)
""")
else:
    print(f"""
  Path A (production index.query) returned {len(path_a)} hits.
  Path B (notebook similarity_search) returned only {len(path_b)} —
  it dropped {len(only_in_a)} hit(s), {a_without_text} of them solely
  because they lack a 'text' metadata key.

  KEY POINT
  ─────────
  The dropped hits ARE still delivered to your production agents, because
  retrieveRelevantSnippets() reads desc/gdesc/code via the raw index.query
  path and never looks at 'text'. So:

    • The "no text key. Skipping." problem is a NOTEBOOK-ONLY artifact.
    • Adding a 'text' key changes Path B's display, NOT agent predictions.
    • What changes agent ranking is the EMBEDDING content (the '/n' typo
      vectors) and snippet de-duplication — the improvements queued next.
""")
