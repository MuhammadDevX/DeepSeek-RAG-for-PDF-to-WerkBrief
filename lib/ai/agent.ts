import { generateObject } from 'ai'
import { openai } from '@/config/agents'
import { WerkbriefSchema } from './schema'
import { werkbriefSystemPrompt } from './prompt'
import { retrieveRelevantSnippets } from './tool-pinecone'
import { parsePDF } from '@/lib/pdf-parser'

export async function generateWerkbrief(description: string, pdfBuffer?: Buffer) {
  const retrieved = await retrieveRelevantSnippets(description)

  let pdfContext = ''
  if (pdfBuffer) {
    try {
      const parsedPDF = await parsePDF(pdfBuffer)
      pdfContext = `\n\nInvoice/PDF Context (extracted text):\n${parsedPDF.text}`
    } catch (error) {
      console.warn('Failed to parse PDF:', error)
    }
  }

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: werkbriefSystemPrompt,
    prompt: `Generate a werkbrief for the following description. If helpful, here are retrieval snippets:\n${retrieved.map((r, i) => `(${i + 1}) ${r}`).join('\n')}${pdfContext}`,
    schema: WerkbriefSchema,
  })

  return object
}


