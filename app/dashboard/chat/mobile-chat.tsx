"use client"

import { useState, useEffect, useCallback } from "react"
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    ConversationHeader,
    Avatar,
    TypingIndicator
} from "@chatscope/chat-ui-kit-react"
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css"
import { MessageSquare, Menu, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { listApiKeys } from "@/app/actions/api-keys"
import { getChatHistory, saveChatMessage, clearChatHistory, getChatSessions, type ChatSession } from "@/app/actions/chat-history"
import { createClient } from "@/lib/supabase/client"
import "./chatscope-overrides.css"

interface ChatMessage {
    role: "user" | "assistant" | "system"
    content: string
}

export function MobileChat({ initialSoulprintId }: { initialSoulprintId: string | null }) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [initializing, setInitializing] = useState(true)
    const [displayName, setDisplayName] = useState("SoulPrint")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const [selectedSoulprintId] = useState<string | null>(initialSoulprintId)

    // Initialize
    useEffect(() => {
        async function init() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) return

                // Get API key
                const result = await listApiKeys()
                if (result.keys) {
                    const activeKey = result.keys.find(k => k.status === "active")
                    if (activeKey?.raw_key) {
                        setApiKey(activeKey.raw_key)
                    }
                }

                // Get soulprint name
                if (selectedSoulprintId) {
                    const { data: soulprint } = await supabase
                        .from('soulprints')
                        .select('soulprint_data')
                        .eq('id', selectedSoulprintId)
                        .single()
                    
                    if (soulprint?.soulprint_data) {
                        const name = (soulprint.soulprint_data as { display_name?: string }).display_name
                        if (name) setDisplayName(name)
                    }
                }

                // Get sessions
                const sessionsData = await getChatSessions()
                setSessions(sessionsData)

            } catch (err) {
                console.error("Init error:", err)
            } finally {
                setInitializing(false)
            }
        }
        init()
    }, [selectedSoulprintId])

    // Load session messages
    useEffect(() => {
        async function loadSession() {
            if (!currentSessionId) {
                setMessages([])
                return
            }
            const history = await getChatHistory(currentSessionId)
            setMessages(history)
        }
        loadSession()
    }, [currentSessionId])

    const handleSend = useCallback(async (text: string) => {
        if (!text.trim() || loading || !apiKey) return

        const userMessage = text.trim()
        setMessages(prev => [...prev, { role: "user", content: userMessage }])
        setLoading(true)

        // Generate session ID if needed
        const sessionId = currentSessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        if (!currentSessionId) setCurrentSessionId(sessionId)

        try {
            // Save user message
            await saveChatMessage({
                session_id: sessionId,
                role: "user",
                content: userMessage
            })

            // Call API
            const res = await fetch("/api/llm/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    stream: true,
                    soulprint_id: selectedSoulprintId,
                    session_id: sessionId,
                    messages: [
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: "user", content: userMessage }
                    ]
                })
            })

            if (!res.ok) throw new Error("API error")

            // Stream response
            const reader = res.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ""

            setMessages(prev => [...prev, { role: "assistant", content: "" }])

            while (reader) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split("\n")

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = line.slice(6)
                        if (data === "[DONE]") continue
                        try {
                            const parsed = JSON.parse(data)
                            const delta = parsed.choices?.[0]?.delta?.content
                            if (delta) {
                                assistantContent += delta
                                setMessages(prev => {
                                    const updated = [...prev]
                                    updated[updated.length - 1] = { role: "assistant", content: assistantContent }
                                    return updated
                                })
                            }
                        } catch {}
                    }
                }
            }

            // Save assistant message
            if (assistantContent) {
                await saveChatMessage({
                    session_id: sessionId,
                    role: "assistant",
                    content: assistantContent
                })
            }

        } catch (err) {
            console.error("Send error:", err)
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }])
        } finally {
            setLoading(false)
        }
    }, [apiKey, currentSessionId, loading, messages, selectedSoulprintId])

    const handleNewChat = () => {
        setCurrentSessionId(null)
        setMessages([])
        setSidebarOpen(false)
        setMenuOpen(false)
    }

    const handleClear = async () => {
        if (!currentSessionId) return
        await clearChatHistory(currentSessionId)
        setMessages([])
        setMenuOpen(false)
    }

    if (initializing) {
        return (
            <div className="flex h-full items-center justify-center bg-black">
                <div className="flex items-center gap-2 text-zinc-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    <span>Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full relative" style={{ background: "#0a0a0a" }}>
            {/* Menu Dropdown */}
            {menuOpen && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-3 top-14 z-50 w-48 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl py-1">
                        <button
                            onClick={handleNewChat}
                            className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4 text-orange-500" />
                            New Chat
                        </button>
                        {messages.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-3"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Chat
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Sidebar */}
            {sidebarOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-50 bg-black/60" 
                        onClick={() => setSidebarOpen(false)} 
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <span className="font-medium text-white">Conversations</span>
                            <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-zinc-800 rounded">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <div className="p-3">
                            <button
                                onClick={handleNewChat}
                                className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                New Chat
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {sessions.length === 0 ? (
                                <p className="text-center text-zinc-500 text-sm py-8">No conversations yet</p>
                            ) : (
                                sessions.map(session => (
                                    <button
                                        key={session.session_id}
                                        onClick={() => {
                                            setCurrentSessionId(session.session_id)
                                            setSidebarOpen(false)
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2.5 rounded-lg text-left text-sm truncate transition-colors",
                                            currentSessionId === session.session_id
                                                ? "bg-orange-600/20 text-orange-400"
                                                : "text-zinc-300 hover:bg-zinc-800"
                                        )}
                                    >
                                        {session.last_message?.slice(0, 30) || "New conversation"}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Main Chat - Chatscope */}
            <MainContainer style={{ border: "none", background: "#0a0a0a" }}>
                <ChatContainer style={{ background: "#0a0a0a" }}>
                    <ConversationHeader style={{ background: "#111", borderBottom: "1px solid #222" }}>
                        <ConversationHeader.Back />
                        <Avatar 
                            src="/images/soulprintlogomain.png" 
                            name={displayName}
                            style={{ background: "#e2500c" }}
                        />
                        <ConversationHeader.Content 
                            userName={displayName}
                            info="Online"
                        />
                        <ConversationHeader.Actions>
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 hover:bg-zinc-800 rounded-full mr-1"
                            >
                                <MessageSquare className="w-5 h-5 text-zinc-300" />
                            </button>
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-2 hover:bg-zinc-800 rounded-full"
                            >
                                <Menu className="w-5 h-5 text-zinc-300" />
                            </button>
                        </ConversationHeader.Actions>
                    </ConversationHeader>
                    
                    <MessageList
                        style={{ background: "#0a0a0a" }}
                        typingIndicator={loading ? <TypingIndicator content={`${displayName} is typing`} /> : null}
                    >
                        {messages.length === 0 ? (
                            <MessageList.Content style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100%",
                                textAlign: "center",
                                padding: "2rem"
                            }}>
                                <h2 style={{ color: "#fff", fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                                    Hey there 👋
                                </h2>
                                <p style={{ color: "#71717a" }}>What&apos;s on your mind?</p>
                            </MessageList.Content>
                        ) : (
                            messages.filter(m => m.role !== "system").map((msg, i) => (
                                <Message
                                    key={i}
                                    model={{
                                        message: msg.content || "...",
                                        sentTime: "now",
                                        sender: msg.role === "user" ? "You" : displayName,
                                        direction: msg.role === "user" ? "outgoing" : "incoming",
                                        position: "single"
                                    }}
                                />
                            ))
                        )}
                    </MessageList>
                    
                    <MessageInput 
                        placeholder="Type message here..."
                        onSend={handleSend}
                        attachButton={false}
                        style={{ background: "#111", borderTop: "1px solid #222" }}
                    />
                </ChatContainer>
            </MainContainer>
        </div>
    )
}
