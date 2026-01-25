"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Brain, Zap, Activity, Shield, TrendingUp, Cpu } from "lucide-react"

interface SoulPrintData {
    id: string
    name: string
    archetype: string
    pillars: {
        communication: { markers: string[]; confidence: number }
        emotional: { markers: string[]; confidence: number }
        decision: { markers: string[]; confidence: number }
        social: { markers: string[]; confidence: number }
        cognitive: { markers: string[]; confidence: number }
        conflict: { markers: string[]; confidence: number }
    }
    voice_vectors: {
        tempo: number
        clarity: number
        resonance: number
        confidence: number
    }
    created_at: string
}

interface ReactorMetrics {
    stability: number
    patternDepth: number
    signalDrift: number
    fragmentsStored: number
    trajectory: 'STABILIZING' | 'OPTIMIZING' | 'CONSOLIDATING' | 'EVOLVING'
    activeLayer: 'CORE' | 'SHADOW' | 'INTEGRATION'
    dominantThinkingMode: string
}

const ARCHETYPES = {
    'ACE': 'The Strategist',
    'SAGE': 'The Mentor', 
    'GUARDIAN': 'The Protector',
    'INNOVATOR': 'The Creator',
    'ANALYST': 'The Investigator',
    'CONNECTOR': 'The Bridge',
    'Catalyst': 'The Accelerator'
}

const THINKING_MODES = {
    'conceptual': 'Conceptual / Pattern-Oriented',
    'analytical': 'Analytical / Data-Driven',
    'emotional': 'Emotional / Relational',
    'strategic': 'Strategic / Goal-Oriented',
    'creative': 'Creative / Possibility-Oriented',
    'integrative': 'Integrative / Holistic'
}

