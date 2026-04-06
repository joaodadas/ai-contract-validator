# Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive unit + integration test suite covering validation logic, CVCRM integration, and the orchestration pipeline.

**Architecture:** Jest with ts-jest for TypeScript, mocking external dependencies (fetch, DB, LLM). Tests organized mirroring src/ structure under src/__tests__/.

**Tech Stack:** Jest, ts-jest, @types/jest

---

### Task 1: Jest Infrastructure Setup

**Files:**
- Create: `jest.config.ts`
- Create: `src/__tests__/setup.ts`
- Modify: `package.json` (add scripts + devDependencies)
- Modify: `tsconfig.json` (add jest types)

- [ ] **Step 1: Install dependencies**
```bash
npm install --save-dev jest ts-jest @types/jest
```

- [ ] **Step 2: Create jest.config.ts**
```ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFilesAfterSetup: ["<rootDir>/src/__tests__/setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app/**",
    "!src/components/**",
  ],
};

export default config;
```

- [ ] **Step 3: Create setup.ts**
```ts
// Global test setup — env vars for tests
process.env.CVCRM_BASE_URL = "https://test.cvcrm.com.br";
process.env.CVCRM_EMAIL = "test@test.com";
process.env.CVCRM_TOKEN = "test-token";
process.env.CVCRM_SYNC_ENABLED = "false";
```

- [ ] **Step 4: Add npm scripts to package.json**
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

- [ ] **Step 5: Run jest to verify setup**
```bash
npm test -- --passWithNoTests
```

---

### Task 2: Unit Tests — constants.ts helpers

**Files:**
- Create: `src/__tests__/lib/cvcrm/constants.test.ts`
- Test: `src/lib/cvcrm/constants.ts`

Tests: docTypeToAgent (14 types + null), contractNameToAgent (5 types + null), isAllowedDocumentType (allowed/disallowed), filterDocuments (filter + empty groups).

---

### Task 3: Unit Tests — safeJsonParse

**Files:**
- Create: `src/__tests__/ai/_base/zod.test.ts`
- Test: `src/ai/_base/zod.ts`

Tests: valid JSON, JSON with code fences, JSON with extra text, regex fallback, truncated JSON, empty string.

---

### Task 4: Unit Tests — financial-comparison.ts

**Files:**
- Create: `src/__tests__/ai/validation/financial-comparison.test.ts`
- Test: `src/ai/validation/financial-comparison.ts`

Tests: all 8 items OK, tolerance boundary (0.99 OK, 1.01 DIVERGENTE), null fluxo/quadro, empty arrays, partial data.

---

### Task 5: Unit Tests — planta-validation.ts

**Files:**
- Create: `src/__tests__/ai/validation/planta-validation.test.ts`
- Test: `src/ai/validation/planta-validation.ts`

Tests: exact match, BLOCO prefix normalization, AP prefix normalization, missing reserva, missing planta, bloco mismatch, unit not found.

---

### Task 6: Unit Tests — document-completeness.ts

**Files:**
- Create: `src/__tests__/ai/validation/document-completeness.test.ts`
- Test: `src/ai/validation/document-completeness.ts`

Tests: all groups present, missing 1 group, OR logic within group, contract name mapping, status filtering (Reprovado ignored).

---

### Task 7: Unit Tests — CVCRM client.ts

**Files:**
- Create: `src/__tests__/lib/cvcrm/client.test.ts`
- Test: `src/lib/cvcrm/client.ts`

Tests: fetchReserva success/error, fetchContratos array/nested formats, alterarSituacao body shape, enviarMensagem defaults, env var validation, HTTP error handling.

---

### Task 8: Integration Tests — contractOrchestrator.ts

**Files:**
- Create: `src/__tests__/ai/orchestrator/contractOrchestrator.test.ts`
- Test: `src/ai/orchestrator/contractOrchestrator.ts`

Tests: runFinancialComparison with real-shaped data, runPlantaValidation with real-shaped data, full pipeline with mocked runAgent returning fixture data.

---

### Task 9: Integration Tests — reservation.service.ts

**Files:**
- Create: `src/__tests__/services/reservation.service.test.ts`
- Test: `src/services/reservation.service.ts`

Tests: processarReserva flow, runAgentAnalysis with complete/incomplete docs, confirmReservation with sync enabled/disabled, status transitions.
