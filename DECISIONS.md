# Architecture & Engineering Decisions

This document details the architectural choices, trade-offs, and engineering rationale for the **CloudLabs Workshop Operations Dashboard**.

---

## 1. Data Model: Single Collection vs. Normalized Schemas
- **Decision**: Store all workshop states in a single, well-indexed `Environment` MongoDB collection rather than splitting into separate `Session`, `Learner`, or `ActivityLog` collections.
- **Rationale**: For a single workshop with ~120 environments, a normalized relational schema requires costly multi-collection `$lookup` joins on every table refresh. A single collection allows atomic state mutations during reprovisioning (`findOneAndUpdate` / `save()`) and sub-5ms query times using compound indexes (`{ status: 1, currentStep: 1 }`, `{ status: 1, lastActivityAt: -1 }`).

---

## 2. Server-Side Execution vs. React Client-Side Computation
- **Decision**: All pagination, multi-field regex search, status filtering, dynamic sorting, and spend mathematics are executed strictly in Node.js and MongoDB. The React client is purely a presentation layer.
- **Rationale**: In real-world cloud workshops scaling to hundreds of learners, client-side filtering causes browser memory bloat and UI stutter. Centralizing computation on the server guarantees a single source of truth—when an instructor reprovisions a VM, aggregated spend and status counts update consistently across all clients.

---

## 3. Server-Side MongoDB Aggregation Pipelines
- **Decision**: `GET /api/environments/summary` calculates metrics directly inside MongoDB using native aggregation pipelines (`$group`, `$cond`, `$multiply`, `$divide`) rather than loading 120 documents into Node.js and looping in memory.
- **Rationale**: Real-time cloud spend is computed via `(runtimeMinutes / 60) * hourlyRate` inside MongoDB's optimized C++ engine. Node.js receives only a lightweight 200-byte summary object, eliminating V8 heap pressure and garbage collection overhead.

---

## 4. Polling (6s) vs. WebSockets
- **Decision**: Periodic HTTP polling (every 6 seconds with tab visibility pausing) was chosen over persistent bi-directional WebSockets (Socket.io).
- **Rationale**: Azure lab provisioning and learner step progress occur on the order of minutes, not milliseconds. A 6-second polling cadence gives the impression of live movement without the complexity of WebSocket heartbeats, reconnection logic, sticky sessions, or Redis pub/sub backplanes across distributed instances.

---

## 5. Grounded AI Safety Architecture & NoSQL Injection Defense
- **Decision**: Implemented a **2-Stage Sandboxed Compiler with a Strict Allowlist** for the Natural Language Filter rather than letting the LLM generate database queries.
- **Safety Mechanism**:
  1. Groq LLM converts natural language into a restricted JSON specification containing plain parameters only (`status`, `currentStep`, `stuckDurationMinutes`, `failureKeyword`, `search`).
  2. The Node.js backend validates every key against `ALLOWED_FILTER_KEYS` and constructs the safe Mongoose query internally.
- **Groundedness**: Queries outside workshop telemetry (e.g. *"What is the capital of France?"*) return `isGrounded: false` with an explanatory notice—never querying the database.
- **Graceful Degradation**: If Groq is unavailable, an offline rule-based regex parser takes over automatically, ensuring zero service disruption.

---

## 6. Simulated vs. Actual Azure Telemetry
- **Simulated**: The backend `simulationService` advances runtimes, progresses steps, and cycles provisioning states using interval ticks with **equilibrium guardrails** (capping failures at 8 and sustaining 70–80 active learners).
- **Production Reality**: In a live datacenter, Azure Event Grid and Azure Monitor Log Analytics stream VM heartbeats and ARM deployment errors (`QuotaExceeded`, `SubnetIsFull`). Reprovisioning would invoke the Azure SDK (`@azure/arm-compute`).

---

## 7. AI Tooling: Where It Was Used vs. Where Generic Output Was Rejected
- **Where AI Was Used**:
  - Accelerated generation of 120 realistic learner profiles and authentic Azure ARM failure messages.
  - Formulated initial Mongoose schema validation and JSDoc metadata.
  - Powered the natural-language-to-JSON translation via Groq Cloud (`openai/gpt-oss-120b`).
- **Where Generic AI Output Was Rejected ("No AI Slop")**:
  - **Rejected Four Pastel Gradient Cards**: Generic AI always suggests four floating gradient stat cards. We replaced this with a compact, dense **Operations Command Bar** (~60px) to maximize screen space for rows.
  - **Rejected Decorative Line Charts**: AI templates default to decorative historical line charts. We omitted them in favor of a dense table built for rapid scanning.
  - **Rejected Raw Query Generation**: AI often attempts to generate direct MongoDB JSON with `$where` operators. We rejected this pattern completely in favor of our 2-stage allowlisted compiler.
  - **Rejected Glassmorphism & Emojis**: Replaced glowing blurred cards and emoji icons with high-contrast, accessible SVG status badges meeting WCAG contrast guidelines.

---

## 8. What's Next / Future Roadmap
1. **Azure ARM Webhooks**: Ingest live webhook notifications directly from Azure Event Grid.
2. **Role-Based Access Control (RBAC)**: Differentiate permissions between Lead Instructors (can reprovision) and Teaching Assistants (read-only).
3. **Automated Budget Thresholds**: Webhook alerts triggered when workshop spend exceeds a preset budget.
