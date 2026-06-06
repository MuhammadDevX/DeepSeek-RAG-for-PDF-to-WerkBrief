import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@/config/agents";
import { findDefaultCodeCandidates, getDefaultCodeById } from "./default-codes";

/**
 * The "library" agent — an independent prediction of the GOEDEREN CODE /
 * OMSCHRIJVING sourced ONLY from the fixed Notes.txt default-code table.
 *
 * Pipeline: a deterministic regex search (`findDefaultCodeCandidates`) acts as
 * the agent's search tool and returns the matching library categories; the agent
 * then selects the single best fit. Because this side never looks at the
 * Pinecone history, comparing it against the history ("AI") agent is a genuine
 * cross-check: when they disagree, the history code is likely wrong and should
 * be corrected / added to the knowledge base.
 *
 * Cost note: the LLM only runs when the search is ambiguous (2+ candidates).
 * With 0 candidates it returns null, and with exactly 1 it returns that match
 * directly — no LLM call in those cases.
 */
const LibraryPickSchema = z.object({
  categoryId: z.string({
    description:
      "The id of the single best-matching candidate for this product, or the exact string NONE if none of the candidates genuinely fit. Only use ids from the provided list.",
  }),
});

export async function classifyWithLibraryAgent(
  description: string
): Promise<{ code: string; omschrijving: string; category: string } | null> {
  const candidates = findDefaultCodeCandidates(description);

  if (candidates.length === 0) return null;

  // Only one possible category — nothing to disambiguate, skip the LLM.
  if (candidates.length === 1) {
    const e = candidates[0];
    return { code: e.code, omschrijving: e.omschrijving, category: e.id };
  }

  const list = candidates
    .map((c) => `- ${c.id}: ${c.label} (${c.omschrijving}) [${c.code}]`)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: openai("gpt-5-mini"),
      schema: LibraryPickSchema,
      system:
        "You select the single best customs category for a product from a FIXED candidate list. Only return an id that appears in the list, or NONE if none of them genuinely fit the product.",
      prompt: `Product: ${description}\n\nCandidates (id: label (omschrijving) [code]):\n${list}\n\nReturn the best categoryId, or NONE.`,
    });

    const id = (object.categoryId || "").trim();
    if (!id || id.toUpperCase() === "NONE") return null;

    const entry = getDefaultCodeById(id);
    if (!entry) return null;
    return {
      code: entry.code,
      omschrijving: entry.omschrijving,
      category: entry.id,
    };
  } catch (error) {
    console.error("Library agent failed:", error);
    // Fall back to the most-specific regex match so we still have a library ref.
    const e = candidates[0];
    return { code: e.code, omschrijving: e.omschrijving, category: e.id };
  }
}
