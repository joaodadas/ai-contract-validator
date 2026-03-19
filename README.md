# Lyx Contract Intelligence

**AI-powered contract validation platform built for a real estate construction company.** This system replaces a manual n8n workflow with a multi-agent AI architecture that automatically analyzes, cross-validates, and approves real estate contracts — reducing human review time from hours to seconds.

> Built as a production system for [Lyx Engenharia](https://lyxengenharia.com.br), a Brazilian construction company, to automate their contract validation pipeline across 14 document types.

---

## The Problem

When a property is sold, the construction company receives 10–15 documents: contracts, financial summaries, identity documents, proof of residence, employment records, and more. A human analyst must cross-reference all documents to check for inconsistencies — matching names, CPF numbers, financial values, property details, and legal requirements.

This process is slow, error-prone, and doesn't scale.

## The Solution

A **multi-agent AI system** where each agent is a specialist in extracting structured data from a specific document type. After extraction, deterministic validators and a cross-validation AI agent compare all data points and produce a detailed divergence report — all in under 60 seconds.

---

## Architecture

```
                    CV CRM Webhook
                         │
                         ▼
              ┌─────────────────────┐
              │   Webhook Receiver  │
              │  POST /api/automacao│
              └────────┬────────────┘
                       │
              ┌────────▼────────────┐
              │  Reservation Service │
              │  Fetch + Persist     │
              └────────┬────────────┘
                       │
         ┌─────────────▼──────────────┐
         │    Document Completeness   │
         │    Check (9 required       │
         │    document groups)        │
         └─────────────┬──────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │       Phase 1: Parallel Extraction  │
    │                                     │
    │  13 AI agents run simultaneously    │
    │  Each extracts structured data      │
    │  from its document type             │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │   Phase 2: Deterministic Validators │
    │                                     │
    │  • Financial Comparison             │
    │    (Fluxo vs Quadro Resumo)         │
    │  • Planta Validation                │
    │    (Unit/Block matching)            │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │   Phase 3: AI Cross-Validation      │
    │                                     │
    │  Validation Agent receives all      │
    │  extracted data + deterministic     │
    │  results and produces a structured  │
    │  report with Igual/Divergente/      │
    │  Ignorado status per field          │
    └──────────────────┬──────────────────┘
                       │
              ┌────────▼────────────┐
              │  Report Generation  │
              │  + CV CRM Sync      │
              └─────────────────────┘
```

---

## AI Agents

The system uses **14 specialized AI agents**, each with its own Zod schema, prompt, and extraction logic:

| Agent | Document Type | What It Extracts |
|-------|--------------|------------------|
| `cnh-agent` | Driver's License (CNH) | Name, CPF, RG, nationality, date of birth, parents |
| `rgcpf-agent` | Identity Document (RG/CPF) | Full name, CPF, RG, issuing authority |
| `ato-agent` | Purchase Agreement | Total contract value |
| `quadro-resumo-agent` | Contract Summary | Buyer details, property info, full financial breakdown |
| `fluxo-agent` | Payment Flow | Installments, financing, subsidies, delivery schedule |
| `planta-agent` | Floor Plan | Block, unit number, apartment identification |
| `comprovante-residencia-agent` | Proof of Address | Full address, name, document date |
| `declaracao-residencia-agent` | Residence Declaration | Declared address, witness info, notarization |
| `certidao-estado-civil-agent` | Marital Status Certificate | Civil status, spouse name, registry details |
| `termo-agent` | Acknowledgment Term | Signatory, accepted clauses, signature date |
| `carteira-trabalho-agent` | Employment Record | Employer, role, salary, admission date |
| `comprovante-renda-agent` | Income Proof | Gross/net income, employer, pay period |
| `carta-fiador-agent` | Guarantor Letter | Guarantor name, CPF, property offered |
| `validation-agent` | Cross-Validation | Compares all extracted data, outputs structured divergence report |

### Controlled Vocabulary

The validation agent uses a strict three-status vocabulary for every field comparison:

- **Igual** — Values match across documents
- **Divergente** — Values conflict (triggers manual review)
- **Ignorado** — Field not present or not applicable

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Server Components, Turbopack) |
| **Language** | TypeScript 5 |
| **AI / LLM** | Vercel AI SDK + Google Gemini + Anthropic Claude |
| **Database** | PostgreSQL + Drizzle ORM |
| **Validation** | Zod schemas for structured LLM output |
| **Auth** | Custom session-based auth with bcrypt + iron-session |
| **UI** | Tailwind CSS 4 + shadcn/ui + Radix Primitives |
| **Deployment** | Vercel (serverless functions + edge) |
| **Integration** | CV CRM REST API (webhooks, status updates, messaging) |

