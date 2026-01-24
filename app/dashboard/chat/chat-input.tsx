import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Paperclip, AudioLines } from "lucide-react"

interface ChatInputProps {
    onSend: (message: string) => void
    disabled?: boolean
    placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = "Type a message..." }: ChatInputProps) {
    const [input, setInput] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    function handleSend() {
        if (!input.trim() || disabled) return
        onSend(input)
        setInput("")

        // Reset height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
        }
    }

    function autoResizeTextarea(el: HTMLTextAreaElement) {
        el.style.height = "auto"
        const next = Math.min(el.scrollHeight, 220)
        el.style.height = `${next}px`
    }

    // Auto-focus on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            textareaRef.current?.focus()
        }, 100)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="flex items-center gap-2 border border-zinc-300 rounded-xl p-2 sm:p-3 bg-zinc-50 transition-colors focus-within:border-[color:var(--sp-primary)] focus-within:ring-1 focus-within:ring-[color:var(--sp-primary)]">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => alert("File attachments coming soon!")}
                className="h-10 w-10 sm:h-8 sm:w-8 text-neutral-500 hover:text-neutral-700 shrink-0"
                title="Attach file (Coming Soon)"
            >
                <Paperclip className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
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
                placeholder={placeholder}
                className="flex-1 bg-transparent text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none min-h-[56px] sm:min-h-[48px] resize-none leading-relaxed overflow-hidden"
                rows={1}
                disabled={disabled}
            />
            <Button
                variant="ghost"
                size="icon"
                onClick={() => alert("Voice input coming soon!")}
                className="h-10 w-10 sm:h-8 sm:w-8 text-neutral-500 hover:text-neutral-700 shrink-0"
                title="Voice input (Coming Soon)"
            >
                <AudioLines className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
            <Button
                size="icon"
                onClick={handleSend}
                disabled={disabled || !input.trim()}
                className="bg-[color:var(--sp-primary)] hover:bg-[color:var(--sp-primary-dark)] h-10 w-10 sm:h-8 sm:w-8 rounded-lg shrink-0 transition-opacity disabled:opacity-50"
            >
                <Send className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
        </div>
    )
}
