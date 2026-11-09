# Architecture & Engineering Decisions

This document outlines the architectural trade-offs, engineering decisions, and rationale made during the development of the **CloudLabs Workshop Operations Dashboard**.

---

## 1. Data Model & Database Choice

### Choice: MongoDB Atlas (Single Collection) over PostgreSQL
- **Why rejected relational databases**: AI assistants frequently default to proposing a normalized relational database (PostgreSQL with tables for `Users`, `Environments`, `Workshops`, and `AuditLogs`). I explicitly rejected this:
  1. The workshop operates on ~120 concurrent environments for a single session. The data is non-relational and document-oriented—each environment is self-contained.
  2. A normalized schema would require expensive `$lookup` joins on every table refresh and status query.
  3. Single-document operations in MongoDB allow **atomic state mutations** during reprovisioning (`status`, `failureReason`, and timestamps update in a single write operation).
- **Indexing Strategy**: High-frequency lookups are indexed for sub-5ms query response:
  - `{ status: 1, currentStep: 1 }`
  - `{ status: 1, lastActivityAt: -1 }`
  - Unique indexes on `learnerId` and `environmentId`.

---

## 2. Framework & Separation of Concerns

### Choice: React + Vite + Express over Next.js
- **Why rejected Next.js**: Full-stack Next.js is often suggested by AI for full-stack apps. I rejected it because an internal operations dashboard does not benefit from Server-Side Rendering (SSR) or SEO. 
- **Clean Architecture**:
  - **Backend (Express + Node.js)**: Acts as the single source of truth, encapsulating all Mongoose queries, business rules, live simulation, and Groq AI compilation.
  - **Frontend (React + Vite)**: A lightweight, responsive Single Page Application (SPA). The client never calculates spend, never filters 120 records in JavaScript, and only receives pre-paginated and pre-aggregated payloads.

---

## 3. Server-Side Calculations & Exact Mathematical Formulas

All workshop telemetry math is executed inside MongoDB native aggregation pipelines (`$group`, `$cond`, `$multiply`, `$divide`), not in JavaScript loops.

### A. Cloud Spend Formula
Every learner VM accrues cloud charges based on its active runtime and hourly rate:
$$\text{Spend} = \sum_{i=1}^{N} \left( \frac{\text{runtimeMinutes}_i}{60} \times \text{hourlyRate}_i \right)$$
- **MongoDB Implementation**:
  ```javascript
  totalEstimatedSpend: {
    $sum: {
      $multiply: [
        { $divide: [{ $ifNull: ['$runtimeMinutes', 0] }, 60] },
        { $ifNull: ['$hourlyRate', 1.50] }
      ]
    }
  }
  ```

### B. Workshop Completion Percentage
$$\text{Average Completion \%} = \frac{1}{N} \sum_{i=1}^{N} \left( \frac{\text{currentStep}_i}{\text{totalSteps}_i} \times 100 \right)$$
- Evaluated across all learners to give the instructor an immediate sense of cohort progression.

### C. Stuck Learner Metric
A learner is flagged as **stuck** if they are actively in the lab but have remained on the same step for 20 minutes or longer:
$$\text{Time on Step (minutes)} = \left\lfloor \frac{\text{Date.now}() - \text{stepStartedAt}}{60 \times 1000} \right\rfloor$$
- **Rule**: If `status === 'in_use'` AND `Time on Step >= 20`, the dashboard flags the row with a high-contrast amber indicator (`⏱ 28m on step (Stuck)`).

---

## 4. Polling (6s) vs. WebSockets

- **Decision**: Implemented 6-second HTTP polling with browser tab visibility awareness (`document.visibilityState`).
- **Rationale**: Cloud infrastructure state changes (VM booting, steps completing) happen on a scale of minutes. WebSockets introduce stateful connection management, heartbeat reconnects, and socket memory leaks. Polling remains completely stateless, scales easily behind load balancers, and pauses when the instructor switches tabs.

---

## 5. Grounded AI Safety & NoSQL Injection Defense

