"use client"

import { useState, useCallback } from "react"
import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"

interface DashboardShellProps {
    children: React.ReactNode
    hasSoulprint: boolean
}

export function DashboardShell({ children, hasSoulprint }: DashboardShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const handleMenuClick = useCallback(() => {
        setIsMobileMenuOpen(true)
    }, [])

    const handleMenuClose = useCallback(() => {
        setIsMobileMenuOpen(false)
    }, [])

    return (
        <div className="flex min-h-screen bg-[#0B0B0B] text-white">
            {/* Desktop Sidebar */}
            <Sidebar hasSoulprint={hasSoulprint} />

            {/* Mobile Sidebar Drawer */}
            <MobileSidebar
                hasSoulprint={hasSoulprint}
                isOpen={isMobileMenuOpen}
                onClose={handleMenuClose}
            />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar onMenuClick={handleMenuClick} />
                <main className="flex-1 overflow-hidden bg-gradient-to-br from-[#0B0B0B] via-[#0E0E0E] to-[#101010] p-3 sm:p-5 lg:p-8">
                    <div className="h-full w-full rounded-2xl border border-white/10 bg-white/5 shadow-[0px_12px_40px_rgba(0,0,0,0.35)]">
                        <div className="h-full w-full p-2 sm:p-4 lg:p-6">
                            <div className="h-full w-full max-w-[1400px] mx-auto">
                                {children}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
