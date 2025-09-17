import { generateObject } from 'ai'
import { openai } from '@/config/agents'
import { ProductsBoughtSchema, WerkbriefSchema } from './schema'
import { productsAnalyzerPrompt, werkbriefSystemPrompt } from './prompt'
import { retrieveRelevantSnippets } from './tool-pinecone'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'

export async function generateWerkbrief(description: string, pdfBuffer?: Buffer) {

  let pdfContext = ''
  if (pdfBuffer) {
    try {
      // Create a Blob for LangChain's PDFLoader and extract text
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const loader = new PDFLoader(blob)
      const docs = await loader.load()
      const extractedText = docs.map(d => d.pageContent).join('\n\n')
      pdfContext = `\n\nInvoice/PDF Context (extracted text):\n${extractedText}`
    } catch (error) {
      console.warn('Failed to parse PDF:', error)
    }
  }

  console.log("Length of context", pdfContext.length)

  const { object: store } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: productsAnalyzerPrompt,
    prompt: `${pdfContext}`,
    schema: ProductsBoughtSchema,
  })

  console.log(store)

  const retrieved = await retrieveRelevantSnippets(`The items bought are: ${store.products.map((p, i) => `${i}.${p.desc}`).join("\n")}`, store.products.length)

  const { object: werkBriefObj } = await generateObject({
    model: openai('gpt-4o-mini'),
    system: werkbriefSystemPrompt,
    prompt: `Generate a werkbrief for the following products:${store.products.map((p, i) => {
      return `${i}.${p.desc}, bruto:${p.bruto}, fob:${p.fob}, awb:${p.awb}, stks:${p.stks}`
    }).join("\n\n")}\n. Here are the relevant snippets:\n${retrieved.map((r, i) => `(${i + 1}) ${r}`).join('\n')}`,
    schema: WerkbriefSchema,
  })

  return werkBriefObj
}


