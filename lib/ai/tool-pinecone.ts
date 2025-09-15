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
    value: query,
  })

  const result = await index.query({
    vector: embedding,
    topK: 200,
    includeMetadata: true,
  })

  type Match = {
    metadata?: {
      text?: string
      code?: string | number
      desc?: string
      gdesc?: string
      [key: string]: unknown
    }
  }
  const matches = (result.matches ?? []) as unknown as Match[]
  const snippets = matches
    .map(m => {
      if (!m.metadata) return ''
      const parts = [
        m.metadata.text,
        m.metadata.desc,
        m.metadata.gdesc,
        m.metadata.code
      ].filter(Boolean)
      return parts.join(' ')
    })
    .filter(Boolean)
  return snippets
}


