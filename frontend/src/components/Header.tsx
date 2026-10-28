import React, { useEffect, useState } from 'react'
import { Plus, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '../api/client'

interface HeaderProps {
  title: string
  subtitle?: string
  onUploadClick: () => void
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onUploadClick }) => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'healthy' | 'offline'>('checking')

  const checkHealth = async () => {
    try {
      const res = await api.health()
      if (res && res.status === 'healthy') {
        setBackendStatus('healthy')
      } else {
        setBackendStatus('offline')
      }
    } catch {
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    checkHealth()
    const timer = setInterval(checkHealth, 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-slate-800 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border font-medium bg-slate-50 border-slate-200">
          {backendStatus === 'checking' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
              <span className="text-slate-500">Checking API...</span>
            </>
          )}
          {backendStatus === 'healthy' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Backend Live</span>
              <span className="text-[10px] text-slate-400 font-mono">127.0.0.1:8000</span>
            </>
          )}
          {backendStatus === 'offline' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-600 font-semibold">Backend Disconnected</span>
            </>
          )}
        </div>

        {/* Quick Upload Action */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-xs hover:shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Medical PDF</span>
        </button>
      </div>
    </header>
  )
}
