import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  Bot,
  Activity,
  UserCog,
  LogOut,
  Cross,
  FileCheck2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  pendingReviewCount?: number
}

export const Sidebar: React.FC<SidebarProps> = ({ pendingReviewCount = 0 }) => {
  const { user, logout } = useAuth()

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/documents',
      label: 'Document Library',
      icon: FileText,
      badge: null,
    },
    {
      to: '/security',
      label: 'Security & Quarantine',
      icon: ShieldAlert,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      to: '/assistant',
      label: 'AI Assistant',
      icon: Bot,
      badge: 'RAG',
      badgeColor: 'bg-teal-100 text-teal-800 font-semibold',
    },
    {
      to: '/timeline',
      label: 'Clinical Timeline',
      icon: Activity,
      badge: null,
    },
    {
      to: '/admin',
      label: 'Admin & Access',
      icon: UserCog,
      badge: user?.role === 'admin' ? 'Admin' : null,
      badgeColor: 'bg-purple-100 text-purple-700',
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Hospital Brand Header */}
      <div className="h-16 border-b border-slate-100 flex items-center px-5 gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-200">
          <Cross className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5 text-base">
            MediDoc <span className="text-teal-600 font-extrabold text-sm px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200">AI</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Hospital Clinical System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Clinical Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-500 group-hover:text-teal-600" />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    item.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* User Info & Quick Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.full_name ? user.full_name.charAt(0) : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.full_name || 'Staff User'}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user?.role || 'Staff'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
