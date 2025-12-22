"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ProgressStepper, PILLARS } from "@/components/dashboard/progress-stepper"
import { questions, Question } from "@/lib/questions"
import { createClient } from "@/lib/supabase/client"
import { VoiceRecorderV3 } from "@/components/voice-recorder/VoiceRecorderV3"
import Image from "next/image"

export default function NewQuestionnairePage() {
    const router = useRouter()
    const supabase = createClient()
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, string | number | object>>({})
    const [textInput, setTextInput] = useState("")
    const [sliderValue, setSliderValue] = useState([50])
    const [voiceRecorded, setVoiceRecorded] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const currentQuestion = questions[currentQuestionIndex]
    
    // Calculate pillar info based on question category
    const categoryToPillar: Record<string, number> = {
        communication: 1,
        emotional: 2,
        decision: 3,
        social: 4,
        cognitive: 5,
        conflict: 6
    }
    const currentPillar = currentQuestion ? categoryToPillar[currentQuestion.category] || 1 : 1
    
    // Count questions in current pillar
    const questionsInCurrentPillar = questions.filter(q => q.category === currentQuestion?.category)
    const questionInPillar = questionsInCurrentPillar.findIndex(q => q.id === currentQuestion?.id) + 1
    const totalQuestionsInPillar = questionsInCurrentPillar.length
    
    // Get pillar name
    const pillarInfo = PILLARS.find(p => p.id === currentPillar)
    const pillarName = pillarInfo?.subtitle || "Unknown"

    // Load saved answers on mount
    useEffect(() => {
        const savedAnswers = localStorage.getItem("soulprint_answers")
        const savedIndex = localStorage.getItem("soulprint_current_index")
        
        if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers))
        }
        if (savedIndex) {
            setCurrentQuestionIndex(parseInt(savedIndex))
        }
    }, [])

    // Load current question's answer when navigating
    useEffect(() => {
        const savedAnswer = answers[currentQuestion?.id]
        if (currentQuestion?.type === "slider") {
            setSliderValue([typeof savedAnswer === "number" ? savedAnswer : 50])
        } else if (currentQuestion?.type === "voice") {
            setVoiceRecorded(!!savedAnswer)
        } else {
            setTextInput(typeof savedAnswer === "string" ? savedAnswer : "")
        }
    }, [currentQuestionIndex, currentQuestion?.id, currentQuestion?.type])

    // Save answer for current question
    const saveCurrentAnswer = () => {
        // Voice questions are saved via onAnalysisComplete callback
        if (currentQuestion.type === "voice") {
            localStorage.setItem("soulprint_current_index", currentQuestionIndex.toString())
            return answers
        }
        const answer = currentQuestion.type === "slider" ? sliderValue[0] : textInput
        const newAnswers = { ...answers, [currentQuestion.id]: answer }
        setAnswers(newAnswers)
        localStorage.setItem("soulprint_answers", JSON.stringify(newAnswers))
        localStorage.setItem("soulprint_current_index", currentQuestionIndex.toString())
        return newAnswers
    }

    // Handle voice recording completion
    const handleVoiceComplete = (result: any) => {
        const newAnswers = { 
            ...answers, 
            [currentQuestion.id]: {
                transcript: result.transcript,
                emotionalSignature: result.emotionalSignature
            }
        }
        setAnswers(newAnswers)
        setVoiceRecorded(true)
        localStorage.setItem("soulprint_answers", JSON.stringify(newAnswers))
    }

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            saveCurrentAnswer()
            setCurrentQuestionIndex(currentQuestionIndex - 1)
        }
    }

    const handleNext = async () => {
        if (currentQuestion?.type === "voice" && !voiceRecorded) {
            return
        }
        const updatedAnswers = saveCurrentAnswer()
        
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1)
        } else {
            // Last question - submit
            setIsSubmitting(true)
            try {
                // Get user
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/')
                    return
                }

                // Navigate to completion page
                router.push('/questionnaire/complete')
            } catch (error) {
                console.error('Error:', error)
                setIsSubmitting(false)
            }
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        localStorage.removeItem("soulprint_answers")
        localStorage.removeItem("soulprint_current_index")
        router.push('/')
    }

    const isLastQuestion = currentQuestionIndex === questions.length - 1
    const isFirstQuestion = currentQuestionIndex === 0

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
                    <Button 
                        onClick={handleLogout}
                        className="h-9 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
                    >
                        Log out
                    </Button>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-hidden p-4">
                    <div className="flex h-full gap-4">
                        {/* Left Side - Question Area */}
                        <div className="flex flex-1 flex-col rounded-xl bg-[#FAFAFA] p-6 shadow-[0px_4px_4px_2px_rgba(0,0,0,0.25)]">
                            {/* Header */}
                            <div className="mb-6">
                                <p className="font-inter text-sm font-medium text-black opacity-80 mb-2">
                                    {pillarName} | PART {currentPillar} - Question {questionInPillar} of {totalQuestionsInPillar}
                                </p>
                                <h1 className="font-koulen text-[32px] leading-[38px] text-black tracking-wide">
                                    LET'S BUILD YOUR SOULPRINT
                                </h1>
                            </div>

                            {/* Question Card */}
                            <div className="flex-1 rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
                                {/* Question Text */}
                                <p className="font-inter text-base leading-6 text-black opacity-80 mb-6">
                                    {currentQuestion?.question}
                                </p>

                                {/* Answer Area */}
                                {currentQuestion?.type === "slider" ? (
                                    <div className="mt-8">
                                        {/* Percentage Display */}
                                        <div className="mb-4 flex justify-center">
                                            <span className="font-inter text-3xl font-semibold text-orange-600">
                                                {sliderValue[0]}%
                                            </span>
                                        </div>
                                        <Slider
                                            value={sliderValue}
                                            onValueChange={setSliderValue}
                                            max={100}
                                            min={1}
                                            step={1}
                                            className="w-full"
                                        />
                                        <div className="mt-4 flex justify-between text-sm text-gray-500">
                                            <span>{currentQuestion.leftLabel}</span>
                                            <span>{currentQuestion.rightLabel}</span>
                                        </div>
                                    </div>
                                ) : currentQuestion?.type === "voice" ? (
                                    <div className="mt-4">
                                        <p className="mb-4 text-sm text-gray-600">
                                            {currentQuestion.voicePrompt}
                                        </p>
                                        <VoiceRecorderV3
                                            onAnalysisComplete={handleVoiceComplete}
                                            onError={(err) => console.error(err)}
                                            minDuration={0}
                                            maxDuration={currentQuestion.maxDuration || 90}
                                            questionText={currentQuestion.question}
                                            autoSubmit={true}
                                            compact={true}
                                        />
                                        {voiceRecorded && (
                                            <p className="mt-4 text-sm text-green-600 flex items-center gap-2">
                                                <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                                                Voice recording saved!
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <textarea
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        placeholder={currentQuestion?.placeholder || "Type your answer..."}
                                        className="h-[200px] w-full resize-none rounded-lg border border-gray-200 bg-[#f5f5f5] p-4 font-inter text-base text-black placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div className="mt-6 flex justify-end gap-3">
                                {!isFirstQuestion && (
                                    <Button
                                        onClick={handlePrevious}
                                        variant="secondary"
                                        className="h-10 rounded-lg bg-[#f5f5f5] px-6 py-2 text-sm font-medium text-[#171717] hover:bg-gray-200"
                                    >
                                        Previous
                                    </Button>
                                )}
                                <Button
                                    onClick={handleNext}
                                    disabled={isSubmitting || (currentQuestion?.type === "voice" && !voiceRecorded)}
                                    className="h-10 rounded-lg bg-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Submitting..." : isLastQuestion ? "Finish SoulPrint" : "Next"}
                                </Button>
                            </div>
                        </div>

                        {/* Right Side - Progress Stepper */}
                        <ProgressStepper 
                            currentPart={currentPillar} 
                            currentQuestion={questionInPillar}
                            totalQuestionsInPart={totalQuestionsInPillar}
                        />
                    </div>
                </main>
            </div>
        </div>
    )
}
