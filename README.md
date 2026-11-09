# CloudLabs Workshop Operations Dashboard

[![Live Deployment](https://img.shields.io/badge/Live_Dashboard-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://cloudlabs-workshop-dashboard.onrender.com)
[![Video Walkthrough](https://img.shields.io/badge/Demo_Video-YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/EosEp5zpcHI)
[![React 19](https://img.shields.io/badge/React_19-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js_24-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Groq AI](https://img.shields.io/badge/AI_Compiler-Groq_Cloud-F55036?style=for-the-badge)](https://groq.com)

> **Design Intent**: An enterprise-grade, high-density operations console engineered for an instructor to monitor ~120 live Azure cloud lab environments, spot failures and stuck learners instantly, and mutate infrastructure state safely without visual clutter.

---

## 📌 Project Overview

During a live hands-on Azure cloud workshop with approximately **120 concurrent learners**, each student works in an independently provisioned Azure environment. Instructors face significant operational challenges: identifying who is falling behind, which VM templates failed to deploy, total accumulated cloud expenditure, and intervening directly to reprovision failed labs.

This project delivers a **production-quality, full-stack operations dashboard** that simulates live cloud telemetry, executes real-time server-side aggregations, supports state-mutating reprovisioning workflows, and provides a **grounded natural-language filter powered by Groq Cloud AI**.

### Quick Links
- 🌐 **Live Deployed Application**: [https://cloudlabs-workshop-dashboard.onrender.com](https://cloudlabs-workshop-dashboard.onrender.com)
- 🎥 **Video Walkthrough (60–90s)**: [https://youtu.be/EosEp5zpcHI](https://youtu.be/EosEp5zpcHI)
- 📄 **Architecture & Decisions Document**: [DECISIONS.md](DECISIONS.md)

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT VITE FRONTEND                             │
│  - Dense 120-row table (sticky headers, tabular nums, accessible tags) │
│  - Summary command bar (live spend, avg completion, status counters)   │
│  - Filter toolbar (status pills, multi-field search, dynamic sorting)  │
│  - Grounded Natural Language query console                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Polling (6s) / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS.JS BACKEND (Node.js)                     │
│  ├── /api/environments          (Pagination, regex search, sorting)    │
│  ├── /api/environments/summary  (MongoDB aggregation pipelines)        │
│  ├── /api/environments/:id/reprovision (Atomic state mutation)         │
│  └── /api/ai/filter             (2-Stage grounded query compiler)      │
└───────────────┬───────────────────┬───────────────────┬────────────────┘
                │                   │                   │
                ▼                   ▼                   ▼
     ┌────────────────────┐ ┌───────────────┐ ┌────────────────────┐
     │   MONGODB ATLAS    │ │  SIMULATION   │ │   GROQ CLOUD AI    │
     │ - 120 seeded envs  │ │ - Live drift  │ │ - Llama / GPT-OSS  │
     │ - Compound indexes │ │ - Step moves  │ │ - Zero raw Mongo   │
     │ - Atomic mutations │ │ - Capped pool │ │ - Strict allowlist │
     └────────────────────┘ └───────────────┘ └────────────────────┘
```

---

## 🌟 Core Features

### 1. High-Density Multi-Learner Overview
- **Scanning-First Layout**: Engineered to display dozens of learners per viewport with compact row heights (`py-2 px-3`), sticky headers, and clear visual hierarchy.
- **Tabular Precision**: Monospace tabular numerals (`font-mono tabular-nums`) eliminate layout jitter as metrics update via background polling.
- **Stuck Learner Detection**: Active learners on the same step for $\ge$ 20 minutes automatically display a high-contrast amber indicator (`⏱ 28m on step (Stuck)`).

### 2. Live Azure Lifecycle States
The system models 5 authentic cloud environment states with full database indexing:

| Status | Meaning in Azure Workshop | Badge Appearance | Actionable |
| :--- | :--- | :--- | :--- |
| **`in_use`** | Learner actively executing workshop steps | Emerald with subtle activity pulse | View progress |
| **`failed`** | ARM template failure, quota exceeded, or timeout | Rose with alert icon & error banner | **Reprovision** button |
| **`provisioning`** | Azure Bicep/ARM template deploying resources | Sky blue with spinning loader | Read-only |
| **`ready`** | VM & cloud resources provisioned, awaiting login | Slate neutral | Read-only |
| **`deprovisioned`** | Workshop complete; resources deleted to stop spend | Muted zinc | Read-only |

### 3. Server-Side Aggregation & Spend Math
- All computations are executed directly inside **MongoDB native aggregation pipelines** (`$group`, `$cond`, `$multiply`, `$divide`):
  $$\text{Spend} = \sum \left( \frac{\text{runtimeMinutes}}{60} \times \text{hourlyRate} \right)$$
- Evaluates average progress percentage across all active learners and returns a compact 200-byte payload to the client.

### 4. Infrastructure State Mutation (Reprovisioning)
- `POST /api/environments/:id/reprovision` enforces strict business rules:
  1. Validates that the environment exists.
  2. Enforces safety guard: **only** environments in `failed` status can be reprovisioned (returns `400 Bad Request` if attempted on active VMs).
  3. Transitions status back to `provisioning`, clears previous error messages, updates timestamps, and decrements workshop failure counts across all clients on the next poll.

### 5. Grounded AI Natural Language Filter (Groq Cloud)
- **2-Stage Sandboxed Compiler**:
  1. Groq LLM translates plain English into a restricted JSON specification.
  2. The Node.js backend validates all keys against an **approved allowlist** (`currentStep`, `status`, `minRuntime`, `maxRuntime`, `stuckDurationMinutes`, `failureKeyword`, `search`).
- **Zero Raw Query Execution**: The backend writes the safe Mongoose query internally. No raw MongoDB operators (`$where`, `$eval`) from the LLM are ever executed.
- **Groundedness Boundary**: Prompts outside workshop telemetry (e.g., *"What is the weather?"*) are politely rejected without database execution.
- **Offline Fallback Guarantee**: If Groq API is unavailable or rate-limited, an internal rule-based parser handles step and status queries with zero downtime.

### 6. Background Simulation Engine with Equilibrium Guardrails
- Automatically advances active runtimes, progresses provisioning environments to ready, moves ready environments into use, and simulates step progression.
- **Equilibrium Guardrails**: Built-in caps prevent failures from exceeding 8 environments and gently replenish the active learner pool around **70–80 learners**, keeping the workshop realistic indefinitely.

---

## 🎨 Design Bar: Rejection of "AI Slop"

In strict adherence to the assignment's visual evaluation criteria:
- **No Four-Gradient Cards**: Replaced generic pastel cards with a compact, horizontal **Operations Command Bar** (~60px height).
- **No Decorative Line Charts**: Avoided screen-wasting charts in favor of dense, scrollable tabular rows with pinned headers.
- **No Glassmorphism, Glows, or Emojis**: Restrained enterprise palette (`#0b0f19`) where color carries semantic status only (Rose = Failure, Amber = Stuck, Emerald = Active).
- **Accessibility**: Status is never communicated by color alone (always icon + status label + error text).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS, Axios, Lucide React |
| **Backend** | Node.js (v24), Express.js (ES Modules), Mongoose |
| **Database** | MongoDB Atlas (Cloud Cluster with compound indexes) |
| **AI / LLM** | Groq Cloud SDK (`openai/gpt-oss-120b` / `llama-3.3-70b-versatile`) |
| **Hosting** | Render.com (Unified single-container deployment) |

---

## 📂 Project Structure

```text
Cloudlabs-Workshop-Dashboard/
├── Assignment.pdf              # Original assignment brief
├── DECISIONS.md                # Architecture trade-offs & design decisions
├── README.md                   # Complete documentation
├── package.json                # Root deployment & orchestration scripts
│
├── server/                     # Backend API & Simulation
│   ├── .env.example            # Environment variables template
│   ├── package.json            # Server dependencies
│   └── src/
│       ├── config/
│       │   └── database.js     # MongoDB connection & graceful shutdown
│       ├── controllers/
│       │   ├── aiController.js # AI filter handler
│       │   └── environmentController.js # CRUD & reprovision handlers
│       ├── middleware/
│       │   └── errorMiddleware.js # Centralized error & 404 handler
│       ├── models/
│       │   └── Environment.js  # Schema, indexes, validations, virtuals
│       ├── routes/
│       │   ├── aiRoutes.js     # /api/ai endpoints
│       │   └── environmentRoutes.js # /api/environments endpoints
│       ├── services/
│       │   ├── aiService.js    # Grounded Groq compiler + allowlist + fallback
│       │   ├── environmentService.js # DB queries, pagination, aggregation
│       │   └── simulationService.js  # Live drift simulation with caps
│       ├── utils/
│       │   └── seedData.js     # 120 realistic Azure environments generator
│       ├── app.js              # Express app setup & production static serving
│       └── server.js           # Server startup & simulation lifecycle
│
└── client/                     # Frontend Application
    ├── package.json            # Client dependencies
    ├── tailwind.config.js      # Monospace typography & dark theme
    ├── vite.config.js          # Reverse proxy to backend (:5000)
    └── src/
        ├── components/
        │   ├── AIInsights/
        │   │   └── NaturalLanguageFilterBar.jsx # Grounded AI query bar
        │   ├── EnvironmentTable/
        │   │   └── EnvironmentTable.jsx         # Sticky, dense 120-row table
        │   ├── FilterBar/
        │   │   └── FilterBar.jsx                # Status pills, search, sort
        │   ├── StatusBadge/
        │   │   └── StatusBadge.jsx              # High-contrast status badges
        │   └── Summary/
        │       └── SummaryBar.jsx               # Command bar & cloud spend
        ├── hooks/
        │   └── useEnvironments.js               # Polling & query state hook
        ├── pages/
        │   └── Dashboard.jsx                    # Primary operations page
        ├── services/
        │   └── api.js                           # Axios client with proxy
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

---

## ⚙️ Environment Variables

Create `server/.env` based on `server/.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Atlas or Local)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ywipqhb.mongodb.net/spektra

# Workshop Parameters
WORKSHOP_NAME=Azure Cloud Architecture Hands-on Lab
WORKSHOP_TOTAL_STEPS=8
DEFAULT_HOURLY_RATE=1.50

# Live Simulation Engine
ENABLE_SIMULATION=true
SIMULATION_INTERVAL_MS=20000

# Groq Cloud AI Configuration
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js** (v18.x, v20.x, or v24.x)
- **npm** (v9+)
- **MongoDB Atlas** database cluster (or local MongoDB)

### 1. Clone the Repository
```bash
git clone https://github.com/Shauryakant/Cloudlabs-Workshop-Dashboard.git
cd Cloudlabs-Workshop-Dashboard
```

### 2. Install Dependencies
```bash
npm run install:all
```
*(Installs dependencies for both `server` and `client`)*

### 3. Seed 120 Realistic Workshop Environments
```bash
npm run seed
```
*Connects to your MongoDB cluster, clears previous data, and seeds 120 learners with varied steps, runtimes, and authentic Azure failure reasons.*

### 4. Start Development Servers
Open two terminal windows:

**Terminal 1 — Backend Server:**
```bash
cd server
npm run dev
# Running at http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm run dev
# Running at http://localhost:5173
```

Open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

## 📡 Complete REST API Documentation

### 1. Workshop Session Aggregation
```http
GET /api/environments/summary
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalLearners": 120,
    "provisioningCount": 12,
    "readyCount": 14,
    "inUseCount": 76,
    "failedCount": 8,
    "deprovisionedCount": 10,
    "totalEstimatedSpend": 215.95,
    "averageRuntimeMinutes": 72,
    "averageCompletionPercentage": 38.8
  }
}
```

### 2. Query Environments (Filter, Sort, Search, Paginate)
```http
GET /api/environments?page=1&limit=20&status=failed&search=Aarav&sort=runtimeMinutes&order=desc
```
**Parameters:**
- `page`: Page index (default: `1`)
- `limit`: Items per page (default: `20`, max: `100`)
- `status`: `provisioning` | `ready` | `in_use` | `failed` | `deprovisioned`
- `search`: Case-insensitive search across learner name, learner ID, or environment ID
- `sort`: `runtimeMinutes` | `currentStep` | `lastActivityAt` | `createdAt` | `learnerName`
- `order`: `asc` | `desc`

### 3. Get Single Environment
```http
GET /api/environments/:id
```
*(Accepts either MongoDB ObjectId or business environment ID like `env-az-077`)*

### 4. Reprovision Failed Environment
```http
POST /api/environments/:id/reprovision
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Environment reprovisioning initiated successfully",
  "data": {
    "environmentId": "env-az-077",
    "status": "provisioning",
    "failureReason": null,
    "provisionedAt": "2026-11-09T12:00:00.000Z"
  }
}
```
*Returns `400 Bad Request` if attempted on any environment not in `failed` status.*

### 5. Grounded Natural Language Filter
```http
POST /api/ai/filter
Content-Type: application/json

{
  "query": "Show everyone stuck on step 4 for over 20 minutes"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "isGrounded": true,
  "explanation": "Filtering environments stuck on step 4 for more than 20 minutes",
  "filters": {
    "currentStep": 4,
    "stuckDurationMinutes": 20
  },
  "count": 11,
  "data": [ ... ]
}
```

---

## 📝 Submission Checklist Verification

- [x] **Repository + Detailed README**: Setup, running instructions, architecture, and one-line design intent.
- [x] **[DECISIONS.md](DECISIONS.md)**: Data model, server-side logic, AI failure safety, simulated telemetry, and future steps (under one page).
- [x] **60–90s Video Walkthrough**: [https://youtu.be/EosEp5zpcHI](https://youtu.be/EosEp5zpcHI)
- [x] **Note on AI Tooling**: Documented where AI assistance was used and where generic output ("AI slop") was explicitly rejected.
