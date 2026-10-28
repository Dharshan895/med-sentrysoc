import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Calendar,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Eye,
  Pill,
  Clock,
} from 'lucide-react'
import { api, TimelineItem } from '../api/client'

interface ContextType {
  openDocDetail: (id: number) => void
  refreshTrigger: number
}

export const Timeline: React.FC = () => {
  const { openDocDetail, refreshTrigger } = useOutletContext<ContextType>()
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTest, setFilterTest] = useState('')

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const res = await api.documents.timeline()
      setItems(res?.timeline || [])
    } catch (err) {
      console.error('Failed to load timeline', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [refreshTrigger])

  const filteredItems = filterTest
    ? items.filter((item) =>
        item.test_or_field.toLowerCase().includes(filterTest.toLowerCase()) ||
        item.document_name.toLowerCase().includes(filterTest.toLowerCase())
      )
    : items

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Chronological Clinical Observations</h3>
            <p className="text-xs text-slate-400">
              {filteredItems.length} clinical milestone(s) extracted from medical PDFs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={filterTest}
            onChange={(e) => setFilterTest(e.target.value)}
            placeholder="Filter by test or document name..."
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full sm:w-64 focus:outline-hidden focus:border-teal-500"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {loading && (
          <div className="py-12 text-center text-slate-400 text-xs">
            Loading clinical milestones...
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            No clinical timeline events recorded yet. Upload a laboratory report or prescription to populate the timeline.
          </div>
        )}

        {filteredItems.map((item, index) => {
          const isMedication =
            item.test_or_field.toLowerCase().includes('med') ||
            item.test_or_field.toLowerCase().includes('tablet') ||
            item.test_or_field.toLowerCase().includes('syrup')

          return (
            <div key={index} className="relative group">
              {/* Timeline Node Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white ${
                  isMedication ? 'bg-blue-600' : 'bg-teal-600'
                }`}
              >
                {isMedication ? (
                  <Pill className="w-3 h-3" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
              </div>

              {/* Event Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-teal-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{item.test_or_field}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-teal-800">
                      {item.value} {item.unit}
                    </span>
                    {item.verification_required && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" /> Verification Req.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.document_created_at
                        ? new Date(item.document_created_at).toLocaleDateString()
                        : 'Recorded Date'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {item.document_name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openDocDetail(item.document_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Source</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
