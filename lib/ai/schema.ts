import { z } from 'zod'

export const WerkbriefSchema = z.object({
  fields: z.array(z.object({
    "GOEDEREN OMSCHRIJVING": z.string({ description: "Description of the product goods in Dutch based from the snippets" }),
    "GOEDEREN CODE": z.string({ description: "Code for that product mentioned from the snippets" }),
    "CTNS": z.number({ description: "Cartons (number of cartons/packages for that product)." }),
    "STKS": z.number({ description: "Stuks = pieces (total units inside cartons)." }),
    "BRUTO": z.number({ description: "Bruto weight = gross weight (kg)." }),
    "FOB": z.number({ description: "Free on Board value = cost of goods at origin (without freight/insurance)." }),
    "AWB - 392754819969-1": z.string({ description: "Related to the Air Waybill (AWB) shipment number, sometimes filled with costs or notes." }).optional()
  }))
})


export const ProductsBoughtSchema = z.object({
  products: z.array(z.object({
    "desc": z.string({ description: "Name of the item bought" }),
    "bruto": z.string({ description: "Number of cartons for that product" }),
    "stks": z.string({ description: "Pieces (total units inside the carton)" }),
    "fob": z.string({ description: "cost of goods at origin (without insurance)" }),
    "awb": z.string({ description: "Air Waybill shipment number" })
  }))
})


export type Products = z.infer<typeof ProductsBoughtSchema>
export type Werkbrief = z.infer<typeof WerkbriefSchema>


