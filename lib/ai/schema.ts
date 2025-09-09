import { z } from 'zod'

export const WerkbriefSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  salaryRange: z.object({ min: z.number(), max: z.number(), currency: z.string().default('EUR') }),
  benefits: z.array(z.string()).optional(),
})

export type Werkbrief = z.infer<typeof WerkbriefSchema>


