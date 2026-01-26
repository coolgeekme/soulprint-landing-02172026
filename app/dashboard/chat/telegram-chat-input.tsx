"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Mic, MicOff, Smile } from "lucide-react"
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition"
import { cn } from "@/lib/utils"

interface TelegramChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
    placeholder?: string
}

export function TelegramChatInput({
    onSend,
    disabled,
    placeholder = "Message"
}: TelegramChatInputProps) {
    const [input, setInput] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const {
        isListening,
        transcript,
        interimTranscript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition()

    // Update input when transcript changes
    useEffect(() => {
        if (transcript) {
            setInput(prev => {
                if (prev && !prev.endsWith(" ")) {
                    return prev + " " + transcript
                }
                return prev + transcript
            })
            resetTranscript()
        }
    }, [transcript, resetTranscript])

    function handleSend() {
        if (!input.trim() || disabled) return
        onSend(input)
        setInput("")
        resetTranscript()

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }
    }

    function autoResizeTextarea(el: HTMLTextAreaElement) {
        el.style.height = "auto"
        const next = Math.min(el.scrollHeight, 150)
        el.style.height = `${next}px`
    }

    function handleVoiceClick() {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
    }

    // Auto-focus on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            textareaRef.current?.focus()
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    const displayPlaceholder = isListening
        ? interimTranscript || "Listening..."
        : placeholder

    const hasText = input.trim().length > 0

    return (
        <div className="flex flex-col">
            {/* Error message */}
            {error && (
                <div className="text-xs text-red-500 px-4 py-1">
                    {error}
                </div>
            )}

            {/* Recording indicator */}
            {isListening && (
                <div className="flex items-center justify-center gap-2 py-2 text-xs text-red-500 bg-red-500/5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Recording... Tap mic to stop
                </div>
            )}

            {/* Input area - Telegram style */}
            <div className={cn(
                "flex items-end gap-1 p-2 bg-zinc-900 border-t border-zinc-800",
                isListening && "border-t-red-500/50"
            )}>
                {/* Attachment button */}
                <button
                    type="button"
                    onClick={() => alert("File attachments coming soon!")}
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                    title="Attach file"
                >
                    <Paperclip className="w-5 h-5" />
                </button>

                {/* Text input container */}
                <div className={cn(
                    "flex-1 flex items-end gap-1 bg-zinc-800 rounded-2xl px-3 py-1.5 min-h-[40px] transition-all",
                    isListening && "ring-2 ring-red-500/50"
                )}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && !disabled) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                        onInput={(e) => autoResizeTextarea(e.currentTarget)}
                        placeholder={displayPlaceholder}
                        className={cn(
                            "flex-1 bg-transparent text-zinc-100 text-[15px] focus:outline-none resize-none leading-[1.35] min-h-[24px] max-h-[150px] py-1",
                            isListening ? "placeholder:text-red-400" : "placeholder:text-zinc-500"
                        )}
                        rows={1}
                        disabled={disabled}
                    />

                    {/* Emoji button (placeholder) */}
                    <button
                        type="button"
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Emoji"
                    >
                        <Smile className="w-5 h-5" />
                    </button>
                </div>

                {/* Send or Voice button */}
                {hasText ? (
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={disabled}
                        className={cn(
                            "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all",
                            "bg-[#e2500c] hover:bg-[#ff6622] text-white",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        title="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                ) : isSupported ? (
                    <button
                        type="button"
                        onClick={handleVoiceClick}
                        disabled={disabled}
                        className={cn(
                            "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all",
                            isListening
                                ? "bg-red-500 text-white animate-pulse"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                        title={isListening ? "Stop recording" : "Voice message"}
                    >
                        {isListening ? (
                            <MicOff className="w-5 h-5" />
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-zinc-600 cursor-not-allowed"
                        title="Voice not supported"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    )
}
