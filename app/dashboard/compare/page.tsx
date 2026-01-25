"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Brain, Heart, Scale, Users, Cpu, Shield, ChevronDown, Loader2, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SoulPrintData, SoulPrintPillar } from "@/lib/soulprint/types"
import { cn } from "@/lib/utils"

interface SoulPrintOption {
    id: string
    name: string
    archetype: string
}

const pillarIcons: Record<string, React.ReactNode> = {
    communication_style: <Brain className="w-5 h-5" />,
    emotional_alignment: <Heart className="w-5 h-5" />,
    decision_making: <Scale className="w-5 h-5" />,
    social_cultural: <Users className="w-5 h-5" />,
    cognitive_processing: <Cpu className="w-5 h-5" />,
    assertiveness_conflict: <Shield className="w-5 h-5" />,
}

const pillarLabels: Record<string, string> = {
    communication_style: "Communication",
    emotional_alignment: "Emotional",
    decision_making: "Decision Making",
    social_cultural: "Social",
    cognitive_processing: "Cognitive",
    assertiveness_conflict: "Assertiveness",
}

// Generate a simple compatibility insight based on markers
function generateInsight(pillarA: SoulPrintPillar, pillarB: SoulPrintPillar, pillarName: string): string {
    const markersA = pillarA.markers || []
    const markersB = pillarB.markers || []

    // Find common markers
    const common = markersA.filter(m =>
        markersB.some(mb => mb.toLowerCase().includes(m.toLowerCase().split(' ')[0]))
    )

    if (common.length > 0) {
        return `Both share ${common[0].toLowerCase()} tendencies`
    }

    // Default contrasting insight
    const insights: Record<string, string> = {
        communication_style: "Different communication approaches can complement each other",
        emotional_alignment: "Varied emotional styles bring balance to interactions",
        decision_making: "Contrasting decision styles offer diverse perspectives",
        social_cultural: "Different social orientations expand shared experiences",
        cognitive_processing: "Varied thinking styles enhance problem-solving together",
        assertiveness_conflict: "Different conflict styles require mutual understanding",
    }

    return insights[pillarName] || "Unique perspectives create opportunities for growth"
}

