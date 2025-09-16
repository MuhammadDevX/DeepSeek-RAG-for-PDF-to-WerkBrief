import { generateObject } from 'ai'
import { openai } from '@/config/agents'
import { WerkbriefSchema } from './schema'
import { werkbriefSystemPrompt } from './prompt'
import { retrieveRelevantSnippets } from './tool-pinecone'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'

export async function generateWerkbrief(description: string, pdfBuffer?: Buffer) {
  const retrieved = await retrieveRelevantSnippets(description)

  let pdfContext = ''
  if (pdfBuffer) {
    try {
      // Create a Blob for LangChain's PDFLoader and extract text
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const loader = new PDFLoader(blob)
      const docs = await loader.load()
      const tempDocs = docs.slice(0, 1)
      const extractedText = tempDocs.map(d => d.pageContent).join('\n\n')
      console.log("Lenght of docs", tempDocs.length)
      pdfContext = `\n\nInvoice/PDF Context (extracted text):\n${extractedText}`
    } catch (error) {
      console.warn('Failed to parse PDF:', error)
    }
  }
  console.log("PDF Context", pdfContext)
  const { object } = await generateObject({
    model: openai('gpt-4o'),
    system: werkbriefSystemPrompt,
    prompt: `Generate a werkbrief for the following description:${pdfContext}\n. Here are the relevant snippets:\n${retrieved.map((r, i) => `(${i + 1}) ${r}`).join('\n')}`,
    schema: WerkbriefSchema,
  })

  return object
}


