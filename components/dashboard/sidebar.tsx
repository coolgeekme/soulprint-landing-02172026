"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    SquareTerminal,
    Home,
    Key,
    Settings2,
    User,
    HelpCircle,
    Fingerprint,
    BarChart3,
    GitCompareArrows,
    LucideIcon
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarItem {
    icon: LucideIcon
    label: string
    href: string
}

const sidebarItems: SidebarItem[] = [
    { icon: Home, label: "Home", href: "/dashboard/chat" },
    { icon: SquareTerminal, label: "Questionnaire", href: "/questionnaire" },
    { icon: Fingerprint, label: "My SoulPrint", href: "/dashboard/profile" },
    { icon: BarChart3, label: "Insights", href: "/dashboard/insights" },
    { icon: GitCompareArrows, label: "Compare", href: "/dashboard/compare" },
    { icon: Key, label: "API Keys", href: "/dashboard/bot" },
    { icon: Settings2, label: "Settings", href: "/dashboard/settings" },
]

interface SidebarProps {
    hasSoulprint: boolean
}

export function Sidebar({ hasSoulprint }: SidebarProps) {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)

    // Only render icons after mount to prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    // Filter items based on hasSoulprint - do this consistently
    const visibleItems = hasSoulprint 
        ? sidebarItems 
        : sidebarItems.filter(item => item.label === "Questionnaire" || item.label === "Home")

    return (
        <div className="flex h-screen w-14 flex-col items-center justify-between border-r border-[#222] bg-[#111111] py-2">
            {/* Logo Section */}
            <div className="flex h-[52px] w-full items-center justify-center border-b border-[#222]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/images/vector-personalized.png"
                    alt="SoulPrint"
                    className="h-8 w-8 object-contain"
                />
            </div>

            {/* Main Nav */}
            <nav className="flex flex-1 flex-col items-center gap-1 py-2">
                {visibleItems.map((item) => {
                    const Icon = item.icon
                    
                    // Check if this nav item is active
                    const isActive = pathname === item.href ||
                        (item.href === "/dashboard/chat" && pathname === "/dashboard") ||
                        (item.label === "Home" && pathname.startsWith("/dashboard/chat")) ||
                        (item.label === "Questionnaire" && pathname.startsWith("/questionnaire"))

                    return (
                        <Link
                            key={item.label}
                            href={item.label === "Questionnaire" ? "/questionnaire/new" : item.href}
                            className={cn(
                                "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                                isActive
                                    ? "bg-[#E8632B] text-white"
                                    : "text-[#e5e5e5] hover:bg-white/5"
                            )}
                            title={item.label}
                        >
                            {mounted ? <Icon className="h-5 w-5" /> : <div className="h-5 w-5" />}
                            <span className="sr-only">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Nav */}
            <div className="flex flex-col items-center gap-1 py-2">
                <a
                    href="mailto:support@soulprint.ai?subject=SoulPrint%20Support%20Request"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#e5e5e5] transition-colors hover:bg-white/5"
                    title="Get Help"
                >
                    {mounted ? <HelpCircle className="h-5 w-5" /> : <div className="h-5 w-5" />}
                </a>
                <Link
                    href="/dashboard/settings"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#e5e5e5] transition-colors hover:bg-white/5"
                    title="Settings & Account"
                >
                    {mounted ? <User className="h-5 w-5" /> : <div className="h-5 w-5" />}
                </Link>
            </div>
        </div>
    )
}
