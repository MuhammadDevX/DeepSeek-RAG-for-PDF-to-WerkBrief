import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
import { generateWerkbrief } from '@/lib/ai/agent'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const description = formData.get('description') as string
    const pdfFile = formData.get('pdf') as File | null

    if (!description) {
      return new Response(JSON.stringify({ error: 'description is required' }), { status: 400 })
    }

    let pdfBuffer: Buffer | undefined
    if (pdfFile && pdfFile.size > 0) {
      const arrayBuffer = await pdfFile.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)
    }

    const object = await generateWerkbrief(description, pdfBuffer)
    return new Response(JSON.stringify(object), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error: unknown) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : 'unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
}


