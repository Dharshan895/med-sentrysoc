// Central API client — all requests go through here
const BASE = ''  // proxy handles /api → http://127.0.0.1:8000

function getToken(): string | null {
  return localStorage.getItem('medidoc_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isForm = false,
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isForm && body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('medidoc_token')
    localStorage.removeItem('medidoc_user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`)
  return data as T
}

// ── Auth ───────────────────────────────────────────────
export interface User {
  id: number
  email: string
  full_name: string
  role: 'patient' | 'admin'
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<TokenResponse>('POST', '/api/auth/login', { email, password }),
    register: (full_name: string, email: string, password: string) =>
      request<User>('POST', '/api/auth/register', { full_name, email, password }),
    me: () => request<User>('GET', '/api/auth/me'),
  },

  // ── Documents ─────────────────────────────────────────
  documents: {
    list: (params?: {
      q?: string
      document_type?: string
      security_status?: string
      limit?: number
      offset?: number
    }) => {
      const qs = new URLSearchParams()
      if (params?.q) qs.set('q', params.q)
      if (params?.document_type) qs.set('document_type', params.document_type)
      if (params?.security_status) qs.set('security_status', params.security_status)
      if (params?.limit) qs.set('limit', String(params.limit))
      if (params?.offset) qs.set('offset', String(params.offset))
      return request<{ total: number; limit: number; offset: number; documents: Document[] }>(
        'GET', `/api/documents?${qs}`
      )
    },
    get: (id: number) => request<DocumentDetail>('GET', `/api/documents/${id}`),
    delete: (id: number) => request<{ message: string; document_id: number }>('DELETE', `/api/documents/${id}`),
    timeline: () => request<{ timeline: TimelineItem[] }>('GET', '/api/timeline'),
  },

  // ── Upload ────────────────────────────────────────────
  upload: {
    pdf: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return request<UploadResponse>('POST', '/api/upload', form, true)
    },
  },

  // ── Assistant ─────────────────────────────────────────
  assistant: {
    ask: (question: string) =>
      request<AssistantResponse>('POST', '/api/assistant/ask', { question }),
  },

  // ── Admin ─────────────────────────────────────────────
  admin: {
    unassigned: () =>
      request<{ documents: Document[] }>('GET', '/api/admin/unassigned-documents'),
    assign: (document_id: number, patient_id: number) =>
      request<{ message: string }>('POST', `/api/admin/documents/${document_id}/assign/${patient_id}`),
  },

  // ── Health ────────────────────────────────────────────
  health: () => request<{ status: string; service: string }>('GET', '/health'),
}

// ── Types ─────────────────────────────────────────────
export interface Document {
  id: number
  original_name: string
  security_status: string
  document_type: string
  created_at: string
  patient_id: number | null
}

export interface DocumentDetail extends Document {
  sha256: string
  security_findings: string
  extracted_text: string
}

export interface UploadResponse {
  document_id: number
  filename: string
  sha256?: string
  security_status: string
  security_findings?: string[]
  document_type?: string
  extracted_fields?: {
    dates: string[]
    measurements: { test: string; value: string; unit: string; source_text: string }[]
    medicine_candidates: { name_candidate: string; strength: string; unit: string; source_text: string }[]
    verification_required: boolean
    note: string
  }
  pages?: { page: number; method: string; text: string }[]
  message: string
}

export interface TimelineItem {
  document_id: number
  document_name: string
  document_created_at: string
  test_or_field: string
  value: string
  unit: string
  verification_required: boolean
}

export interface AssistantResponse {
  answer: string
  sources: {
    document_id: number
    filename: string
    page: string | number
    snippet: string
    similarity: number
  }[]
  answer_type?: string
  medical_verification_required?: boolean
}
