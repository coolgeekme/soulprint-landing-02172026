"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface ImportStats {
    stats: {
        native_count: number
        imported_count: number
        total_count: number
    }
    bySource: Record<string, number>
    recentJobs: {
        id: string
        source: string
        status: string
        total_messages: number
        processed_messages: number
        started_at: string
        completed_at: string | null
    }[]
}

interface ImportResult {
    success: boolean
    stats: {
        conversationsImported: number
        messagesImported: number
        estimatedTokens: number
        errors: number
        durationSeconds: number
    }
    errors: string[]
}

export default function ImportPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [importStats, setImportStats] = useState<ImportStats | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/import/gpt')
            if (response.ok) {
                const data = await response.json()
                setImportStats(data)
            }
        } catch (err) {
            console.error('Error fetching stats:', err)
        }
    }, [])

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }
            setLoading(false)
            fetchStats()
        }
        checkUser()
    }, [router, supabase, fetchStats])

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
        }
    }

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a JSON file (conversations.json)')
            return
        }
        setSelectedFile(file)
        setError(null)
        setImportResult(null)
    }

    const handleImport = async () => {
        if (!selectedFile) return

        console.log('[Import] Starting import for file:', selectedFile.name, selectedFile.size, 'bytes')
        setImporting(true)
        setError(null)

        try {
            console.log('[Import] Reading file content...')
            const fileContent = await selectedFile.text()
            console.log('[Import] File content length:', fileContent.length)

            // Validate JSON
            try {
                const parsed = JSON.parse(fileContent)
                console.log('[Import] Valid JSON, conversations:', Array.isArray(parsed) ? parsed.length : 'not array')
            } catch {
                setError('Invalid JSON file. Please upload a valid conversations.json from ChatGPT.')
                setImporting(false)
                return
            }

            console.log('[Import] Sending to API...')
            const response = await fetch('/api/import/gpt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversations: fileContent }),
            })

            console.log('[Import] API response status:', response.status)
            const result = await response.json()
            console.log('[Import] API result:', result)

            if (!response.ok) {
                setError(result.error || 'Import failed')
            } else {
                setImportResult(result)
                fetchStats() // Refresh stats
            }
        } catch (err) {
            console.error('[Import] Error:', err)
            setError(err instanceof Error ? err.message : 'Import failed')
        } finally {
            setImporting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#fafafa]">
                <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="relative flex h-full w-full flex-col overflow-auto rounded-xl bg-[#fafafa] shadow-[0px_4px_4px_2px_rgba(0,0,0,0.25)]">
            <div className="flex-1 p-6 lg:p-8">
                {/* Upload Section */}
                <div className="max-w-[720px]">
                    <h1 className="font-koulen text-[32px] leading-[38px] text-black mb-6">
                        Import from ChatGPT
                    </h1>

                    {/* Instructions */}
                    <div className="mb-6 p-4 rounded-[14px] border border-blue-200 bg-blue-50">
                        <h3 className="font-medium text-blue-900 mb-2">How to export from ChatGPT:</h3>
                        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                            <li>Go to ChatGPT Settings &rarr; Data Controls</li>
                            <li>Click &quot;Export data&quot; (only click once!)</li>
                            <li>Wait for the email from OpenAI with a download link</li>
                            <li>Download and unzip the file</li>
                            <li>Upload the <code className="bg-blue-100 px-1 rounded">conversations.json</code> file below</li>
                        </ol>
                        <div className="mt-3 p-2 bg-amber-100 border border-amber-300 rounded-lg">
                            <p className="text-xs text-amber-800">
                                <strong>Be patient!</strong> ChatGPT can take 5-15 minutes to prepare your export,
                                depending on how much chat history you have. You&apos;ll receive an email when it&apos;s ready to download.
                            </p>
                        </div>
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                            <p className="text-xs text-red-800">
                                <strong>Mobile users:</strong> When downloading on iPhone/Android, keep the browser open until the download completes.
                                Closing the app or switching tabs will cause the download to fail. Desktop is fine.
                            </p>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    <div
                        className={`
                            relative p-8 rounded-[14px] border-2 border-dashed transition-colors
                            ${dragActive
                                ? 'border-orange-500 bg-orange-50'
                                : selectedFile
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            }
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        <div className="flex flex-col items-center justify-center text-center">
                            {selectedFile ? (
                                <>
                                    <FileJson className="w-12 h-12 text-green-600 mb-3" />
                                    <p className="font-medium text-green-700">{selectedFile.name}</p>
                                    <p className="text-sm text-green-600">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                    <p className="font-medium text-gray-700">
                                        Drop conversations.json here
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        or click to browse
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-4 rounded-[14px] border border-red-200 bg-red-50 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-700">Import Error</p>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Import Button */}
                    {selectedFile && !importResult && (
                        <Button
                            onClick={handleImport}
                            disabled={importing}
                            className="mt-4 w-full bg-orange-600 hover:bg-orange-700 text-white h-12"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing... This may take a few minutes
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import Conversations
                                </>
                            )}
                        </Button>
                    )}

                    {/* Success Result */}
                    {importResult?.success && (
                        <div className="mt-4 p-6 rounded-[14px] border border-green-200 bg-green-50">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <h3 className="font-semibold text-green-700">Import Complete!</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-green-600">Conversations</p>
                                    <p className="font-semibold text-green-800">
                                        {importResult.stats.conversationsImported.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-green-600">Messages</p>
                                    <p className="font-semibold text-green-800">
                                        {importResult.stats.messagesImported.toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-green-600">Est. Tokens</p>
                                    <p className="font-semibold text-green-800">
                                        {importResult.stats.estimatedTokens > 1000000
                                            ? `${(importResult.stats.estimatedTokens / 1000000).toFixed(1)}M`
                                            : `${(importResult.stats.estimatedTokens / 1000).toFixed(0)}K`}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-green-600">Duration</p>
                                    <p className="font-semibold text-green-800">
                                        {importResult.stats.durationSeconds.toFixed(1)}s
                                    </p>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-green-200">
                                    <p className="text-sm text-yellow-700">
                                        {importResult.errors.length} messages had issues (skipped)
                                    </p>
                                </div>
                            )}

                            <Button
                                onClick={() => router.push('/dashboard/chat')}
                                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                Start Chatting with Enhanced Memory
                            </Button>
                        </div>
                    )}

                    </div>
            </div>
        </div>
    )
}
