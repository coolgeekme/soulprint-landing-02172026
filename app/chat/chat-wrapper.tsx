"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "./components/thread";
import { LogOut, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import "./liquid-glass.css";

interface ChatWrapperProps {
    userName: string;
    hasImportedData: boolean;
}

export function ChatWrapper({ userName, hasImportedData }: ChatWrapperProps) {
    const runtime = useChatRuntime();
    const router = useRouter();

    const handleSignOut = async () => {
        const { signOut } = await import("@/app/actions/auth");
        await signOut();
    };

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            <div className="chat-container">
                {/* Import prompt for users without data */}
                {!hasImportedData && (
                    <div className="fixed top-0 left-0 right-0 z-50 bg-[#EA580C]/90 text-white px-4 py-2 flex items-center justify-between text-sm">
                        <span>Import your ChatGPT history for personalized responses</span>
                        <button
                            onClick={() => router.push("/import")}
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import
                        </button>
                    </div>
                )}

                {/* User menu - top right */}
                <div className="fixed top-2 right-2 z-40 flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden sm:block">{userName}</span>
                    <button
                        onClick={handleSignOut}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>

                <Thread />
            </div>
        </AssistantRuntimeProvider>
    );
}
