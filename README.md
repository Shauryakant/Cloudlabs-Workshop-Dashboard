# CloudLabs Workshop Operations Dashboard

> **Design Intent**: An enterprise-grade, high-density operations console engineered for an instructor to monitor ~120 live Azure cloud lab environments, spot failures and stuck learners instantly, and mutate infrastructure state safely without visual clutter.

---

## 🎥 Demo Video

- **Live Deployed Dashboard**: [https://cloudlabs-workshop-dashboard.onrender.com](https://cloudlabs-workshop-dashboard.onrender.com)
- **Demo Video Link**: [Watch the Walkthrough Video](YOUR_DEMO_VIDEO_LINK_HERE)

---

## 🚀 Key Capabilities

- **Dense Multi-Learner Overview**: Purpose-built layout to scan 120 environments rapidly on a single desktop view without pagination fatigue.
- **Server-Side Aggregation**: Real-time spend computation `(runtimeMinutes / 60) * hourlyRate` and status counts calculated directly in MongoDB pipelines.
- **Instant State Mutation (Reprovisioning)**: `POST /api/environments/:id/reprovision` safely transitions failed environments to provisioning, resets failure logs, and updates timestamps.
- **Grounded AI Natural Language Filter**: Powered by Groq LLM (`openai/gpt-oss-120b`). Uses a strict allowlist and a 2-stage compiler that never executes raw MongoDB code.
- **Live Background Simulation**: Background engine simulates realistic Azure state drift (step advances, runtimes, provisioning completion) with built-in equilibrium caps.
- **No "AI Slop" Design System**: Zero pastel gradients, zero glassmorphism, zero emoji icons. Color carries status only. Tabular figures align cleanly without jitter.

---

## 🛠 Technology Stack

### Backend
- **Node.js** (v24+) & **Express.js** (ES Modules)
- **MongoDB Atlas** with **Mongoose**
- **Groq Cloud API** (`openai/gpt-oss-120b` / `llama-3.3-70b-versatile`)
- **CORS**, **dotenv**

### Frontend
- **React.js 19** with **Vite 8**
- **Tailwind CSS** (Restrained operational dark palette `#0b0f19`)
- **Axios** (Configured with Vite reverse proxy)
- **Lucide React** (Consistent semantic SVG icons)

---

## 📂 Repository Structure

```text
├── Assignment.pdf              # Original specification
├── DECISIONS.md                # Architectural decisions & engineering rationale
├── README.md                   # Setup guide and documentation
├── package.json                # Root orchestration scripts
│
├── server/                     # Express.js + Mongoose Backend
│   ├── .env.example            # Environment variables template
│   ├── package.json            # Backend dependencies
│   └── src/
│       ├── config/
│       │   └── database.js     # MongoDB connection & graceful shutdown
│       ├── controllers/
│       │   ├── aiController.js
│       │   └── environmentController.js
│       ├── middleware/
│       │   └── errorMiddleware.js # 404 & centralized error handler
│       ├── models/
│       │   └── Environment.js  # Schema, indexes, validations, virtuals
│       ├── routes/
│       │   ├── aiRoutes.js
│       │   └── environmentRoutes.js
│       ├── services/
│       │   ├── aiService.js    # Groq NL filter compiler + allowlist + fallback
│       │   ├── environmentService.js # DB queries, pagination, aggregation
│       │   └── simulationService.js  # Live drift simulation with caps
│       ├── utils/
│       │   └── seedData.js     # 120 realistic Azure environments generator
│       ├── app.js              # Express app setup & route registration
│       └── server.js           # Server entrypoint & simulation lifecycle
│
└── client/                     # Vite + React Frontend
    ├── package.json            # Frontend dependencies
    ├── tailwind.config.js      # Custom monospace fonts & dark theme
    ├── vite.config.js          # Reverse proxy to backend
    └── src/
        ├── components/
        │   ├── AIInsights/
        │   │   └── NaturalLanguageFilterBar.jsx # Grounded AI query bar
        │   ├── EnvironmentTable/
        │   │   └── EnvironmentTable.jsx         # Sticky, dense 120-row table
        │   ├── FilterBar/
        │   │   └── FilterBar.jsx                # Status pills, search, sort
        │   ├── StatusBadge/
        │   │   └── StatusBadge.jsx              # Accessible status badges
        │   └── Summary/
        │       └── SummaryBar.jsx               # Command bar & cloud spend
        ├── hooks/
        │   └── useEnvironments.js               # Polling & query state hook
        ├── pages/
        │   └── Dashboard.jsx                    # Primary operations page
        ├── services/
        │   └── api.js                           # Axios API client
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

## 🏃 Local Setup & Quickstart

### Prerequisites
- **Node.js** (v18.x, v20.x, or v24.x)
- **npm** (v9+)
- **MongoDB Atlas** connection string (or local MongoDB)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Shauryakant/Cloudlabs-Workshop-Dashboard.git
cd Cloudlabs-Workshop-Dashboard

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Inside `server/`, create `.env` and supply your `MONGODB_URI` and `GROQ_API_KEY`.

### 3. Seed 120 Realistic Workshop Records
```bash
cd server
npm run seed
```
*Output: Successfully seeds 120 environments with varied statuses, runtimes, and Azure error messages into MongoDB Atlas.*

### 4. Run Locally
Open two terminal windows:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Starts on http://localhost:5173
```

Open your browser at **`http://localhost:5173`**.

---

## 🌐 Production Deployment Guide

The application is structured to support both separate frontend/backend deployments and single-container monolithic deployment.

### Option A: Render.com / Railway (Single Service)
Because `server/src/app.js` contains production static asset serving:
1. Build script: `npm run build` (builds `client/dist`).
2. Start command: `npm start` (starts `server/src/server.js`).
3. Set environment variables (`MONGODB_URI`, `GROQ_API_KEY`, `NODE_ENV=production`).
4. Express will serve the React SPA directly from `client/dist` and proxy all `/api` calls internally.

### Option B: Separate Frontend (Vercel) & Backend (Render/Railway)
1. Deploy `server/` to Render/Railway. Set environment variables.
2. Deploy `client/` to Vercel/Netlify. Set `VITE_API_BASE_URL` to your live backend URL.

---

## 📡 API Reference Documentation

### 1. Workshop Session Aggregation Summary
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
GET /api/environments?page=1&limit=20&status=failed&search=rahul&sort=runtimeMinutes&order=desc
```
**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (`provisioning` | `ready` | `in_use` | `failed` | `deprovisioned`)
- `search` (case-insensitive search across learner name, learner ID, environment ID)
- `sort` (`runtimeMinutes` | `currentStep` | `lastActivityAt` | `createdAt` | `learnerName`)
- `order` (`asc` | `desc`)

### 3. Get Single Environment
```http
GET /api/environments/:id
```
*(Accepts either MongoDB ObjectId or business environmentId like `env-az-077`)*

### 4. Reprovision Failed Environment (State Mutation)
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
    "provisionedAt": "2026-11-09T10:45:00.000Z"
  }
}
```
*Note: Returns `400 Bad Request` if attempted on any environment that is not in `failed` status.*

### 5. Grounded Natural Language Filter (AI)
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
*(If the query is ungrounded or conversational, `isGrounded` returns `false` with an explanatory boundary notice and zero query execution).*
