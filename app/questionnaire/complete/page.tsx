"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import Image from "next/image"

export default function QuestionnaireCompletePage() {
    const router = useRouter()
    const supabase = createClient()
    const hasStarted = useRef(false) // Prevent double-fire in Strict Mode

    const [status, setStatus] = useState("Generating your SoulPrint...")
    const [isGenerating, setIsGenerating] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!hasStarted.current) {
            hasStarted.current = true
            generateSoulPrint()
        }
    }, [])

    const generateSoulPrint = async () => {
        try {
            // Get user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            // Get saved answers
            const savedAnswers = localStorage.getItem("soulprint_answers")
            if (!savedAnswers) {
                setError("No answers found. Please complete the questionnaire.")
                setIsGenerating(false)
                return
            }

            const answers = JSON.parse(savedAnswers)
            setStatus("Processing your responses...")

            // Layer 2 Safety: Final check before API call
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                console.log('🛡️ Layer 2: Final self-healing for profile on completion page');
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email!,
                    full_name: user.user_metadata?.full_name || '',
                    avatar_url: user.user_metadata?.avatar_url || ''
                });
            }

            // Call the API to generate SoulPrint
            const response = await fetch('/api/soulprint/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answers }),
            })

            if (!response.ok) {
                throw new Error('Failed to generate SoulPrint')
            }

            setStatus("Finalizing your SoulPrint...")

            // Clear local storage
            localStorage.removeItem("soulprint_answers")
            localStorage.removeItem("soulprint_current_index")

            setStatus("SoulPrint created successfully!")
            setIsGenerating(false)

            // Redirect to chat after a short delay
            setTimeout(() => {
                router.push('/dashboard/chat')
            }, 2000)

        } catch (err) {
            console.error('Error generating SoulPrint:', err)
            setError("Failed to generate SoulPrint. Please try again.")
            setIsGenerating(false)
        }
    }

    const handleRetry = () => {
        setError(null)
        setIsGenerating(true)
        generateSoulPrint()
    }

    const handleGoToChat = () => {
        router.push('/dashboard/chat')
    }

    return (
        <div className="flex h-screen bg-[#d4d4d8]">
            {/* Sidebar */}
            <div className="flex h-full w-14 flex-col items-center justify-between border-r border-[#111] bg-[#111] py-2">
                <div className="h-[52px] w-full" />
                <div className="flex flex-1 flex-col items-center gap-1 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-600">
                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
                <div className="py-2" />
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
                {/* Top Bar */}
                <header className="flex h-[52px] items-center justify-between border-b border-[#111] bg-[#111] px-4">
                    <div className="flex items-center gap-2">
                        <Image
                            src="/images/Soulprintengine-logo.png"
                            alt="SoulPrint"
                            width={28}
                            height={28}
                            className="object-contain"
                        />
                        <span className="font-koulen text-[22px] leading-[26px] text-white tracking-wide">
                            SOULPRINT
                        </span>
                        <span className="font-cinzel font-normal text-[20px] leading-[26px] tracking-[1px] uppercase text-white -ml-1">
                            ENGINE
                        </span>
                    </div>
                    <Button className="h-9 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600">
                        Log out
                    </Button>
                </header>

                {/* Content Area */}
                <main className="flex flex-1 items-center justify-center p-4">
                    <div className="flex flex-col items-center justify-center rounded-xl bg-[#FAFAFA] p-12 shadow-[0px_4px_4px_2px_rgba(0,0,0,0.25)] max-w-lg w-full">
                        {/* Logo */}
                        <div className="mb-8">
                            <Image
                                src="/images/Soulprintengine-logo.png"
                                alt="SoulPrint Logo"
                                width={120}
                                height={120}
                                className="object-contain"
                            />
                        </div>

                        {isGenerating ? (
                            <>
                                <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-6" />
                                <h2 className="font-koulen text-2xl text-black mb-2">
                                    {status}
                                </h2>
                                <p className="font-inter text-sm text-gray-500 text-center">
                                    This may take a moment as we analyze your responses.
                                </p>
                            </>
                        ) : error ? (
                            <>
                                <h2 className="font-koulen text-2xl text-red-600 mb-4">
                                    {error}
                                </h2>
                                <Button
                                    onClick={handleRetry}
                                    className="h-10 rounded-lg bg-[#EA580C] px-6 py-2 text-sm font-medium text-white hover:bg-orange-700"
                                >
                                    Try Again
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="font-koulen text-2xl text-black mb-2">
                                    {status}
                                </h2>
                                <p className="font-inter text-sm text-gray-500 text-center mb-6">
                                    Redirecting you to chat...
                                </p>
                                <Button
                                    onClick={handleGoToChat}
                                    className="h-10 rounded-lg bg-[#EA580C] px-6 py-2 text-sm font-medium text-white hover:bg-orange-700"
                                >
                                    Go to Chat Now
                                </Button>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    )
}
