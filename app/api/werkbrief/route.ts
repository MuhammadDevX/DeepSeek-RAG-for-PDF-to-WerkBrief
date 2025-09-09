import { NextRequest } from 'next/server'
import { generateWerkbrief } from '@/lib/ai/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const description: string = body?.description ?? ''
    if (!description) {
      return new Response(JSON.stringify({ error: 'description is required' }), { status: 400 })
    }

    const object = await generateWerkbrief(description)
    return new Response(JSON.stringify(object), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error?.message ?? 'unknown error' }), { status: 500 })
  }
}


