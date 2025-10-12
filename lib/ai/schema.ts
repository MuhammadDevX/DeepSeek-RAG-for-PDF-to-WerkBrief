import { z } from "zod";

// Schema for individual product fields (used by AI model per page)
// Model extracts ONLY what's visible in the PDF content
export const ProductFieldsSchema = z.object({
  fields: z.array(
    z.object({
      "Item Description": z.string({ description: "Description of the item" }),
      "GOEDEREN OMSCHRIJVING": z.string({
        description:
          "Description of the product goods in Dutch based from the snippets",
      }),
      "GOEDEREN CODE": z.string({
        description: "Code for that product mentioned from the snippets",
      }),
      CTNS: z.number({
        description: "Cartons (number of cartons/packages for that product).",
      }),
      STKS: z.number({
        description: "Stuks = pieces (total units inside cartons).",
      }),
      BRUTO: z.number({ description: "Bruto weight = gross weight (kg)." }),
      FOB: z.number({
        description:
          "Free on Board value = cost of goods at origin (without freight/insurance).",
      }),
      Confidence: z.string({
        description:
          "Confidence score for the correct GOEDEREN CODE and GOEDEREN OMSCHRIJVING in %",
      }),
      // Note: Page Number is NOT here - model doesn't extract it from content
      // It's assigned by the agent based on PDF structure
    })
  ),
});

// Complete Werkbrief schema with agent-calculated metadata
export const WerkbriefSchema = z.object({
  fields: z.array(
    z.object({
      "Item Description": z.string({ description: "Description of the item" }),
      "GOEDEREN OMSCHRIJVING": z.string({
        description:
          "Description of the product goods in Dutch based from the snippets",
      }),
      "GOEDEREN CODE": z.string({
        description: "Code for that product mentioned from the snippets",
      }),
      CTNS: z.number({
        description: "Cartons (number of cartons/packages for that product).",
      }),
      STKS: z.number({
        description: "Stuks = pieces (total units inside cartons).",
      }),
      BRUTO: z.number({ description: "Bruto weight = gross weight (kg)." }),
      FOB: z.number({
        description:
          "Free on Board value = cost of goods at origin (without freight/insurance).",
      }),
      Confidence: z.string({
        description:
          "Confidence score for the correct GOEDEREN CODE and GOEDEREN OMSCHRIJVING in %",
      }),
      "Page Number": z.number({
        description: "Page number from the PDF where this product was found",
      }),
    })
  ),
  missingPages: z
    .array(z.number())
    .describe(
      "Page numbers that could not be processed due to extraction issues. Empty array if all pages processed successfully. Calculated by agent, not AI model."
    ),
  totalPages: z
    .number()
    .describe("Total number of pages in the PDF document. Calculated by agent, not AI model."),
});

export const ProductsBoughtSchema = z.object({
  products: z.array(
    z.object({
      desc: z.string({ description: "Name of the item bought" }),
      bruto: z.string({ description: "Number of cartons for that product" }),
      stks: z.string({ description: "Pieces (total units inside the carton)" }),
      ctns: z.number({
        description: "Cartons (number of cartons/packages for that product).",
      }),
      fob: z.string({
        description: "final cost of goods",
      }),
    })
  ),
});

export type Products = z.infer<typeof ProductsBoughtSchema>;
export type Werkbrief = z.infer<typeof WerkbriefSchema>;
