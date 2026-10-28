import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cross,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export const Login: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isRegister) {
        await api.auth.register(fullName, email, password)
        // Automatically login after registration
        await login(email, password)
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Quick Demo Account Helper
  const handleQuickDemo = async (role: 'admin' | 'patient') => {
    setError(null)
    setLoading(true)
    const demoEmail = role === 'admin' ? 'doctor.admin@medidoc.hospital' : 'patient.john@medidoc.hospital'
    const demoPass = 'HospitalPass123!'
    const demoName = role === 'admin' ? 'Dr. Sarah Mitchell, MD' : 'John Doe (Patient)'

    try {
      // First try login
      try {
        await login(demoEmail, demoPass)
        navigate('/')
        return
      } catch {
        // If user doesn't exist yet, auto-register then login!
        await api.auth.register(demoName, demoEmail, demoPass)
        await login(demoEmail, demoPass)
        navigate('/')
      }
    } catch (err: any) {
      setError(`Demo account setup error: ${err?.message || 'Try normal registration'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md shadow-teal-200">
          <Cross className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          MediDoc <span className="text-teal-600">AI</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Secure Medical Document Intelligence & Clinical Workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8 space-y-6">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false)
                setError(null)
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                !isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true)
                setError(null)
              }}
              className={`flex-1 py-1.5 rounded-md transition-all ${
                isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Staff Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name & Title</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith, MD"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.org"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Register & Enter Workspace' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              Fast Demo Quick-Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                disabled={loading}
                className="py-2 px-2.5 rounded-lg border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-teal-800 text-xs font-semibold text-center transition-colors"
              >
                🩺 Doctor / Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('patient')}
                disabled={loading}
                className="py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold text-center transition-colors"
              >
                👤 Patient User
              </button>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <p className="mt-4 text-center text-[11px] text-slate-400">
          MediDoc AI complies with HIPAA security & JWT encrypted token storage.
        </p>
      </div>
    </div>
  )
}
