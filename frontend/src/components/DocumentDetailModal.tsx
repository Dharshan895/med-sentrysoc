import React, { useEffect, useState } from 'react'
import {
  X,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  Hash,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  User,
} from 'lucide-react'
import { api, DocumentDetail } from '../api/client'

interface DocumentDetailModalProps {
  documentId: number | null
  onClose: () => void
  onDeleted: () => void
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  documentId,
  onClose,
  onDeleted,
}) => {
  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!documentId) {
      setDetail(null)
      return
    }
    const fetchDoc = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.documents.get(documentId)
        setDetail(res)
      } catch (err: any) {
        setError(err?.message || 'Failed to load document details.')
      } finally {
        setLoading(false)
      }
    }
    fetchDoc()
  }, [documentId])

  if (!documentId) return null

  const handleCopyText = () => {
    if (detail?.extracted_text) {
      navigator.clipboard.writeText(detail.extracted_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this medical record?')) return
    setDeleting(true)
    try {
      await api.documents.delete(documentId)
      onDeleted()
      onClose()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete document.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {detail?.original_name || `Document #${documentId}`}
              </h3>
              <p className="text-xs text-slate-500">Record ID: #{documentId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading && (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full mb-2"></div>
              <p>Loading document metadata and extracted text...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {detail && !loading && (
            <>
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-1">Document Category</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                    {detail.document_type || 'Unclassified'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-1">Security Inspection</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px] ${
                      detail.security_status === 'SAFE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : detail.security_status === 'REVIEW_REQUIRED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {detail.security_status === 'SAFE' ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <ShieldAlert className="w-3 h-3" />
                    )}
                    {detail.security_status}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-1">Assigned Patient</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {detail.patient_id ? `Patient #${detail.patient_id}` : 'Unassigned'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block mb-1">Uploaded Date</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {detail.created_at ? new Date(detail.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* SHA-256 Hash & Integrity */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between text-slate-600 overflow-hidden">
                <div className="flex items-center gap-2 truncate">
                  <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">SHA-256:</span>
                  <span className="truncate">{detail.sha256 || 'None'}</span>
                </div>
              </div>

              {/* Security Findings Note */}
              {detail.security_findings && detail.security_findings !== '[]' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                  <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Security Inspection Findings:
                  </p>
                  <p className="text-amber-800 font-mono text-[11px] whitespace-pre-wrap">
                    {detail.security_findings}
                  </p>
                </div>
              )}

              {/* Extracted Clinical Text */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" /> Extracted Clinical Text (OCR & Direct)
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200/50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto text-xs font-mono text-slate-800 whitespace-pre-wrap bg-slate-900 text-slate-200 rounded-b-lg">
                  {detail.extracted_text || (
                    <span className="text-slate-500 italic">No text extracted or document in quarantine.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Deleting...' : 'Delete Record'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
