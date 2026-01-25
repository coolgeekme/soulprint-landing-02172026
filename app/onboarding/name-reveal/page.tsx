"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, RefreshCw, Check, Edit2 } from "lucide-react"

function NameRevealContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [revealed, setRevealed] = useState(false)
    const [showAlternates, setShowAlternates] = useState(false)
    const [customMode, setCustomMode] = useState(false)
    const [customName, setCustomName] = useState('')
    const [selectedName, setSelectedName] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [alternates, setAlternates] = useState<string[]>([])

    const name = searchParams.get('name') || 'Companion'
    const source = searchParams.get('source') || 'generated'
    const archetype = searchParams.get('archetype') || ''

    useEffect(() => {
        async function checkUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            // Get soulprint to get alternates
            const { data: soulprint } = await supabase
                .from('soulprints')
                .select('id, companion_name')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!soulprint) {
                // No soulprint yet, redirect back
                router.push('/onboarding/choose')
                return
            }

            // Generate some alternate names for display
            // In production, these would come from the API
            setAlternates(['Nova', 'Cipher', 'Echo', 'Phoenix'])
            setLoading(false)

            // Start reveal animation after a brief delay
            setTimeout(() => setRevealed(true), 500)
        }
        checkUser()
    }, [router, supabase])

    const handleAccept = async (nameToUse: string) => {
        setSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Update soulprint with chosen name
            const { error } = await supabase
                .from('soulprints')
                .update({ companion_name: nameToUse })
                .eq('user_id', user.id)

            if (error) throw error

            // Navigate to chat
            router.push('/dashboard/chat')
        } catch (err) {
            console.error('Error saving name:', err)
            setSaving(false)
        }
    }

    const handleCustomSubmit = async () => {
        if (!customName.trim()) return
        await handleAccept(customName.trim())
    }

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 overflow-hidden">
            <div className="w-full max-w-2xl text-center">
                {/* Pre-reveal */}
                <div className={`transition-all duration-1000 ${revealed ? 'opacity-0 translate-y-[-20px] absolute' : 'opacity-100'}`}>
                    <Sparkles className="w-16 h-16 text-orange-400 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-2xl text-gray-400">Discovering your companion...</h2>
                </div>

                {/* Main Reveal */}
                <div className={`transition-all duration-1000 delay-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[40px]'}`}>
                    {!showAlternates && !customMode && (
                        <>
                            <p className="text-gray-500 text-lg mb-4 tracking-wider uppercase">
                                Meet your companion
                            </p>

                            {/* Name Display */}
                            <div className="relative mb-8">
                                {/* Glow effect */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] animate-pulse" />
                                </div>

                                <h1 className="relative font-koulen text-[80px] lg:text-[120px] leading-none text-transparent bg-clip-text bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 tracking-widest py-4">
                                    {name.toUpperCase()}
                                </h1>
                            </div>

                            {/* Archetype/Description */}
                            {archetype && (
                                <p className="text-gray-400 text-lg mb-8 italic">
                                    &quot;Your {archetype.toLowerCase()} ally&quot;
                                </p>
                            )}

                            {source === 'detected' && (
                                <p className="text-orange-400/80 text-sm mb-8">
                                    <Sparkles className="w-4 h-4 inline mr-1" />
                                    Detected from your conversations
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <Button
                                    onClick={() => handleAccept(name)}
                                    disabled={saving}
                                    className="min-w-[180px] h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-lg font-semibold rounded-xl"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5 mr-2" />
                                            Accept
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={() => setShowAlternates(true)}
                                    variant="outline"
                                    className="min-w-[180px] h-14 border-gray-600 text-gray-300 hover:bg-white/10 text-lg rounded-xl"
                                >
                                    <RefreshCw className="w-5 h-5 mr-2" />
                                    Alternatives
                                </Button>

                                <Button
                                    onClick={() => setCustomMode(true)}
                                    variant="ghost"
                                    className="min-w-[180px] h-14 text-gray-500 hover:text-gray-300 text-lg"
                                >
                                    <Edit2 className="w-5 h-5 mr-2" />
                                    Custom
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Alternates View */}
                    {showAlternates && !customMode && (
                        <>
                            <p className="text-gray-400 text-lg mb-8">
                                Choose a name for your companion
                            </p>

                            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                                {/* Original name */}
                                <button
                                    onClick={() => setSelectedName(name)}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        selectedName === name
                                            ? 'border-orange-500 bg-orange-500/20'
                                            : 'border-gray-700 hover:border-gray-600 bg-white/5'
                                    }`}
                                >
                                    <span className="text-2xl font-bold text-white">{name}</span>
                                    {source === 'detected' && (
                                        <span className="block text-xs text-orange-400 mt-1">Detected</span>
                                    )}
                                </button>

                                {/* Alternates */}
                                {alternates.map((alt) => (
                                    <button
                                        key={alt}
                                        onClick={() => setSelectedName(alt)}
                                        className={`p-4 rounded-xl border-2 transition-all ${
                                            selectedName === alt
                                                ? 'border-orange-500 bg-orange-500/20'
                                                : 'border-gray-700 hover:border-gray-600 bg-white/5'
                                        }`}
                                    >
                                        <span className="text-2xl font-bold text-white">{alt}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4 justify-center">
                                <Button
                                    onClick={() => selectedName && handleAccept(selectedName)}
                                    disabled={!selectedName || saving}
                                    className="min-w-[180px] h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold rounded-xl disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Confirm'
                                    )}
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowAlternates(false)
                                        setSelectedName(null)
                                    }}
                                    variant="ghost"
                                    className="text-gray-500"
                                >
                                    Back
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Custom Name Mode */}
                    {customMode && (
                        <>
                            <p className="text-gray-400 text-lg mb-8">
                                Enter a custom name for your companion
                            </p>

                            <div className="max-w-sm mx-auto mb-8">
                                <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value.slice(0, 16))}
                                    placeholder="Enter name..."
                                    className="w-full h-16 bg-white/5 border-2 border-gray-700 rounded-xl px-6 text-2xl text-white text-center font-bold focus:border-orange-500 focus:outline-none transition-colors"
                                    autoFocus
                                    maxLength={16}
                                />
                                <p className="text-gray-600 text-sm mt-2">
                                    {customName.length}/16 characters
                                </p>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <Button
                                    onClick={handleCustomSubmit}
                                    disabled={!customName.trim() || saving}
                                    className="min-w-[180px] h-12 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold rounded-xl disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Confirm'
                                    )}
                                </Button>
                                <Button
                                    onClick={() => {
                                        setCustomMode(false)
                                        setCustomName('')
                                    }}
                                    variant="ghost"
                                    className="text-gray-500"
                                >
                                    Back
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function NameRevealPage() {
    return (
        <Suspense fallback={
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        }>
            <NameRevealContent />
        </Suspense>
    )
}
