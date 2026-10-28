import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Search,
  Filter,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Trash2,
  UploadCloud,
  RefreshCw,
  User,
} from 'lucide-react'
import { api, Document } from '../api/client'

interface ContextType {
  openDocDetail: (id: number) => void
  openUpload: () => void
  refreshTrigger: number
  triggerRefresh: () => void
}

export const Documents: React.FC = () => {
  const { openDocDetail, openUpload, refreshTrigger, triggerRefresh } = useOutletContext<ContextType>()
  const [documents, setDocuments] = useState<Document[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [securityStatus, setSecurityStatus] = useState('')

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const res = await api.documents.list({
        q: search.trim() || undefined,
        document_type: category || undefined,
        security_status: securityStatus || undefined,
        limit: 100,
      })
      setDocuments(res.documents || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error('Failed to load documents', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [category, securityStatus, refreshTrigger])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchDocs()
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete medical record #${id}?`)) return
    try {
      await api.documents.delete(id)
      triggerRefresh()
    } catch (err: any) {
      alert(err?.message || 'Delete failed.')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by name or keywords..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Categories</option>
            <option value="prescription">Prescription</option>
            <option value="lab report">Lab Report</option>
            <option value="discharge summary">Discharge Summary</option>
            <option value="unclassified">Unclassified</option>
          </select>

          {/* Security Status Filter */}
          <select
            value={securityStatus}
            onChange={(e) => setSecurityStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Security States</option>
            <option value="SAFE">SAFE</option>
            <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>

          <button
            onClick={() => {
              setSearch('')
              setCategory('')
              setSecurityStatus('')
              triggerRefresh()
            }}
            title="Reset filters"
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={openUpload}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-2 rounded-lg text-xs shrink-0 shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Documents Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{documents.length}</strong> of{' '}
            <strong className="text-slate-800">{total}</strong> total medical documents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Security Status</th>
                <th className="py-3 px-3">Patient</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => openDocDetail(doc.id)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-medium text-slate-500">#{doc.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-semibold text-slate-800 group-hover:text-teal-700 transition-colors truncate max-w-xs">
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
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
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
                  <td className="py-3 px-3 text-slate-600">
                    {doc.patient_id ? (
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 text-slate-400" /> Patient #{doc.patient_id}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openDocDetail(doc.id)
                        }}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                        title="View & Inspect"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    No documents matching criteria.
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
