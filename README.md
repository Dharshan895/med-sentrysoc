# MediDoc AI — Frontend & Backend Setup

MediDoc AI is an AI-powered medical document management platform designed for hospital staff. Built with **React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons**, integrated with the **FastAPI + SQLite + PaddleOCR + Sentence Transformers** backend.

---

## 🚀 Running Status

- **Frontend Dev Server**: [http://localhost:5173](http://localhost:5173) (Running)
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000) (Running)
- **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🏥 Implemented Features & Architecture

### 1. Hospital UI & Navigation
- **Light Theme Clinical Workspace**: Clean hospital-grade layout with soft teal accents, subtle borders, and readable typography.
- **Persistent Sidebar**: Navigation links with live badges for pending security reviews and unassigned records.
- **Top Header Bar**: Real-time backend connectivity heartbeat (`/health`), quick PDF upload trigger, and staff profile info.

### 2. Core Modules & Pages
| Section | Route | Description |
|---|---|---|
| **Dashboard** | `/` | Clinical metrics (Total records, Safe/Verified, Quarantine count, Clinical observations), category distribution breakdown, and recent uploads feed. |
| **Document Library** | `/documents` | Search, multi-criteria filtering (Document type, Security status), table view, and detailed inspection modal. |
| **Security & Quarantine** | `/security` | Dedicated inspection queue for flagged, quarantined, or review-required documents with security finding reports. |
| **Clinical AI Assistant** | `/assistant` | RAG-based clinical chat with source citations (document name, page number, quotation snippet, match score) and mandatory medical verification disclaimers. |
| **Clinical Timeline** | `/timeline` | Chronological stream of patient clinical events, laboratory test measurements, and medication candidates. |
| **Admin & Access Control** | `/admin` | Unassigned document triage to link documents with Patient IDs, plus role-based permission matrix. |
| **Auth & Security** | `/login` | Hospital staff login and registration with instant 1-click demo access for Doctors and Patients. |

---

## 🛠 Manual Startup Commands

### Start Backend
```powershell
cd backend
.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Start Frontend
```powershell
cd frontend
npm run dev
```