---

## Key Features

### Multi-Agent Orchestration
All 13 extraction agents run **in parallel** via `Promise.all`, with automatic retry and provider fallback (Gemini → Claude). The orchestrator manages the full pipeline from extraction through validation to report generation.

### Deterministic + AI Hybrid Validation
Financial comparisons use **deterministic JavaScript validators** with R$1.00 tolerance (no LLM hallucination risk for numbers). The AI agent handles fuzzy matching for names, addresses, and complex cross-document logic.

### Real-Time CRM Integration
The system receives webhook events from CV CRM when a reservation enters the "Contract Analysis" stage, processes everything in the background using Next.js `after()`, and sends results back — including formatted messages and status updates.

### Production Monitoring
A dedicated monitoring dashboard shows:
- Per-agent execution status (success/failure)
- Validation result breakdown (Igual/Divergente/Ignorado ratio)
- Execution timing per analysis
- Formatted report previews
- Expandable log timeline

### Audit Trail
Every analysis is persisted with full traceability: raw LLM outputs, structured extraction data, validation results, execution time, prompt version, and rule version. This enables comparison between AI and human decisions.

---

## Project Structure

```
src/
├── ai/
│   ├── _base/                  # Agent runner, LLM client, Zod utilities
│   ├── agents/                 # 14 specialized agents (schema + prompt + runner)
│   ├── orchestrator/           # Multi-phase pipeline orchestrator
│   └── validation/             # Financial, planta, completeness, report
├── app/
│   ├── (private)/              # Dashboard, reservations, logs, settings
│   ├── (public)/               # Login, register
│   └── api/                    # Webhook, audit, confirm, status endpoints
├── components/                 # UI components + extraction detail viewer
├── db/                         # PostgreSQL schema + queries (Drizzle)
├── lib/
│   ├── auth/                   # Session management
│   └── cvcrm/                  # CRM API client + types
└── services/                   # Business logic orchestration
```

**~10,500 lines** of TypeScript across **124 files**, with **~1,900 lines** dedicated to the AI module.

---

## How It Works

```
1. CV CRM fires webhook → POST /api/automacao_contratos
2. System fetches reservation data, contracts, and documents from CRM API
3. Document completeness check (9 required groups)
4. If incomplete → notify CRM with missing documents list
5. If complete → run 13 extraction agents in parallel
6. Run deterministic financial comparison (Fluxo vs Quadro Resumo)
7. Run planta validation (block/unit matching)
8. Run AI cross-validation agent with all consolidated data
9. Generate formatted divergence report
10. Update reservation status (approved/divergent)
11. Send report back to CRM + update situation
12. Human reviewer can manually approve divergent contracts
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI Providers
GOOGLE_GENERATIVE_AI_API_KEY=...
ANTHROPIC_API_KEY=...

# CV CRM Integration
CVCRM_BASE_URL=https://your-company.cvcrm.com.br
CVCRM_EMAIL=...
CVCRM_TOKEN=...
CVCRM_SYNC_ENABLED=true
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Run database migrations
npx drizzle-kit push

# Start development server
npm run dev
```

---

## License

Private project built for Lyx Engenharia. Source code shared for portfolio purposes.

---

<p align="center">
  <sub>Built by <a href="https://github.com/joaodadas">João Vitor Dadas</a></sub>
</p>
