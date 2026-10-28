import React, { useEffect, useState } from 'react'
import {
  UserCog,
  FileText,
  UserCheck,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Users,
} from 'lucide-react'
import { api, Document } from '../api/client'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ContextType {
  openDocDetail: (id: number) => void
  triggerRefresh: () => void
}

export const Admin: React.FC = () => {
  const { openDocDetail, triggerRefresh } = useOutletContext<ContextType>()
  const { user } = useAuth()
  const [unassigned, setUnassigned] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [patientIds, setPatientIds] = useState<Record<number, string>>({})
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchUnassigned = async () => {
    setLoading(true)
    try {
      const res = await api.admin.unassigned()
      setUnassigned(res?.documents || [])
    } catch (err: any) {
      console.error('Failed to load unassigned docs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnassigned()
  }, [])

  const handleAssign = async (docId: number) => {
    const rawId = patientIds[docId]
    if (!rawId || isNaN(Number(rawId))) {
      setMsg({ type: 'error', text: 'Please enter a valid numeric Patient ID.' })
      return
    }

    setAssigningId(docId)
    setMsg(null)
    try {
      await api.admin.assign(docId, Number(rawId))
      setMsg({ type: 'success', text: `Document #${docId} assigned to Patient #${rawId} successfully.` })
      fetchUnassigned()
      triggerRefresh()
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.message || 'Failed to assign document.' })
    } finally {
      setAssigningId(null)
    }
  }

  const staffRoles = [
    { role: 'Hospital Administrator', level: 'Full Access', desc: 'Can inspect quarantine, assign documents, and manage clinical index', color: 'bg-purple-100 text-purple-800' },
    { role: 'Attending Physician (Doctor)', level: 'Clinical Review & AI Queries', desc: 'Full patient record viewing, RAG query access, and validation approvals', color: 'bg-teal-100 text-teal-800' },
    { role: 'Clinical Staff / Nurse', level: 'Upload & Triage', desc: 'Upload scanned prescriptions, OCR processing, and metadata updates', color: 'bg-blue-100 text-blue-800' },
    { role: 'Patient / Subject', level: 'Self Records Only', desc: 'Read-only access restricted strictly to their assigned patient ID records', color: 'bg-slate-100 text-slate-800' },
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Feedback Alert */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Unassigned Document Assignment Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-600" /> Unassigned Document Triage
            </h3>
            <p className="text-xs text-slate-400">
              Documents ingested without an assigned Patient ID. Assign them to grant patient-level access.
            </p>
          </div>
          <button
            onClick={fetchUnassigned}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Security</th>
                <th className="py-3 px-4">Assign to Patient ID</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unassigned.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-500">#{doc.id}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{doc.original_name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {doc.document_type || 'Unclassified'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[11px] bg-slate-100 text-slate-700">
                      {doc.security_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="e.g. 101"
                        value={patientIds[doc.id] || ''}
                        onChange={(e) =>
                          setPatientIds({ ...patientIds, [doc.id]: e.target.value })
                        }
                        className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden focus:border-teal-500"
                      />
                      <button
                        onClick={() => handleAssign(doc.id)}
                        disabled={assigningId === doc.id || !patientIds[doc.id]}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold rounded text-xs transition-colors"
                      >
                        {assigningId === doc.id ? 'Saving...' : 'Assign'}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openDocDetail(doc.id)}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-teal-700 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}

              {unassigned.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    No unassigned documents. All medical records are linked to patients.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Role & Access Control Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Role-Based Clinical Access Matrix</h3>
            <p className="text-xs text-slate-400">
              HIPAA-aligned patient isolation, privilege levels, and administrative controls
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {staffRoles.map((r, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">{r.role}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.color}`}>
                  {r.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
