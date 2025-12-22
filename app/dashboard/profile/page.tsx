"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, RefreshCw, Loader2, Brain, Heart, Scale, Users, Cpu, Shield } from "lucide-react"
import type { SoulPrintData } from "@/lib/gemini/types"

const pillarIcons: Record<string, React.ReactNode> = {
    communication_style: <Brain className="w-5 h-5" />,
    emotional_alignment: <Heart className="w-5 h-5" />,
    decision_making: <Scale className="w-5 h-5" />,
    social_cultural: <Users className="w-5 h-5" />,
    cognitive_processing: <Cpu className="w-5 h-5" />,
    assertiveness_conflict: <Shield className="w-5 h-5" />,
}

const pillarLabels: Record<string, string> = {
    communication_style: "Communication Style",
    emotional_alignment: "Emotional Alignment",
    decision_making: "Decision Making",
    social_cultural: "Social & Cultural",
    cognitive_processing: "Cognitive Processing",
    assertiveness_conflict: "Assertiveness & Conflict",
}

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const [soulprint, setSoulprint] = useState<SoulPrintData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showRetakeConfirm, setShowRetakeConfirm] = useState(false)

    useEffect(() => {
        async function loadSoulprint() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            const { data } = await supabase
                .from('soulprints')
                .select('soulprint_data')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data?.soulprint_data) {
                setSoulprint(data.soulprint_data as SoulPrintData)
            }
            setLoading(false)
        }
        loadSoulprint()
    }, [router, supabase])

    const handleExport = () => {
        if (!soulprint) return
        const blob = new Blob([JSON.stringify(soulprint, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `soulprint-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleRetake = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Delete existing soulprint
        await supabase.from('soulprints').delete().eq('user_id', user.id)

        // Clear local storage
        localStorage.removeItem("soulprint_answers")
        localStorage.removeItem("soulprint_current_q")

        // Redirect to questionnaire
        router.push('/questionnaire')
    }

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!soulprint) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">No SoulPrint Yet</h1>
                    <p className="text-gray-400">Complete the questionnaire to create your SoulPrint.</p>
                </div>
                <Button onClick={() => router.push('/questionnaire')} className="bg-orange-600 hover:bg-orange-700">
                    Start Questionnaire
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">My SoulPrint</h1>
                    <p className="text-gray-400">Your AI personality profile</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExport} variant="outline" className="border-[#333] text-white hover:bg-[#222]">
                        <Download className="mr-2 h-4 w-4" />
                        Export JSON
                    </Button>
                    <Button onClick={() => setShowRetakeConfirm(true)} variant="outline" className="border-[#333] text-white hover:bg-[#222]">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retake
                    </Button>
                </div>
            </div>

            {/* Retake Confirmation */}
            {showRetakeConfirm && (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                    <p className="text-orange-400 mb-3">Are you sure? This will delete your current SoulPrint and start fresh.</p>
                    <div className="flex gap-2">
                        <Button onClick={() => setShowRetakeConfirm(false)} variant="outline" className="border-[#333] text-white">
                            Cancel
                        </Button>
                        <Button onClick={handleRetake} className="bg-orange-600 hover:bg-orange-700">
                            Yes, Retake
                        </Button>
                    </div>
                </div>
            )}

            {/* Identity Card */}
            <div className="rounded-xl border border-[#222] bg-[#111] p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700">
                        <span className="text-2xl font-bold text-white">
                            {soulprint.archetype?.[0] || 'S'}
                        </span>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider">Archetype</div>
                        <div className="text-2xl font-bold text-white">{soulprint.archetype || 'Unique Individual'}</div>
                    </div>
                </div>

                {soulprint.identity_signature && (
                    <div className="rounded-lg bg-[#0A0A0A] p-4 border border-[#222]">
                        <div className="text-sm text-gray-500 mb-2">Identity Signature</div>
                        <p className="text-gray-300">{soulprint.identity_signature}</p>
                    </div>
                )}
            </div>

            {/* Pillars */}
            <div className="grid gap-4">
                <h2 className="text-lg font-semibold text-white">Personality Pillars</h2>
                {soulprint.pillars && Object.entries(soulprint.pillars).map(([key, pillar]) => (
                    <div key={key} className="rounded-xl border border-[#222] bg-[#111] p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#222] text-orange-500">
                                {pillarIcons[key] || <Brain className="w-5 h-5" />}
                            </div>
                            <h3 className="text-lg font-semibold text-white">{pillarLabels[key] || key}</h3>
                        </div>
                        <p className="text-gray-400 mb-4">{pillar.summary}</p>

                        {pillar.markers && pillar.markers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pillar.markers.slice(0, 5).map((marker, i) => (
                                    <span key={i} className="rounded-full bg-[#222] px-3 py-1 text-xs text-gray-300">
                                        {marker}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Flinch Warnings */}
            {soulprint.flinch_warnings && soulprint.flinch_warnings.length > 0 && (
                <div className="rounded-xl border border-red-900/30 bg-red-900/10 p-6">
                    <h2 className="text-lg font-semibold text-red-400 mb-4">Communication Triggers</h2>
                    <p className="text-sm text-gray-400 mb-4">Things that may cause friction or discomfort:</p>
                    <ul className="space-y-2">
                        {soulprint.flinch_warnings.map((warning, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-300">
                                <span className="text-red-500 mt-1">•</span>
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Generated Date */}
            {soulprint.generated_at && (
                <div className="text-center text-sm text-gray-500">
                    Generated: {new Date(soulprint.generated_at).toLocaleDateString()}
                </div>
            )}
        </div>
    )
}
