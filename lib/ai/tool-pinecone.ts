import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvOrThrow } from "@/lib/utils";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const PINECONE_THRESHOLD_VECTORS = 20;
// Minimum cosine relevance for a match to be fed to the matching LLM.
// Weak matches (well below this) mislead the model toward wrong codes; when
// nothing clears the floor the model receives no snippets and falls back to
// the "00000000 / ONBEKEND" default instead of guessing. Tune as needed.
const MIN_RELEVANCE_SCORE = 0.75;

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

// Internal retry for transient embedding / Pinecone query failures so a single
// flaky request does not lose a product's snippets. Independent of any outer
// per-product retry in the agents.
async function withPineconeRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
  initialDelay = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      const delay = Math.min(initialDelay * Math.pow(2, attempt), 8000);
      console.warn(
        `Pinecone retrieval attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
        error instanceof Error ? error.message : String(error)
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export async function retrieveRelevantSnippets(
  query: string,
  topK: number
): Promise<string[]> {
  const pc = new Pinecone({ apiKey: getEnvOrThrow("PINECONE_API_KEY") });
  const index = pc.Index(getEnvOrThrow("PINECONE_INDEX"));

  const result = await withPineconeRetry(async () => {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: "All of the products mentioned in this description:\n" + query,
    });

    return index.query({
      vector: embedding,
      topK: topK + PINECONE_THRESHOLD_VECTORS,
      includeMetadata: true,
    });
  });

  type Match = {
    score?: number;
    metadata?: {
      text?: string;
      code?: string | number;
      desc?: string;
      gdesc?: string;
      category?: string;
      needsIVA?: boolean | string | number;
      needsDTZ?: boolean | string | number;
      [key: string]: unknown;
    };
  };

  // Interpret a stored flag (boolean / "true" / 1 / "yes" / "ja") as truthy.
  const truthy = (v: boolean | string | number): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    return ["true", "yes", "1", "ja", "y"].includes(v.trim().toLowerCase());
  };
  const matches = (result.matches ?? []) as unknown as Match[];
  // Drop exact duplicate products (same desc+gdesc+code) that appear from
  // multiple upload sources, keeping the first/highest-scoring occurrence.
  // Entries sharing a desc but with a different code are kept on purpose.
  const seen = new Set<string>();
  const snippets = matches
    // Relevance floor: ignore weak matches that would only mislead the model.
    .filter((m) => (m.score ?? 0) >= MIN_RELEVANCE_SCORE)
    .filter((m) => {
      if (!m.metadata) return false;
      // Include the IVA/DTZ flags in the dedup key so two records that share
      // desc+gdesc+code but carry DIFFERENT Needs IVA / Needs DTZ values are
      // kept as separate snippets (absent flags collapse to "").
      const flag = (v: boolean | string | number | undefined): string =>
        v === undefined || v === null || v === "" ? "" : truthy(v) ? "1" : "0";
      const key = `${m.metadata.desc ?? ""}|${m.metadata.gdesc ?? ""}|${String(
        m.metadata.code ?? ""
      )}|${flag(m.metadata.needsIVA)}|${flag(
        m.metadata.needsDTZ
      )}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((m) => {
      if (!m.metadata) return "";
      const lines: string[] = [];
      if (m.metadata.desc) lines.push(`The Item: ${m.metadata.desc}`);
      if (m.metadata.gdesc)
        lines.push(`has Goederen Omschrijving: ${m.metadata.gdesc}`);
      if (m.metadata.code !== undefined)
        lines.push(`and GOEDEREN CODE: ${String(m.metadata.code)}`);
      // Surface stored IVA/DTZ flags when present so the agent can reuse them
      // instead of re-deriving from the rules.
      if (
        m.metadata.needsIVA !== undefined &&
        m.metadata.needsIVA !== null &&
        m.metadata.needsIVA !== ""
      )
        lines.push(`Needs IVA: ${truthy(m.metadata.needsIVA) ? "Yes" : "No"}`);
      if (
        m.metadata.needsDTZ !== undefined &&
        m.metadata.needsDTZ !== null &&
        m.metadata.needsDTZ !== ""
      )
        lines.push(`Needs DTZ: ${truthy(m.metadata.needsDTZ) ? "Yes" : "No"}`);
      if (m.score !== undefined) lines.push(`Confidence Score: ${m.score}`);
      // if (m.metadata.category) lines.push(`Category: ${m.metadata.category}`)
      // Include any generic text field last if present
      // if (m.metadata.text) lines.push(`Text: ${m.metadata.text}`)
      return lines.join("\n");
    })
    .filter(Boolean);
  return snippets;
}
