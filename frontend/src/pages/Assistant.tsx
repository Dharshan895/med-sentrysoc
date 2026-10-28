import React, { useState } from 'react'
import {
  Send,
  Bot,
  User,
  AlertTriangle,
  FileText,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { api, AssistantResponse } from '../api/client'
import { useOutletContext } from 'react-router-dom'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  response?: AssistantResponse
  timestamp: string
}

interface ContextType {
  openDocDetail: (id: number) => void
}

export const Assistant: React.FC = () => {
  const { openDocDetail } = useOutletContext<ContextType>()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello. I am the MediDoc Clinical Assistant. Ask me questions about uploaded patient records, laboratory results, medications, or discharge summaries. I retrieve factual answers and cite verified document pages.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sampleQuestions = [
    'What medications are prescribed in the records?',
    'Summarize the latest laboratory results and test values.',
    'Are there any recorded follow-up dates or instructions?',
    'What diagnosis is noted in the discharge summary?',
  ]

  const handleSend = async (questionText?: string) => {
    const q = questionText || input
    if (!q.trim() || loading) return

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!questionText) setInput('')
    setLoading(true)

    try {
      const res = await api.assistant.ask(q.trim())
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: `Error retrieving answer: ${err?.message || 'Server error occurred'}. Ensure documents are uploaded and processed.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Assistant Header */}
      <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              MediDoc Clinical Intelligence
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                RAG Grounded
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Retrieves semantic chunks with sentence transformers & cites exact document sources
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'reset',
                sender: 'assistant',
                text: 'Conversation reset. Ask any question regarding patient records.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          title="Clear Conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'bg-teal-100 text-teal-700'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Content Bubble */}
            <div className="space-y-3 flex-1">
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-teal-600 text-white font-medium rounded-tr-none ml-auto max-w-xl'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div
                  className={`text-[10px] mt-1.5 font-sans ${
                    msg.sender === 'user' ? 'text-teal-100 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* RAG Citations & Disclaimer */}
              {msg.response && (
                <div className="space-y-3">
                  {/* Sources Section */}
                  {msg.response.sources && msg.response.sources.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-teal-600" /> Cited Source Documents
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {msg.response.sources.length} matching segment(s)
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        {msg.response.sources.map((src, i) => (
                          <div
                            key={i}
                            onClick={() => openDocDetail(src.document_id)}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-teal-50/40 hover:border-teal-200 transition-colors cursor-pointer group text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-slate-800 group-hover:text-teal-700 flex items-center gap-1.5 truncate">
                                <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span className="truncate">{src.filename || `Doc #${src.document_id}`}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  (Page {src.page})
                                </span>
                              </span>

                              {src.similarity !== undefined && (
                                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  Match: {(src.similarity * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100 font-serif line-clamp-2">
                              "{src.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mandatory Clinical Verification Disclaimer */}
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800">
                        Medical Verification Required
                      </span>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        AI output is generated from semantic document retrieval and must be validated against original patient health charts by authorized medical staff before treatment decisions.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Searching clinical index and synthesizing answer...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions Bar */}
      <div className="px-6 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span className="text-[11px] font-semibold text-slate-500 shrink-0">Suggestions:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 hover:border-teal-200 rounded-full text-slate-600 font-medium whitespace-nowrap transition-colors shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Type a clinical question (e.g. 'What is the dosage of amoxicillin?')..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-teal-500 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs shadow-xs transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Send Query</span>
          </button>
        </form>
      </div>
    </div>
  )
}
