import { z } from "zod";

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
    })
  ),
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
