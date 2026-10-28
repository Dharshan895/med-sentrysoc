import React, { useEffect, useState } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import {
  FileText,
  ShieldAlert,
  ShieldCheck,
  Activity,
  UploadCloud,
  Bot,
  Calendar,
  Eye,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { api, Document, TimelineItem } from '../api/client'

interface ContextType {
  openDocDetail: (id: number) => void
  openUpload: () => void
  refreshTrigger: number
}

export const Dashboard: React.FC = () => {
  const { openDocDetail, openUpload, refreshTrigger } = useOutletContext<ContextType>()
  const [documents, setDocuments] = useState<Document[]>([])
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [docsRes, timelineRes] = await Promise.all([
          api.documents.list({ limit: 100 }),
          api.documents.timeline().catch(() => ({ timeline: [] })),
        ])
        setDocuments(docsRes?.documents || [])
        setTimelineItems(timelineRes?.timeline || [])
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [refreshTrigger])

  const safeCount = documents.filter((d) => d.security_status === 'SAFE').length
  const reviewCount = documents.filter((d) => d.security_status === 'REVIEW_REQUIRED').length
  const blockedCount = documents.filter((d) => d.security_status === 'BLOCKED').length

  // Category counts
  const categoryCounts: Record<string, number> = {}
  documents.forEach((d) => {
    const cat = d.document_type || 'Unclassified'
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Documents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : documents.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-teal-600" /> Medical repository
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center">
            <FileText className="w-6 h-6 text-teal-600" />
          </div>
        </div>

        {/* Safe Documents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Safe & Cleared</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{loading ? '...' : safeCount}</h3>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified security
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Quarantined / Review Required */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quarantine & Review</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{loading ? '...' : reviewCount + blockedCount}</h3>
            <p className="text-[11px] text-amber-600 font-medium mt-1">Requires inspection</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* Clinical Measurements */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Entities</p>
            <h3 className="text-2xl font-bold text-teal-800 mt-1">{loading ? '...' : timelineItems.length}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Extracted test points</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30 uppercase tracking-wider">
            Clinical Workflow
          </span>
          <h2 className="text-xl font-bold mt-2">Intelligent Medical Document Hub</h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Upload patient reports for automatic text extraction, security inspection, and natural language clinical question answering.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={openUpload}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs shadow-xs transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Medical PDF</span>
          </button>
          <Link
            to="/assistant"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-xs backdrop-blur-xs transition-all"
          >
            <Bot className="w-4 h-4 text-teal-300" />
            <span>Ask Medical AI</span>
          </Link>
          <Link
            to="/timeline"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-xs backdrop-blur-xs transition-all"
          >
            <Calendar className="w-4 h-4 text-teal-300" />
            <span>View Timeline</span>
          </Link>
        </div>
      </div>

      {/* Grid: Category Breakdown + Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (1 col) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <h3 className="font-bold text-slate-800 text-sm mb-1">Document Categories</h3>
          <p className="text-xs text-slate-400 mb-4">Classified medical record types</p>

          <div className="space-y-3 flex-1">
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No documents uploaded yet.</div>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / (documents.length || 1)) * 100)
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 capitalize">{cat}</span>
                      <span className="font-semibold text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              to="/documents"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center justify-between"
            >
              <span>Explore all records in Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Documents Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Recent Medical Documents</h3>
              <p className="text-xs text-slate-400">Latest records processed by MediDoc AI</p>
            </div>
            <Link
              to="/documents"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Security</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.slice(0, 6).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={doc.original_name}>
                          {doc.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {doc.document_type || 'Unclassified'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                          doc.security_status === 'SAFE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.security_status === 'REVIEW_REQUIRED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.security_status === 'SAFE' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        {doc.security_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openDocDetail(doc.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors font-medium text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {documents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No documents found. Click "Upload Medical PDF" to start!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
