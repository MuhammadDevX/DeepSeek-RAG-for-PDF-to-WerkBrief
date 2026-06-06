---
name: pinecone-retrieval-paths
description: How the two Pinecone retrieval paths differ and why the "no text key" warning is harmless for production
metadata:
  type: project
---

The ship2aruba Pinecone index is read via TWO different paths that behave differently:

- **Production** (`agent.ts`, `aruba-agent.ts` → `retrieveRelevantSnippets` in `lib/ai/tool-pinecone.ts`, and `app/api/search-goederen/route.ts`) uses the **raw `index.query()`** SDK call. It reads `desc`/`gdesc`/`code` from metadata and does NOT read or skip on the `text` key.
- **The notebook** (`knowledgebase/createKnowledgebase.ipynb`) uses LangChain `PineconeVectorStore.similarity_search()`, which rebuilds a Document from the `text` metadata key and **silently skips any vector lacking it** ("Found document with no `text` key. Skipping.").

**Why:** ~532 legacy vectors from the original notebook were upserted without a `text` key (and with a literal `/n` embedding typo + different boilerplate than the newer `app/api/add-to-knowledgebase` format). They only get skipped by the notebook's similarity_search — production retrieves them fine.

**How to apply:** The "no text key" warning is a notebook-only artifact; it does NOT degrade agent predictions. To genuinely improve retrieval, fix the embedding inconsistency (`knowledgebase/fix_embeddings.py`, dry-run by default, `--apply` to write) and dedup snippets in `retrieveRelevantSnippets` (already added — keyed on `desc|gdesc|code`). Diagnostics live in `knowledgebase/audit.py` and `knowledgebase/compare_retrieval.py`. Canonical KB text format: `Item: {desc}\nGoederen Omschrijving: {gdesc}\nGoederen Code: {code}[\nCategory: {category}]`.
