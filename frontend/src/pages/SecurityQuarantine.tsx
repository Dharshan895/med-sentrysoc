import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Eye,
  CheckCircle2,
  Trash2,
  Info,
  Lock,
} from 'lucide-react'
import { api, Document } from '../api/client'

interface ContextType {
  openDocDetail: (id: number) => void
  refreshTrigger: number
  triggerRefresh: () => void
}

export const SecurityQuarantine: React.FC = () => {
  const { openDocDetail, refreshTrigger, triggerRefresh } = useOutletContext<ContextType>()
  const [quarantined, setQuarantined] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQuarantined = async () => {
    setLoading(true)
    try {
      const [reviewRes, blockedRes] = await Promise.all([
        api.documents.list({ security_status: 'REVIEW_REQUIRED', limit: 100 }),
        api.documents.list({ security_status: 'BLOCKED', limit: 100 }),
      ])
      const combined = [...(reviewRes.documents || []), ...(blockedRes.documents || [])]
      // deduplicate
      const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values())
      setQuarantined(unique)
    } catch (err) {
      console.error('Failed to load quarantined documents', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuarantined()
  }, [refreshTrigger])

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Permanently remove quarantined document #${id}?`)) return
    try {
      await api.documents.delete(id)
      triggerRefresh()
    } catch (err: any) {
      alert(err?.message || 'Delete failed.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Informational Security Banner */}
      <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-5 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h3 className="font-bold text-amber-900 text-sm">Security Quarantine & Verification Desk</h3>
          <p className="text-amber-800">
            Incoming PDF files are statically inspected for embedded executable scripts, Launch actions, JavaScript payloads, and anomalous stream encodings before text extraction.
          </p>
          <div className="flex items-center gap-4 pt-1 font-medium text-amber-900">
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Direct execution disabled
            </span>
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" /> Patient access quarantined pending staff clearance
            </span>
          </div>
        </div>
      </div>

      {/* Quarantined List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Quarantined Records Queue</h3>
            <p className="text-xs text-slate-400">
              {quarantined.length} documents requiring administrative inspection
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Quarantine Status</th>
                <th className="py-3 px-3">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quarantined.map((doc) => (
                <tr key={doc.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-500">#{doc.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{doc.original_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {doc.document_type || 'Unclassified'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                        doc.security_status === 'BLOCKED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {doc.security_status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDocDetail(doc.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Findings</span>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {quarantined.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                      <p className="font-semibold text-slate-700">All Clear</p>
                      <p className="text-xs text-slate-400">No quarantined documents require attention.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
