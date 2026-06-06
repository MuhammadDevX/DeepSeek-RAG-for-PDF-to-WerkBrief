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
      needsIVA: z.boolean({
        description:
          "True if this product requires IVA inspection (e.g. anything containing HEMP or MINOXIDIL, microneedling for face, tattoo needles, water/nitrite test kits). Plain skincare serums do NOT need IVA.",
      }),
      needsDTZ: z.boolean({
        description:
          "True if this product requires DTZ (e.g. car alarm/keyless systems, smart body scales, cordless/stick vacuum cleaners, marine/car radios, wireless printers, voice recorders). Headphones/headsets/earphones do NOT need DTZ.",
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
      // --- Dual code source (library default vs AI prediction) ---
      defaultCode: z
        .string()
        .optional()
        .describe("Library default GOEDEREN CODE from the Notes.txt category table"),
      defaultOmschrijving: z
        .string()
        .optional()
        .describe("Library default GOEDEREN OMSCHRIJVING from the Notes.txt category table"),
      codeSource: z
        .enum(["ai", "library"])
        .optional()
        .describe("Which source is active for export: 'ai' (Pinecone-predicted) or 'library' (default-code table)"),
      // --- Classification flags ---
      needsIVA: z.boolean().optional().describe("Whether this product requires IVA"),
      needsDTZ: z.boolean().optional().describe("Whether this product requires DTZ"),
      // --- Client / consignee (used for de-duplication & merging) ---
      clientName: z
        .string()
        .optional()
        .describe("Predicted consignee/client this product belongs to"),
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
    .describe(
      "Total number of pages in the PDF document. Calculated by agent, not AI model."
    ),
});

export const ProductsBoughtSchema = z.object({
  products: z.array(
    z.object({
      desc: z.string({ description: "Name of the item bought" }),
      clientName: z.string({
        description:
          "Name of the consignee / ship-to client this product belongs to (from the CONSIGNEE / Ship To / Bill To section on the page). Use the same exact name for every product in the same order. Use an empty string if no client can be determined.",
      }),
      bruto: z.number({
        description: "Bruto weight = gross weight in kilograms (kg).",
      }),
      stks: z.number({ description: "Pieces (total units inside the carton)" }),
      ctns: z.number({
        description: "Cartons (number of cartons/packages for that product).",
      }),
      fob: z.number({
        description: "final cost of goods",
      }),
    })
  ),
});

export type Products = z.infer<typeof ProductsBoughtSchema>;
export type Werkbrief = z.infer<typeof WerkbriefSchema>;

// Schema for Aruba Special - AI only fills in GOEDEREN CODE and OMSCHRIJVING
export const ArubaProductFieldsSchema = z.object({
  fields: z.array(
    z.object({
      "GOEDEREN OMSCHRIJVING": z.string({
        description:
          "Description of the product goods in Dutch based from the snippets",
      }),
      "GOEDEREN CODE": z.string({
        description: "Code for that product mentioned from the snippets",
      }),
      Confidence: z.string({
        description:
          "Confidence score for the correct GOEDEREN CODE and GOEDEREN OMSCHRIJVING in %",
      }),
      needsIVA: z.boolean({
        description:
          "True if this product requires IVA inspection (e.g. anything containing HEMP or MINOXIDIL, microneedling for face, tattoo needles, water/nitrite test kits). Plain skincare serums do NOT need IVA.",
      }),
      needsDTZ: z.boolean({
        description:
          "True if this product requires DTZ (e.g. car alarm/keyless systems, smart body scales, cordless/stick vacuum cleaners, marine/car radios, wireless printers, voice recorders). Headphones/headsets/earphones do NOT need DTZ.",
      }),
    })
  ),
});

// Complete Aruba Special schema with extracted data from regex + AI enrichment
export const ArubaSpecialSchema = z.object({
  groups: z.array(
    z.object({
      clientName: z.string({
        description: "Name of the client (PDF filename without extension)",
      }),
      consigneeName: z
        .string()
        .optional()
        .describe("Name of the consignee extracted from the PDF"),
      freightCharge: z
        .number()
        .optional()
        .describe("Freight charge value extracted from the PDF"),
      fields: z.array(
        z.object({
          "Item Description": z.string({
            description: "Description of the item from PDF",
          }),
          "GOEDEREN OMSCHRIJVING": z.string({
            description:
              "Description of the product goods in Dutch based from the snippets",
          }),
          "GOEDEREN CODE": z.string({
            description: "Code for that product mentioned from the snippets",
          }),
          CTNS: z.number({
            description:
              "Cartons (number of cartons/packages for that product).",
          }),
          STKS: z.number({
            description: "Stuks = pieces (total units inside cartons).",
          }),
          BRUTO: z.number({
            description: "Bruto weight = gross weight (kg).",
          }),
          FOB: z.number({
            description:
              "Free on Board value = cost of goods at origin (without freight/insurance).",
          }),
          Confidence: z.string({
            description:
              "Confidence score for the correct GOEDEREN CODE and GOEDEREN OMSCHRIJVING in %",
          }),
          // --- Dual code source (library default vs AI prediction) ---
          defaultCode: z
            .string()
            .optional()
            .describe("Library default GOEDEREN CODE from the Notes.txt category table"),
          defaultOmschrijving: z
            .string()
            .optional()
            .describe("Library default GOEDEREN OMSCHRIJVING from the Notes.txt category table"),
          codeSource: z
            .enum(["ai", "library"])
            .optional()
            .describe("Which source is active for export: 'ai' or 'library'"),
          // --- Classification flags ---
          needsIVA: z.boolean().optional().describe("Whether this product requires IVA"),
          needsDTZ: z.boolean().optional().describe("Whether this product requires DTZ"),
          "Page Number": z.number({
            description:
              "Page number from the PDF where this product was found",
          }),
        })
      ),
    })
  ),
  totalGroups: z.number({
    description: "Total number of client groups (PDFs processed)",
  }),
});

export type ArubaSpecial = z.infer<typeof ArubaSpecialSchema>;
