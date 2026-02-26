# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with Turbopack
npm run build     # Production build with Turbopack
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test runner is configured in this project.

## Architecture Overview

This is an AI-powered invoice processing application. Users upload PDF invoices, an AI agent extracts and structures the data, and the result is exported as a styled Excel (werkbrief) file.

### Core Data Flow

```
PDF upload → S3/Spaces presigned URL → Server-side download
→ LangChain PDF loader → per-page extraction
→ OpenAI GPT-4 with Zod schema validation
→ Pinecone vector search (product knowledge base context)
→ Aggregated result → Excel export (XLSX with styling)
```

### Key Directories

- `app/api/` — API routes (werkbrief generation, Aruba processing, Pinecone KB management, file uploads, user admin)
- `app/werkbrief-generator/` — Main feature page (~41KB `page.tsx`) with `_components/` subdirectory containing table components and hooks
- `app/aruba-special/` — In-progress Aruba invoice feature (backend ~70% done, frontend ~30%)
- `app/admin/` — Admin panel with user management (ban/unban)
- `contexts/` — React Context for global state: `WerkbriefContext.tsx` (PDF state, results, undo stack, pagination) and `ArubaSpecialContext.tsx`
- `lib/ai/` — AI agents (`agent.ts`, `aruba-agent.ts`), Zod schemas (`schema.ts`), prompts (`prompt.ts`), Pinecone retrieval (`tool-pinecone.ts`)
- `lib/` — `excel-formatter.ts` (Excel export with styling), `aruba-pdf-parser.ts` (regex extraction), `spaces-utils.ts` (S3 ops)
- `config/agents.ts` — OpenAI/DeepSeek client initialization

### AI Agent Pattern

Both agents (`agent.ts`, `aruba-agent.ts`) share the same resilience patterns:
- Exponential backoff retry (1s → 2s → 4s up to 25s, max 5 retries)
- Batch processing: 15 items/batch, 1.5s delay between batches
- `Promise.allSettled()` for graceful partial failures
- Server-Sent Events stream progress back to the client (`{ type, totalDocuments, processedDocuments, totalProducts, processedProducts, currentStep }`)

### Werkbrief vs Aruba Differences

| | Werkbrief | Aruba Special |
|---|---|---|
| Input | Single PDF | Multiple PDFs |
| Extraction | LangChain page splitting + AI | Regex first, then AI for enrichment only |
| AI role | Full extraction | Fill GOEDEREN CODE + OMSCHRIJVING only |
| Excel | Single sheet | Multi-tab (one per client) + summary tab |
| Grouping | None | Grouped by PDF filename/client name |

### Authentication & Authorization

Clerk is used throughout. Roles are stored in `user.publicMetadata.role`:
- `admin` — full access including `/admin`, `/expand`, `/aruba-special`
- `operator` — access to `/aruba-special`
- Authenticated — access to `/werkbrief-generator`
- Public — `/` landing page only

Check `useIsAdmin` hook (`lib/hooks/useIsAdmin.ts`) for role checks in components.

### State Management

- **No external state library** — React Context only
- `WerkbriefContext.tsx` owns: PDF file, AI-extracted results, edit state, undo/deletion stack, clipboard, search/filter/sort, pagination
- Undo uses a deletion stack (array of removed rows) with notifications

### File Storage

PDFs are uploaded to DigitalOcean Spaces (S3-compatible) via presigned URLs generated at `/api/upload/presigned-url`. Files have a 7-day lifecycle policy. Server-side processing downloads from Spaces using `spaces-utils.ts`.

### Excel Export

`lib/excel-formatter.ts` handles all Excel output:
- `downloadWerkbriefExcelFile()` — single sheet with styled headers
- `downloadArubaExcelFile()` — multi-tab with summary
- `formatForClipboard()` / `formatArubaForClipboard()` — tab-separated for pasting

Key columns: GOEDEREN CODE, OMSCHRIJVING, GEWICHT (BRUTO/NETTO), vracht, insurance, onk, Faktor.

### Aruba Special — In Progress

See `ARUBA_SPECIAL_STATUS.md` for detailed remaining work. The critical missing pieces are:
1. `ArubaDataTable.tsx` with collapsible group headers (model after `app/werkbrief-generator/_components/DataTable.tsx`)
2. `useArubaBrutoManagement.ts` hook (model after `app/werkbrief-generator/_components/hooks/useBrutoManagement.ts`)
3. Multi-file upload UI component

### Configuration Notes

- `next.config.ts`: TypeScript and ESLint errors are **ignored during build** — do not rely on build failures to catch type errors
- `tsconfig.json`: `strict: false` — TypeScript is not strict
- Server Actions allow up to 200MB body size (large PDF support)
- `console.*` calls are stripped in production builds
