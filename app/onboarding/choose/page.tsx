"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { MessageSquare, FileText, Sparkles, ArrowRight, Loader2 } from "lucide-react"

export default function OnboardingChoosePage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)

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
                // User already completed setup, redirect to chat
                router.push('/dashboard/chat')
                return
            }

            setLoading(false)
        }
        checkUser()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-koulen text-[48px] lg:text-[64px] leading-[1.1] text-white tracking-wide mb-4">
                        CREATE YOUR SOULPRINT
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Choose how you want to build your AI companion. The more data, the more personalized your experience.
                    </p>
                </div>

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* GPT Import - Recommended */}
                    <button
                        onClick={() => router.push('/onboarding/import')}
                        className="group relative p-8 rounded-2xl bg-gradient-to-br from-orange-600/20 to-orange-900/10 border-2 border-orange-500/50 hover:border-orange-400 transition-all hover:scale-[1.02] text-left"
                    >
                        {/* Recommended Badge */}
                        <div className="absolute -top-3 left-6 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            RECOMMENDED
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-orange-500/20">
                                <MessageSquare className="w-8 h-8 text-orange-400" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                    Import from ChatGPT
                                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </h2>
                                <p className="text-gray-400 mb-4">
                                    Upload your ChatGPT history and we&apos;ll extract your communication patterns, preferences, and personality to create a deeply personalized companion.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300">
                                        Voice patterns
                                    </span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300">
                                        Topic interests
                                    </span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-orange-500/20 text-orange-300">
                                        Communication style
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Questionnaire - Manual */}
                    <button
                        onClick={() => router.push('/questionnaire/intro')}
                        className="group p-8 rounded-2xl bg-gradient-to-br from-violet-600/10 to-violet-900/5 border-2 border-violet-500/30 hover:border-violet-400/50 transition-all hover:scale-[1.02] text-left"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-violet-500/20">
                                <FileText className="w-8 h-8 text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                    Answer Questions
                                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                </h2>
                                <p className="text-gray-400 mb-4">
                                    Prefer privacy or don&apos;t have ChatGPT history? Answer our guided questions to build your profile manually.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300">
                                        ~5 minutes
                                    </span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300">
                                        No data upload
                                    </span>
                                    <span className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300">
                                        Self-reported
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Skip option */}
                <div className="mt-8 text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/chat')}
                        className="text-gray-500 hover:text-gray-300"
                    >
                        Skip for now (limited experience)
                    </Button>
                </div>
            </div>
        </div>
    )
}
