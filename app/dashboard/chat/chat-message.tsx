import { memo } from "react"
import { Bot, User } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
}

interface ChatMessageProps {
    message: Message
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
    return (
        <div className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
            {message.role === "assistant" && (
                <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--sp-accent)", color: "var(--sp-primary)" }}
                >
                    <Bot className="h-4 w-4" />
                </div>
            )}
            <div className={cn(
                "max-w-[85%] rounded-xl p-4 text-sm leading-relaxed",
                message.role === "user"
                    ? "bg-[color:var(--sp-primary)] text-white"
                    : "bg-white border border-zinc-200 text-zinc-900"
            )}>
                {message.role === "assistant" ? (
                    <div className="prose prose-sm prose-zinc max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
                                h2: ({ children }) => <h2 className="text-base font-bold text-zinc-900 mt-4 mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold text-zinc-900 mt-3 mb-1">{children}</h3>,
                                strong: ({ children }) => <span className="font-bold text-[color:var(--sp-primary)]">{children}</span>,
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[color:var(--sp-primary)] underline hover:opacity-80"
                                    >
                                        {children}
                                    </a>
                                )
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    message.content
                )}
            </div>
            {message.role === "user" && (
                <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: "var(--sp-primary)" }}
                >
                    <User className="h-4 w-4" />
                </div>
            )}
        </div>
    )
}, (prevProps, nextProps) => {
    return prevProps.message.content === nextProps.message.content &&
        prevProps.message.role === nextProps.message.role
})