- **Decision**: 2-Stage Sandboxed Compiler Architecture for the Natural Language Filter.
- **Safety Workflow**:
  1. **Translation**: Groq Cloud LLM (`openai/gpt-oss-120b`) parses plain English and returns a restricted JSON schema containing plain parameter names only.
  2. **Allowlist Validation**: The Node.js backend discards any unapproved keys or query operators.
  3. **Backend Compilation**: The backend constructs the safe Mongoose query internally:
     ```javascript
     // Safe internal construction — no raw code or $where from LLM
     if (filters.currentStep) query.currentStep = parseInt(filters.currentStep, 10);
     if (filters.stuckDurationMinutes) {
       query.stepStartedAt = { $lte: new Date(Date.now() - filters.stuckDurationMinutes * 60000) };
       query.status = 'in_use';
     }
     ```
- **Groundedness Check**: If a prompt does not relate to workshop telemetry (e.g., *"What is the weather?"*), the AI sets `isGrounded: false` and the backend returns a polite boundary notice without running any database query.
- **Offline Fallback**: If the Groq API key is missing or the API times out, an offline regex parser handles basic step and failure queries with zero downtime.

---

## 6. Simulated Drift vs. Production Azure Reality

| Dimension | In This Dashboard | Real Azure Production |
| :--- | :--- | :--- |
| **Telemetry** | `simulationService` advances runtimes and steps in background ticks. | Azure Event Grid streams events from Azure Monitor / Log Analytics. |
| **Errors** | Realistic ARM errors (vCPU quota exceeded, subnet exhaustion, timeout). | Azure Resource Manager JSON deployment logs. |
| **Reprovisioning** | Mutates MongoDB document status to `provisioning` and clears error logs. | Invokes `@azure/arm-compute` to restart or redeploy the VM instance. |
| **Equilibrium** | Caps failures at 8 and maintains an active pool of ~70–80 learners. | Azure DevTest Labs pool capacity limits and quota reservations. |

---

## 7. AI Tooling: Where It Was Used vs. Where Generic Output Was Rejected

### Where AI Was Used:
1. **Generating Seed Data**: Created realistic profiles for all 120 learners, diverse names, and authentic Azure failure reasons (vCPU limits, Key Vault authorization errors).
2. **AI Feature Integration**: Engineered the system prompt and Groq SDK integration for the Natural Language Filter.
3. **Boilerplate Acceleration**: Accelerated boilerplate Mongoose schema definitions, JSDoc metadata, and initial React component scaffolding.

### Where Generic AI Output Was Explicitly Rejected:
1. **Rejected Generic PostgreSQL / Next.js Stack**: AI default templates frequently recommend PostgreSQL + Next.js. I rejected this to avoid relational join overhead and unnecessary SSR complexity, opting for MongoDB Atlas + Express + React Vite.
2. **Rejected "AI Slop" Dashboard UI**: Standard LLM UI output invariably produces four floating pastel gradient stat cards and decorative area charts. I rejected this in favor of a dense, compact **Operations Command Bar** (~60px) and a high-density table with sticky headers built specifically for scanning 120 rows.
3. **Rejected Direct LLM Database Queries**: Generic AI examples often execute raw JSON queries generated by the LLM. I rejected this due to severe NoSQL injection vulnerabilities, implementing the 2-stage compiler with an allowlist instead.
4. **Rejected Uncapped Simulation Drift**: Initial AI simulation logic let active learners continuously advance until all 120 either finished or accumulated as failures. I added **equilibrium guardrails** to cap failures at 8 and recycle finished learners to maintain a realistic workshop cohort.

---

## 8. What's Next / Future Roadmap

Depending on operational requirements and scale:
1. **1-Click Bulk Reprovisioning**: If failure rates spike during large workshops (e.g. 500+ learners), add a single-click *"Reprovision All Failed Environments"* button to batch-reprovision all blocked learners simultaneously.
2. **Interactive Cost & Quota Controls**: Allow instructors to dynamically adjust the hourly rate or set proactive budget alerts directly from the dashboard toolbar.
3. **Second AI Feature (At-Risk Learner Insights)**: Expand on the existing deterministic risk scoring (stuck $\ge$ 20m, failed status, inactivity) and use the Groq LLM to generate individualized intervention recommendations.
4. **Direct Azure ARM SDK Integration**: Swap the background simulation service with direct Azure Resource Manager webhooks for live cloud events.
