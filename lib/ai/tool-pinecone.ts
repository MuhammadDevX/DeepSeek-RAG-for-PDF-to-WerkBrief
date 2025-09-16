import { Pinecone } from '@pinecone-database/pinecone'
import { getEnvOrThrow } from '@/lib/utils'
import { embed } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

export async function retrieveRelevantSnippets(query: string): Promise<string[]> {
  const pc = new Pinecone({ apiKey: getEnvOrThrow('PINECONE_API_KEY') })
  const index = pc.Index(getEnvOrThrow('PINECONE_INDEX'))

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-ada-002'),
    value: "All of the products mentioned in this description:\n" + query,
  })

  const result = await index.query({
    vector: embedding,
    topK: 100,
    includeMetadata: true,
  })

  type Match = {
    metadata?: {
      text?: string
      code?: string | number
      desc?: string
      gdesc?: string
      category?: string
      [key: string]: unknown
    }
  }
  const matches = (result.matches ?? []) as unknown as Match[]
  const snippets = matches
    .map(m => {
      if (!m.metadata) return ''
      const lines: string[] = []
      if (m.metadata.desc) lines.push(`The Item: ${m.metadata.desc}`)
      if (m.metadata.gdesc) lines.push(`has Goederen Omschrijving: ${m.metadata.gdesc}`)
      if (m.metadata.code !== undefined) lines.push(`and GOEDEREN CODE: ${String(m.metadata.code)}`)
      // if (m.metadata.category) lines.push(`Category: ${m.metadata.category}`)
      // Include any generic text field last if present
      // if (m.metadata.text) lines.push(`Text: ${m.metadata.text}`)
      return lines.join('\n')
    })
    .filter(Boolean)
  return snippets
}


