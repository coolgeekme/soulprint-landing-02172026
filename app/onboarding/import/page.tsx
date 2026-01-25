"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    Upload, FileJson, AlertCircle, Loader2,
    CheckCircle, Brain, Mic2, User, Sparkles,
    ArrowLeft
} from "lucide-react"

interface AnalysisResult {
    success: boolean
    soulprint?: {
        id: string
        archetype: string
        identity_signature: string
        voice_vectors: {
            cadence_speed: string
            tone_warmth: string
            emoji_usage: string
            sentence_structure: string
        }
    }
    name?: {
        name: string
        alternates: string[]
        source: 'detected' | 'generated'
        detectedNickname?: string
    }
    analysis?: {
        totalMessages: number
        userMessages: number
        confidenceLevel: 'low' | 'medium' | 'high'
    }
    importStats?: {
        conversationsImported: number
        messagesImported: number
    }
    error?: string
}

type Stage = 'upload' | 'parsing' | 'analyzing' | 'generating' | 'naming' | 'complete' | 'error'

const STAGE_INFO: Record<Stage, { label: string; icon: React.ReactNode }> = {
    upload: { label: 'Upload your ChatGPT export', icon: <Upload className="w-6 h-6" /> },
    parsing: { label: 'Parsing conversations...', icon: <FileJson className="w-6 h-6 animate-pulse" /> },
    analyzing: { label: 'Extracting voice patterns...', icon: <Mic2 className="w-6 h-6 animate-pulse" /> },
    generating: { label: 'Building your SoulPrint...', icon: <Brain className="w-6 h-6 animate-pulse" /> },
    naming: { label: 'Finding your companion name...', icon: <User className="w-6 h-6 animate-pulse" /> },
    complete: { label: 'Complete!', icon: <CheckCircle className="w-6 h-6 text-green-500" /> },
    error: { label: 'Error occurred', icon: <AlertCircle className="w-6 h-6 text-red-500" /> },
}

export default function OnboardingImportPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [stage, setStage] = useState<Stage>('upload')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<AnalysisResult | null>(null)

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Check if user already has a soulprint
            const { data: existingSoulprint } = await supabase
                .from('soulprints')
                .select('id, companion_name')
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingSoulprint) {
                router.push('/dashboard/chat')
                return
            }

            setLoading(false)
        }
        checkUser()
    }, [router, supabase])

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
    }

    const processImport = useCallback(async () => {
        if (!selectedFile) return

        setError(null)

        try {
            // Stage: Parsing
            setStage('parsing')
            const fileContent = await selectedFile.text()

            // Validate JSON
            try {
                JSON.parse(fileContent)
            } catch {
                setError('Invalid JSON file. Please upload a valid conversations.json from ChatGPT.')
                setStage('error')
                return
            }

            // Stage: Analyzing
            setStage('analyzing')
            await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause for UX

            // Stage: Generating
            setStage('generating')

            // Call the combined import+analyze API
            const response = await fetch('/api/import/gpt-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversations: fileContent }),
            })

            const data: AnalysisResult = await response.json()

            if (!response.ok || !data.success) {
                setError(data.error || 'Analysis failed')
                setStage('error')
                return
            }

            // Stage: Naming
            setStage('naming')
            await new Promise(resolve => setTimeout(resolve, 800)) // Dramatic pause

            // Complete!
            setResult(data)
            setStage('complete')

            // Navigate to name reveal after brief delay
            setTimeout(() => {
                router.push(`/onboarding/name-reveal?name=${encodeURIComponent(data.name?.name || 'Companion')}&source=${data.name?.source || 'generated'}&archetype=${encodeURIComponent(data.soulprint?.archetype || '')}`)
            }, 1000)

        } catch (err) {
            console.error('Import error:', err)
            setError(err instanceof Error ? err.message : 'Import failed')
            setStage('error')
        }
    }, [selectedFile, router])

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Back button */}
                <Button
                    variant="ghost"
                    onClick={() => router.push('/onboarding/choose')}
                    className="mb-6 text-gray-400 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="font-koulen text-[40px] lg:text-[48px] leading-[1.1] text-white tracking-wide mb-4">
                        IMPORT YOUR HISTORY
                    </h1>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Upload your ChatGPT export and we&apos;ll analyze your communication patterns to create a personalized AI companion.
                    </p>
                </div>

                {/* Progress Stages */}
                {stage !== 'upload' && stage !== 'error' && (
                    <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                        <div className="flex items-center justify-center gap-4">
                            <div className="text-orange-400">
                                {STAGE_INFO[stage].icon}
                            </div>
                            <div className="text-lg text-white font-medium">
                                {STAGE_INFO[stage].label}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                                style={{
                                    width: stage === 'parsing' ? '20%' :
                                           stage === 'analyzing' ? '40%' :
                                           stage === 'generating' ? '60%' :
                                           stage === 'naming' ? '80%' :
                                           stage === 'complete' ? '100%' : '0%'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Upload Section - Only show in upload stage */}
                {stage === 'upload' && (
                    <>
                        {/* Instructions */}
                        <div className="mb-6 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                            <h3 className="font-medium text-blue-300 mb-2">How to export from ChatGPT:</h3>
                            <ol className="list-decimal list-inside text-sm text-blue-200/80 space-y-1">
                                <li>Go to ChatGPT Settings → Data Controls</li>
                                <li>Click &quot;Export data&quot;</li>
                                <li>Wait for the email from OpenAI (5-15 min)</li>
                                <li>Download and unzip the file</li>
                                <li>Upload <code className="bg-blue-500/20 px-1 rounded">conversations.json</code> below</li>
                            </ol>
                        </div>

                        {/* Drop Zone */}
                        <div
                            className={`
                                relative p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                                ${dragActive
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : selectedFile
                                    ? 'border-green-500 bg-green-500/10'
                                    : 'border-gray-600 bg-white/5 hover:border-gray-500 hover:bg-white/10'
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
                                        <FileJson className="w-16 h-16 text-green-400 mb-4" />
                                        <p className="font-medium text-green-300 text-lg">{selectedFile.name}</p>
                                        <p className="text-sm text-green-400/80">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-16 h-16 text-gray-500 mb-4" />
                                        <p className="font-medium text-gray-300 text-lg">
                                            Drop conversations.json here
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            or click to browse
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Import Button */}
                        {selectedFile && (
                            <Button
                                onClick={processImport}
                                className="mt-6 w-full h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-lg font-semibold rounded-xl"
                            >
                                <Sparkles className="w-5 h-5 mr-2" />
                                Analyze & Create SoulPrint
                            </Button>
                        )}
                    </>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mt-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-red-300">Error</p>
                            <p className="text-sm text-red-400/80">{error}</p>
                        </div>
                    </div>
                )}

                {/* Error retry button */}
                {stage === 'error' && (
                    <Button
                        onClick={() => {
                            setStage('upload')
                            setError(null)
                        }}
                        className="mt-6 w-full h-12 bg-white/10 hover:bg-white/20 text-white"
                    >
                        Try Again
                    </Button>
                )}
            </div>
        </div>
    )
}
