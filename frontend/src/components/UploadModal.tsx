import React, { useState, useRef } from 'react'
import {
  X,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Clock,
  Pill,
  Activity,
  CheckCircle,
} from 'lucide-react'
import { api, UploadResponse } from '../api/client'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.type !== 'application/pdf' && !selected.name.endsWith('.pdf')) {
        setError('Only PDF documents are supported for clinical processing.')
        return
      }
      setFile(selected)
      setError(null)
      setResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0]
      if (dropped.type !== 'application/pdf' && !dropped.name.endsWith('.pdf')) {
        setError('Only PDF documents are supported.')
        return
      }
      setFile(dropped)
      setError(null)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const res = await api.upload.pdf(file)
      setResult(res)
      onSuccess()
    } catch (err: any) {
      setError(err?.message || 'Failed to upload and process PDF.')
    } finally {
      setUploading(false)
    }
  }

  const resetAll = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Upload Medical Document</h2>
            <p className="text-xs text-slate-500">
              PDF Security Inspection, PaddleOCR Text Extraction & Semantic Indexing
            </p>
          </div>
          <button
            onClick={() => {
              resetAll()
              onClose()
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {!result ? (
            <>
              {/* Drag & drop dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-teal-400 bg-teal-50/30'
                    : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  {file ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / 1024).toFixed(1)} KB — Ready to process
                      </p>
                      <span className="inline-block mt-3 text-xs text-teal-600 font-medium underline">
                        Choose different file
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Click or drag & drop medical PDF file here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports Prescriptions, Lab Reports, Discharge Summaries (Max 15MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline processing info card */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-teal-600" /> Automated Pipeline Stages:
                </p>
                <div className="grid grid-cols-3 gap-2 text-slate-500">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-700 block">1. Security Inspect</span>
                    Quarantine & malicious payload analysis
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-700 block">2. Text / OCR</span>
                    Direct extraction & PaddleOCR fallback
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="font-semibold text-slate-700 block">3. NLP & RAG</span>
                    Entity extraction & embedding indexing
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Upload and Processing Result View */
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-teal-50 border border-teal-200 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{result.filename}</h4>
                    <span className="text-[11px] font-mono text-slate-500">ID #{result.document_id}</span>
                  </div>
                  <p className="text-teal-800 font-medium mt-1">{result.message}</p>
                </div>
              </div>

              {/* Status & Category */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-white flex items-center justify-between">
                  <span className="text-slate-500">Security Scan:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 text-[11px] ${
                      result.security_status === 'SAFE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : result.security_status === 'REVIEW_REQUIRED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.security_status === 'SAFE' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {result.security_status}
                  </span>
                </div>

                <div className="p-3 rounded-lg border bg-white flex items-center justify-between">
                  <span className="text-slate-500">Classified Category:</span>
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {result.document_type || 'Unclassified'}
                  </span>
                </div>
              </div>

              {/* Security Findings Note */}
              {result.security_findings && result.security_findings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                  <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Security Findings:
                  </p>
                  <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                    {result.security_findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Entities */}
              {result.extracted_fields && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Clinical Entities Extracted
                  </h4>

                  {/* Measurements */}
                  {result.extracted_fields.measurements && result.extracted_fields.measurements.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-teal-600" /> Lab Measurements:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {result.extracted_fields.measurements.map((m, i) => (
                          <div key={i} className="p-2 rounded bg-slate-50 border border-slate-100">
                            <span className="font-medium text-slate-600 block">{m.test}</span>
                            <span className="font-bold text-slate-900">
                              {m.value} {m.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medications */}
                  {result.extracted_fields.medicine_candidates &&
                    result.extracted_fields.medicine_candidates.length > 0 && (
                      <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-blue-600" /> Medication Candidates:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {result.extracted_fields.medicine_candidates.map((med, i) => (
                            <div key={i} className="p-2 rounded bg-blue-50/50 border border-blue-100">
                              <span className="font-semibold text-blue-900 block">{med.name_candidate}</span>
                              <span className="text-slate-600">
                                {med.strength} {med.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Verification Flag */}
                  {result.extracted_fields.verification_required && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{result.extracted_fields.note || 'Medical Staff Verification Required.'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-3">
          {!result ? (
            <>
              <button
                onClick={() => {
                  resetAll()
                  onClose()
                }}
                disabled={uploading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs"
              >
                {uploading ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin" />
                    <span>Processing & Extracting...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Process</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={resetAll}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/50 rounded-lg"
              >
                Upload Another Document
              </button>
              <button
                onClick={() => {
                  resetAll()
                  onClose()
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
