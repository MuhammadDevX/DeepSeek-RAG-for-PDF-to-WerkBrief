import { generateObject } from 'ai'
import { deepseek } from '@/config/agents'
import { WerkbriefSchema } from './schema'
import { werkbriefSystemPrompt } from './prompt'
import { retrieveRelevantSnippets } from './tool-pinecone'

export async function generateWerkbrief(description: string) {
  const retrieved = await retrieveRelevantSnippets(description)

  const { object } = await generateObject({
    model: deepseek('deepseek-chat'),
    system: werkbriefSystemPrompt,
    prompt: `Generate a werkbrief for the following description. If helpful, here are retrieval snippets:\n${retrieved.map((r, i) => `(${i + 1}) ${r}`).join('\n')}`,
    schema: WerkbriefSchema,
  })

  return object
}