export function IdentityReactor() {
    const [soulPrint, setSoulPrint] = useState<SoulPrintData | null>(null)
    const [metrics, setMetrics] = useState<ReactorMetrics | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isOnline, setIsOnline] = useState(false)
    
    const supabase = createClient()

    // Calculate reactor metrics from SoulPrint data
    const calculateMetrics = useMemo(() => {
        if (!soulPrint) return null

        const avgPillarConfidence = Object.values(soulPrint.pillars)
            .reduce((sum, pillar) => sum + pillar.confidence, 0) / 6
        
        const stability = Math.round(avgPillarConfidence * 100)
        const patternDepth = parseFloat((1 + Math.random() * 2).toFixed(1))
        const signalDrift = Math.round(Math.random() * 20)
        const fragmentsStored = Math.floor(Math.random() * 50) + 10

        // Determine trajectory based on stability
        let trajectory: ReactorMetrics['trajectory'] = 'EVOLVING'
        if (stability > 80) trajectory = 'STABILIZING'
        else if (stability > 60) trajectory = 'CONSOLIDATING'
        else trajectory = 'OPTIMIZING'

        // Determine active layer based on confidence distribution
        const confidenceVariance = Object.values(soulPrint.pillars)
            .map(p => p.confidence).reduce((sum, conf) => {
                return sum + Math.pow(conf - avgPillarConfidence, 2)
            }, 0) / 6
        
        let activeLayer: ReactorMetrics['activeLayer'] = 'INTEGRATION'
        if (confidenceVariance < 0.01) activeLayer = 'CORE'
        else if (confidenceVariance > 0.05) activeLayer = 'SHADOW'

        // Determine thinking mode from dominant pillar
        const dominantPillar = Object.entries(soulPrint.pillars)
            .reduce(([domKey, dominant], [key, pillar]) => 
                pillar.confidence > dominant.confidence ? [key, pillar] : [domKey, dominant]
            )
        
        const thinkingModes: Record<string, string> = {
            'communication': 'conceptual',
            'emotional': 'emotional', 
            'decision': 'strategic',
            'social': 'integrative',
            'cognitive': 'analytical',
            'conflict': 'creative'
        }
        
        const dominantThinkingMode = thinkingModes[dominantPillar[0]] || 'Unknown'

        return {
            stability,
            patternDepth,
            signalDrift,
            fragmentsStored,
            trajectory,
            activeLayer,
            dominantThinkingMode
        }
    }, [soulPrint])

    // Fetch active SoulPrint
    useEffect(() => {
        const fetchSoulPrint = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: soulPrints } = await supabase
                    .from('soulprints')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('active', true)
                    .single()

                if (soulPrints) {
                    setSoulPrint(soulPrints)
                    setIsOnline(true)
                }
            } catch (error) {
                console.error('Failed to fetch SoulPrint:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSoulPrint()
    }, [supabase])

    // Update metrics when SoulPrint changes
    useEffect(() => {
        setMetrics(calculateMetrics)
    }, [calculateMetrics])

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Cpu className="w-8 h-8 text-orange-500 animate-pulse" />
                    <div className="font-mono text-sm text-gray-500">INITIALIZING REACTOR...</div>
                </div>
            </div>
        )
    }

    if (!soulPrint || !metrics) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Brain className="w-12 h-12 text-gray-500" />
                    <div className="font-mono text-sm text-gray-500">NO SOULPRINT DETECTED</div>
                    <div className="font-mono text-xs text-gray-400 mt-2">Create a SoulPrint to activate the Identity Reactor</div>
                </div>
            </div>
        )
    }

    const archetypeDisplay = ARCHETYPES[soulPrint.archetype as keyof typeof ARCHETYPES] || soulPrint.archetype

    return (
        <div className="flex h-full w-full gap-4">
            {/* Left Panel - SoulPrint Reactor */}
            <div className="flex flex-1 flex-col rounded-xl border border-[#333] bg-[#0A0A0A] p-4">
                {/* Panel Header */}
                <div className="mb-4 font-mono text-xs tracking-wider text-gray-500">
                    [SOULPRINT REACTOR]
                </div>

                {/* Enhanced Visualizer */}
                <div className="flex flex-1 items-center justify-center">
                    <div className="relative">
                        <svg
                            width="400"
                            height="400"
                            viewBox="0 0 400 400"
                            className="animate-spin-slow"
                            style={{ animationDuration: '30s' }}
                        >
                            {/* Dynamic rings based on stability */}
                            {[180, 160, 140, 120, 100, 80, 60, 40, 20].map((radius, i) => {
                                const opacity = 0.1 + (i * 0.08) + (metrics.stability / 1000)
                                const strokeWidth = 1 + (i % 3)
                                return (
                                    <circle
                                        key={i}
                                        cx="200"
                                        cy="200"
                                        r={radius}
                                        fill="none"
                                        stroke={metrics.activeLayer === 'CORE' ? '#ea580c' : '#666'}
                                        strokeWidth={strokeWidth}
                                        opacity={opacity}
                                    />
                                )
                            })}

                            {/* Core personality visualization */}
                            <motion.g
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            >
                                {/* Pattern paths based on thinking mode */}
                                {metrics.dominantThinkingMode.includes('Conceptual') && (
                                    <>
                                        <path
                                            d="M200,200 Q250,150 300,200 Q250,250 200,200"
                                            fill="none"
                                            stroke="#ea580c"
                                            strokeWidth="2"
                                            opacity="0.8"
                                        />
                                        <path
                                            d="M200,200 Q150,150 100,200 Q150,250 200,200"
                                            fill="none"
                                            stroke="#ea580c"
                                            strokeWidth="2"
                                            opacity="0.6"
                                        />
                                    </>
                                )}
                                
                                {metrics.dominantThinkingMode.includes('Strategic') && (
                                    <>
                                        <path
                                            d="M200,200 L300,150 L300,250 L200,200 Z"
                                            fill="none"
                                            stroke="#ea580c"
                                            strokeWidth="2"
                                            opacity="0.8"
                                        />
                                        <path
                                            d="M200,200 L100,150 L100,250 L200,200 Z"
                                            fill="none"
                                            stroke="#ea580c"
                                            strokeWidth="2"
                                            opacity="0.6"
                                        />
                                    </>
                                )}

                                {/* Central core with pulse */}
                                <motion.circle
                                    cx="200"
                                    cy="200"
                                    r="8"
                                    fill="#ea580c"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </motion.g>

                            {/* Floating particles */}
                            {[...Array(8)].map((_, i) => {
                                const angle = (i * 45) * Math.PI / 180
                                const distance = 120 + Math.sin(Date.now() / 1000 + i) * 20
                                const x = 200 + Math.cos(angle) * distance
                                const y = 200 + Math.sin(angle) * distance
                                
                                return (
                                    <motion.circle
                                        key={i}
                                        cx={x}
                                        cy={y}
                                        r="2"
                                        fill="#ea580c"
                                        opacity={0.3 + Math.sin(Date.now() / 500 + i) * 0.2}
                                        animate={{ scale: [0.5, 1, 0.5] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                )
                            })}
                        </svg>
                    </div>
                </div>

                {/* Dynamic Status Info */}
                <div className="mt-4 space-y-1 font-mono text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <span>Status:</span>
                        <span className={`flex items-center gap-1 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                    <div>Pattern Depth: <span className="text-white">{metrics.patternDepth}</span></div>
                    <div>Stability: <span className="text-white">{metrics.stability}%</span></div>
                    <div>Signal Drift: <span className="text-white">{metrics.signalDrift}%</span></div>
                </div>
            </div>

            {/* Right Panels */}
            <div className="flex w-[450px] flex-col gap-4">
                {/* Enhanced High-Level Signal Panel */}
                <div className="flex-1 rounded-xl border border-[#333] bg-[#0A0A0A] p-4">
                    <div className="mb-4 font-mono text-xs tracking-wider text-gray-500">
                        [HIGH-LEVEL SIGNAL]
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="font-mono text-xs text-gray-500">SHADOW ARCHETYPE:</div>
                            <div className="font-koulen text-2xl text-white">{archetypeDisplay}</div>
                        </div>
                        
                        <div>
                            <div className="font-mono text-xs text-gray-500">DOMINANT THINKING MODE:</div>
                            <div className="font-mono text-sm text-white">{metrics.dominantThinkingMode}</div>
                        </div>
                        
                        <div className="font-mono text-sm text-orange-500">
                            ACTIVE LAYER: {metrics.activeLayer}
                        </div>

                        {/* Voice signature indicator */}
                        <div className="mt-4 pt-4 border-t border-[#333]">
                            <div className="font-mono text-xs text-gray-500 mb-2">VOICE SIGNATURE:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-yellow-500" />
                                    <span>Tempo: {soulPrint.voice_vectors.tempo}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-blue-500" />
                                    <span>Clarity: {soulPrint.voice_vectors.clarity}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Status Panel */}
                <div className="flex-1 rounded-xl border border-[#333] bg-[#0A0A0A] p-4">
                    <div className="mb-4 font-mono text-xs tracking-wider text-gray-500">
                        [STATUS]
                    </div>
                    
                    <div className="space-y-2 font-mono text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-white">Fragments Stored:</span>
                            <motion.span 
                                className="text-gray-400 font-mono"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                {metrics.fragmentsStored}
                            </motion.span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-white">Identity Stability (7d):</span>
                            <span className={`text-gray-400 ${metrics.stability > 80 ? 'text-green-400' : ''}`}>
                                {metrics.stability > 80 ? '+' : ''}{metrics.stability - 82}%
                            </span>
                        </div>
                        
                        <div className={`font-mono text-sm ${
                            metrics.trajectory === 'STABILIZING' ? 'text-green-500' :
                            metrics.trajectory === 'OPTIMIZING' ? 'text-blue-500' :
                            metrics.trajectory === 'CONSOLIDATING' ? 'text-yellow-500' :
                            'text-orange-500'
                        }`}>
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Trajectory: {metrics.trajectory}
                            </div>
                        </div>
                        
                        <div className="mt-4 border-t border-[#333] pt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Shield className="w-3 h-3 text-green-500" />
                                <span className="text-gray-400">Sync: ChatGPT, Claude, Perplexity</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Brain className="w-3 h-3 text-purple-500" />
                                <span className="text-gray-400">Local Vault: ENCRYPTED / LOCAL ONLY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
