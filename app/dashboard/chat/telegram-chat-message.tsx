import { memo } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from "@/lib/utils"

interface Message {
    role: "user" | "assistant"
    content: string
}

interface TelegramChatMessageProps {
    message: Message
    showAvatar?: boolean
    avatarUrl?: string
    displayName?: string
}

export const TelegramChatMessage = memo(function TelegramChatMessage({
    message,
    showAvatar = true,
    avatarUrl,
    displayName = "SoulPrint"
}: TelegramChatMessageProps) {
    const isUser = message.role === "user"

    return (
        <div className={cn(
            "flex gap-2 max-w-[90%] mb-1",
            isUser ? "ml-auto flex-row-reverse" : "mr-auto"
        )}>
            {/* Avatar - only for assistant */}
            {!isUser && showAvatar && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center self-end">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
            )}

            {/* Message bubble */}
            <div className={cn(
                "relative px-3 py-2 rounded-2xl text-[15px] leading-[1.35] break-words",
                isUser
                    ? "bg-[#e2500c] text-white rounded-br-md"
                    : "bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-bl-md shadow-sm",
                // Telegram-style bubble tail
                isUser
                    ? "before:content-[''] before:absolute before:bottom-0 before:right-[-6px] before:w-3 before:h-3 before:bg-[#e2500c] before:rounded-bl-[16px] after:content-[''] after:absolute after:bottom-0 after:right-[-10px] after:w-[10px] after:h-3 after:bg-zinc-950 after:rounded-bl-[10px]"
                    : "before:content-[''] before:absolute before:bottom-0 before:left-[-6px] before:w-3 before:h-3 before:bg-white dark:before:bg-[#212121] before:rounded-br-[16px] after:content-[''] after:absolute after:bottom-0 after:left-[-10px] after:w-[10px] after:h-3 after:bg-zinc-950 after:rounded-br-[10px]"
            )}>
                {/* Assistant name label */}
                {!isUser && (
                    <div className="text-xs font-semibold text-orange-500 mb-0.5">
                        {displayName}
                    </div>
                )}

                {/* Message content */}
                {isUser ? (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>*:last-child]:mb-0">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                                li: ({ children }) => <li className="text-[15px]">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-orange-500">{children}</strong>,
                                code: ({ children, className }) => {
                                    const isBlock = className?.includes('language-')
                                    return isBlock ? (
                                        <code className="block bg-zinc-800 rounded-lg p-2 my-2 text-xs overflow-x-auto">
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">{children}</code>
                                    )
                                },
                                a: ({ href, children }) => (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-orange-500 underline hover:text-orange-400"
                                    >
                                        {children}
                                    </a>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className="border-l-2 border-orange-500 pl-2 italic opacity-80">
                                        {children}
                                    </blockquote>
                                )
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Timestamp (optional - can add later) */}
                {/* <span className={cn(
                    "text-[11px] float-right mt-1 ml-2",
                    isUser ? "text-white/70" : "text-zinc-500"
                )}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span> */}
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    return prevProps.message.content === nextProps.message.content &&
        prevProps.message.role === nextProps.message.role
})
