import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { UploadModal } from './UploadModal'
import { DocumentDetailModal } from './DocumentDetailModal'
import { api } from '../api/client'

export const Layout: React.FC = () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const location = useLocation()

  // Determine title and subtitle based on route
  const getHeaderInfo = () => {
    switch (location.pathname) {
      case '/':
        return {
          title: 'Clinical Document Dashboard',
          subtitle: 'Real-time overview of document processing, OCR status, and medical records',
        }
      case '/documents':
        return {
          title: 'Medical Document Library',
          subtitle: 'Search, filter, inspect, and manage archived patient records',
        }
      case '/security':
        return {
          title: 'Security & Quarantine Inspector',
          subtitle: 'Review suspicious uploads, inspect security findings, and verify safety',
        }
      case '/assistant':
        return {
          title: 'MediDoc Clinical AI Assistant',
          subtitle: 'Source-grounded RAG answers from uploaded medical documents',
        }
      case '/timeline':
        return {
          title: 'Patient Clinical Timeline',
          subtitle: 'Chronological events, medication candidates, and laboratory test history',
        }
      case '/admin':
        return {
          title: 'Administration & Document Assignment',
          subtitle: 'Manage unassigned hospital records, staff roles, and access controls',
        }
      default:
        return {
          title: 'MediDoc AI',
          subtitle: 'Hospital Document Management System',
        }
    }
  }

  // Load pending review count for badge
  const updatePendingCount = async () => {
    try {
      const res = await api.documents.list({ security_status: 'REVIEW_REQUIRED', limit: 100 })
      setPendingCount(res?.total || 0)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    updatePendingCount()
  }, [refreshTrigger])

  const { title, subtitle } = getHeaderInfo()

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar pendingReviewCount={pendingCount} />

      {/* Main Container */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header
          title={title}
          subtitle={subtitle}
          onUploadClick={() => setIsUploadOpen(true)}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Provide outlet with openDocDetail and refresh callbacks */}
          <Outlet
            context={{
              openDocDetail: (id: number) => setSelectedDocId(id),
              openUpload: () => setIsUploadOpen(true),
              refreshTrigger,
              triggerRefresh: () => setRefreshTrigger((prev) => prev + 1),
            }}
          />
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Detail Modal */}
      <DocumentDetailModal
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onDeleted={() => setRefreshTrigger((prev) => prev + 1)}
      />
    </div>
  )
}