export default function ComparePage() {
    const [options, setOptions] = useState<SoulPrintOption[]>([])
    const [loading, setLoading] = useState(true)
    const [comparing, setComparing] = useState(false)

    const [selectedA, setSelectedA] = useState<string | null>(null)
    const [selectedB, setSelectedB] = useState<string | null>(null)
    const [dropdownA, setDropdownA] = useState(false)
    const [dropdownB, setDropdownB] = useState(false)

    const [soulprintA, setSoulprintA] = useState<SoulPrintData | null>(null)
    const [soulprintB, setSoulprintB] = useState<SoulPrintData | null>(null)

    const supabase = createClient()

    useEffect(() => {
        async function loadOptions() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get user's own soulprints
            const { data: own } = await supabase
                .from('soulprints')
                .select('id, soulprint_data')
                .eq('user_id', user.id)

            // Get public soulprints (not owned by user)
            const { data: publicSp } = await supabase
                .from('soulprints')
                .select('id, soulprint_data')
                .eq('is_public', true)
                .neq('user_id', user.id)
                .limit(10)

            const allOptions: SoulPrintOption[] = []

            if (own) {
                own.forEach(sp => {
                    const data = sp.soulprint_data as SoulPrintData
                    allOptions.push({
                        id: sp.id,
                        name: data.name || 'My SoulPrint',
                        archetype: data.archetype || 'Unknown'
                    })
                })
            }

            if (publicSp) {
                publicSp.forEach(sp => {
                    const data = sp.soulprint_data as SoulPrintData
                    allOptions.push({
                        id: sp.id,
                        name: data.name || 'Public SoulPrint',
                        archetype: data.archetype || 'Unknown'
                    })
                })
            }

            setOptions(allOptions)
            setLoading(false)
        }

        loadOptions()
    }, [supabase])

    async function handleCompare() {
        if (!selectedA || !selectedB) return
        setComparing(true)

        const [resA, resB] = await Promise.all([
            supabase.from('soulprints').select('soulprint_data').eq('id', selectedA).single(),
            supabase.from('soulprints').select('soulprint_data').eq('id', selectedB).single()
        ])

        if (resA.data) setSoulprintA(resA.data.soulprint_data as SoulPrintData)
        if (resB.data) setSoulprintB(resB.data.soulprint_data as SoulPrintData)

        setComparing(false)
    }

    const optionA = options.find(o => o.id === selectedA)
    const optionB = options.find(o => o.id === selectedB)

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto pb-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-koulen text-white mb-2">Compare SoulPrints</h1>
                    <p className="text-gray-400">See how different personalities align and contrast</p>
                </motion.div>

                {/* Selection Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center mb-8"
                >
                    {/* Selector A */}
                    <div className="relative">
                        <button
                            onClick={() => { setDropdownA(!dropdownA); setDropdownB(false) }}
                            className="w-full p-4 bg-[#111] border border-[#333] rounded-xl text-left hover:border-orange-500/50 transition-colors"
                        >
                            <div className="text-xs text-gray-500 uppercase mb-1">First SoulPrint</div>
                            <div className="flex items-center justify-between">
                                <span className="text-white font-medium">
                                    {optionA ? optionA.name : "Select..."}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", dropdownA && "rotate-180")} />
                            </div>
                            {optionA && (
                                <div className="text-xs text-orange-500 mt-1">{optionA.archetype}</div>
                            )}
                        </button>

                        <AnimatePresence>
                            {dropdownA && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#333] rounded-xl overflow-hidden z-20 shadow-xl"
                                >
                                    {options.filter(o => o.id !== selectedB).map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setSelectedA(opt.id); setDropdownA(false); setSoulprintA(null) }}
                                            className={cn(
                                                "w-full p-3 text-left hover:bg-[#1a1a1a] transition-colors border-b border-[#222] last:border-0",
                                                selectedA === opt.id && "bg-orange-500/10"
                                            )}
                                        >
                                            <div className="text-white text-sm">{opt.name}</div>
                                            <div className="text-xs text-gray-500">{opt.archetype}</div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-orange-500" />
                        </div>
                        <span className="text-xs text-gray-500 uppercase">vs</span>
                    </div>

                    {/* Selector B */}
                    <div className="relative">
                        <button
                            onClick={() => { setDropdownB(!dropdownB); setDropdownA(false) }}
                            className="w-full p-4 bg-[#111] border border-[#333] rounded-xl text-left hover:border-orange-500/50 transition-colors"
                        >
                            <div className="text-xs text-gray-500 uppercase mb-1">Second SoulPrint</div>
                            <div className="flex items-center justify-between">
                                <span className="text-white font-medium">
                                    {optionB ? optionB.name : "Select..."}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", dropdownB && "rotate-180")} />
                            </div>
                            {optionB && (
                                <div className="text-xs text-orange-500 mt-1">{optionB.archetype}</div>
                            )}
                        </button>

                        <AnimatePresence>
                            {dropdownB && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#333] rounded-xl overflow-hidden z-20 shadow-xl"
                                >
                                    {options.filter(o => o.id !== selectedA).map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setSelectedB(opt.id); setDropdownB(false); setSoulprintB(null) }}
                                            className={cn(
                                                "w-full p-3 text-left hover:bg-[#1a1a1a] transition-colors border-b border-[#222] last:border-0",
                                                selectedB === opt.id && "bg-orange-500/10"
                                            )}
                                        >
                                            <div className="text-white text-sm">{opt.name}</div>
                                            <div className="text-xs text-gray-500">{opt.archetype}</div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Compare Button */}
                {selectedA && selectedB && !soulprintA && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center mb-8"
                    >
                        <Button
                            onClick={handleCompare}
                            disabled={comparing}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-8"
                        >
                            {comparing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <ArrowRight className="h-4 w-4 mr-2" />
                            )}
                            Compare Now
                        </Button>
                    </motion.div>
                )}

                {/* Comparison Results */}
                <AnimatePresence>
                    {soulprintA && soulprintB && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Archetype Comparison */}
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                <div className="bg-[#111] border border-[#333] rounded-xl p-6 text-center">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mb-4">
                                        <span className="text-2xl font-bold text-white">
                                            {soulprintA.archetype?.[0] || 'A'}
                                        </span>
                                    </div>
                                    <div className="text-xl font-bold text-white">{soulprintA.archetype}</div>
                                    <div className="text-sm text-gray-400 mt-2 line-clamp-2">
                                        {soulprintA.identity_signature}
                                    </div>
                                </div>

                                <div className="text-2xl text-gray-600 font-light">vs</div>

                                <div className="bg-[#111] border border-[#333] rounded-xl p-6 text-center">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4">
                                        <span className="text-2xl font-bold text-white">
                                            {soulprintB.archetype?.[0] || 'B'}
                                        </span>
                                    </div>
                                    <div className="text-xl font-bold text-white">{soulprintB.archetype}</div>
                                    <div className="text-sm text-gray-400 mt-2 line-clamp-2">
                                        {soulprintB.identity_signature}
                                    </div>
                                </div>
                            </div>

                            {/* Pillar Comparisons */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <span className="w-8 h-0.5 bg-orange-500"></span>
                                    Pillar Comparison
                                </h2>

                                {Object.keys(pillarLabels).map((pillarKey, index) => {
                                    const pillarA = soulprintA.pillars?.[pillarKey as keyof typeof soulprintA.pillars]
                                    const pillarB = soulprintB.pillars?.[pillarKey as keyof typeof soulprintB.pillars]

                                    if (!pillarA || !pillarB) return null

                                    return (
                                        <motion.div
                                            key={pillarKey}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-[#111] border border-[#333] rounded-xl p-4"
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center text-orange-500">
                                                    {pillarIcons[pillarKey]}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{pillarLabels[pillarKey]}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {generateInsight(pillarA, pillarB, pillarKey)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                    <div className="text-xs text-orange-500 mb-1 uppercase">
                                                        {soulprintA.archetype?.split(' ')[0]}
                                                    </div>
                                                    <p className="text-sm text-gray-300 line-clamp-3">
                                                        {pillarA.summary}
                                                    </p>
                                                    {pillarA.markers && pillarA.markers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {pillarA.markers.slice(0, 2).map((m, i) => (
                                                                <span key={i} className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-[#0a0a0a] rounded-lg p-3">
                                                    <div className="text-xs text-blue-500 mb-1 uppercase">
                                                        {soulprintB.archetype?.split(' ')[0]}
                                                    </div>
                                                    <p className="text-sm text-gray-300 line-clamp-3">
                                                        {pillarB.summary}
                                                    </p>
                                                    {pillarB.markers && pillarB.markers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {pillarB.markers.slice(0, 2).map((m, i) => (
                                                                <span key={i} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                                                                    {m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            {/* Reset Button */}
                            <div className="flex justify-center pt-4">
                                <Button
                                    onClick={() => { setSoulprintA(null); setSoulprintB(null); setSelectedA(null); setSelectedB(null) }}
                                    variant="outline"
                                    className="border-[#333] text-gray-400 hover:text-white"
                                >
                                    Compare Different SoulPrints
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {options.length < 2 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#111] flex items-center justify-center mb-4">
                            <Users className="h-8 w-8 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Need More SoulPrints</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Create another SoulPrint or wait for others to make theirs public to compare.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
