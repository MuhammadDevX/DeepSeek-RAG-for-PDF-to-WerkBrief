// // Next.js PDF API Route - Solution 2
// // This solution handles file uploads and parsing in API routes

// import { NextRequest, NextResponse } from 'next/server'
// import { Buffer } from 'buffer'

// export interface ParsedPDF {
//   text: string
//   pages: number
//   info?: Record<string, unknown>
//   metadata?: Record<string, unknown>
// }

// // This function safely checks if text has content
// const isNonEmpty = (text: string | undefined | null): boolean => {
//   return typeof text === 'string' && text.trim().length > 0
// }

// // Enhanced PDF parsing function for Next.js environment
// async function parsePDFInNextJS(buffer: Buffer): Promise<ParsedPDF> {
//   const errors: string[] = []

//   // Strategy A: pdf-parse with Next.js optimizations
//   try {
//     const pdf = await import('pdf-parse')

//     // We use specific options for Next.js environment
//     const data = await pdf.default(buffer, {
//       max: 0, // No page limit
//       // This helps with Next.js compatibility
//       version: 'v2.0.550'
//     })

//     if (data && isNonEmpty(data.text)) {
//       return {
//         text: data.text.trim(),
//         pages: data.numpages || 0,
//         info: data.info as Record<string, unknown>,
//         metadata: data.metadata as Record<string, unknown>
//       }
//     }
//   } catch (err) {
//     errors.push(`pdf-parse: ${err instanceof Error ? err.message : String(err)}`)
//   }

//   // Strategy B: pdfjs-dist configured for Next.js API routes
//   try {
//     // We import the specific Next.js compatible version
//     const pdfjs = await import('pdfjs-dist')
//     if (typeof window === 'undefined') {
//       // This disables worker in Node.js to prevent module resolution issues
//       pdfjs.GlobalWorkerOptions.workerSrc = ''
//     }

//     const loadingTask = pdfjs.getDocument({
//       data: new Uint8Array(buffer),
//       // This prevents eval usage which can cause security issues
//       isEvalSupported: false,
//       // This prevents font loading which can fail in Node.js
//       disableFontFace: true,
//       // This reduces console output
//       verbosity: 0,
//       // These options improve compatibility
//       disableRange: true,
//       disableStream: true,
//       disableAutoFetch: true
//     })

//     const doc = await loadingTask.promise
//     let fullText = ''

//     for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
//       try {
//         const page = await doc.getPage(pageNum)
//         const textContent = await page.getTextContent()

//         const pageText = textContent.items
//           .map((item: any) => item?.str || '')
//           .filter(text => text.trim().length > 0)
//           .join(' ')

//         if (pageText) {
//           fullText += pageText + '\n'
//         }
//       } catch (pageError) {
//         console.warn(`Page ${pageNum} processing failed:`, pageError)
//       }
//     }

//     if (isNonEmpty(fullText)) {
//       return {
//         text: fullText.trim(),
//         pages: doc.numPages,
//         info: undefined,
//         metadata: undefined
//       }
//     }
//   } catch (err) {
//     errors.push(`pdfjs-dist: ${err instanceof Error ? err.message : String(err)}`)
//   }

//   throw new Error(`PDF parsing failed: ${errors.join(' | ')}`)
// }

// // API route handler for PDF upload and parsing
// export async function POST(request: NextRequest) {
//   try {
//     // We get the content type to handle different upload methods
//     const contentType = request.headers.get('content-type') || ''

//     let buffer: Buffer

//     if (contentType.includes('multipart/form-data')) {
//       // This handles file uploads via FormData
//       const formData = await request.formData()
//       const file = formData.get('pdf') as File

//       if (!file) {
//         return NextResponse.json(
//           { error: 'No PDF file provided' },
//           { status: 400 }
//         )
//       }

//       // We validate file type
//       if (!file.type.includes('pdf')) {
//         return NextResponse.json(
//           { error: 'File must be a PDF' },
//           { status: 400 }
//         )
//       }

//       // We convert file to buffer
//       const arrayBuffer = await file.arrayBuffer()
//       buffer = Buffer.from(arrayBuffer)

//     } else if (contentType.includes('application/json')) {
//       // This handles base64 encoded PDF data
//       const body = await request.json()

//       if (!body.pdf) {
//         return NextResponse.json(
//           { error: 'No PDF data provided' },
//           { status: 400 }
//         )
//       }

//       // We decode base64 PDF data
//       try {
//         buffer = Buffer.from(body.pdf, 'base64')
//       } catch (decodeError) {
//         return NextResponse.json(
//           { error: 'Invalid base64 PDF data' },
//           { status: 400 }
//         )
//       }

//     } else {
//       // This handles direct binary upload
//       const arrayBuffer = await request.arrayBuffer()
//       buffer = Buffer.from(arrayBuffer)
//     }

//     // We validate buffer size (prevent memory issues)
//     const maxSize = 10 * 1024 * 1024 // 10MB limit
//     if (buffer.length > maxSize) {
//       return NextResponse.json(
//         { error: 'PDF file too large (max 10MB)' },
//         { status: 400 }
//       )
//     }

//     // We validate PDF signature
//     const pdfSignature = buffer.subarray(0, 4).toString()
//     if (!pdfSignature.includes('%PDF')) {
//       return NextResponse.json(
//         { error: 'Invalid PDF file' },
//         { status: 400 }
//       )
//     }

//     // We parse the PDF
//     const parsedPDF = await parsePDFInNextJS(buffer)

//     return NextResponse.json({
//       success: true,
//       data: {
//         text: parsedPDF.text,
//         pages: parsedPDF.pages,
//         wordCount: parsedPDF.text.split(/\s+/).length,
//         characterCount: parsedPDF.text.length
//       }
//     })

//   } catch (error) {
//     console.error('PDF parsing error:', error)

//     return NextResponse.json(
//       {
//         error: 'Failed to parse PDF',
//         details: error instanceof Error ? error.message : String(error)
//       },
//       { status: 500 }
//     )
//   }
// }

// // GET handler for health check
// export async function GET() {
//   return NextResponse.json({
//     message: 'PDF parsing API is running',
//     timestamp: new Date().toISOString()
//   })
// }

// // This is a utility function for client-side PDF upload
// export function createPDFUploadClient() {
//   return {
//     // This uploads a file directly
//     uploadFile: async (file: File): Promise<ParsedPDF> => {
//       const formData = new FormData()
//       formData.append('pdf', file)

//       const response = await fetch('/api/pdf-parse', {
//         method: 'POST',
//         body: formData
//       })

//       if (!response.ok) {
//         const error = await response.json()
//         throw new Error(error.details || 'Upload failed')
//       }

//       const result = await response.json()
//       return result.data
//     },

//     // This uploads base64 encoded PDF
//     uploadBase64: async (base64Data: string): Promise<ParsedPDF> => {
//       const response = await fetch('/api/pdf-parse', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ pdf: base64Data })
//       })

//       if (!response.ok) {
//         const error = await response.json()
//         throw new Error(error.details || 'Upload failed')
//       }

//       const result = await response.json()
//       return result.data
//     }
//   }
// }