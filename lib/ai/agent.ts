import { generateObject } from 'ai'
import { openai } from '@/config/agents'
import { WerkbriefSchema } from './schema'
import { werkbriefSystemPrompt } from './prompt'
import { retrieveRelevantSnippets } from './tool-pinecone'
import { extractTextFromPDFBuffer } from '@/lib/extractFromPDF'

export async function generateWerkbrief(description: string, pdfBuffer?: Buffer) {
  const retrieved = await retrieveRelevantSnippets(description)

  let pdfContext = ''
  if (pdfBuffer) {
    try {
      // Server-side safe extraction from Buffer (no worker)
      const extractedText = await extractTextFromPDFBuffer(pdfBuffer)
      pdfContext = `\n\nInvoice/PDF Context (extracted text):\n${extractedText}`
    } catch (error) {
      console.warn('Failed to parse PDF:', error)
    }
  }
  console.log("PDF Context", pdfContext)
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: werkbriefSystemPrompt,
    prompt: `Generate a werkbrief for the following description:${pdfContext}\n. Here are the retrieval elements from DB:\n${retrieved.map((r, i) => `(${i + 1}) ${r}`).join('\n')}`,
    schema: WerkbriefSchema,
  })

  return object
}


