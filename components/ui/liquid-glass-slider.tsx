"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import LiquidGlass to avoid SSR issues with WebGL
const LiquidGlass = dynamic(() => import("liquid-glass-react"), {
    ssr: false,
    loading: () => (
        <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-md" />
    ),
});

// Brand orange color from logo: #E8632B
const BRAND_ORANGE = "#E8632B";

interface LiquidGlassSliderProps {
    value: number[];
    min?: number;
    max?: number;
    step?: number;
    onValueChange?: (value: number[]) => void;
    className?: string;
    leftLabel?: string;
    rightLabel?: string;
}

export function LiquidGlassSlider({
    value,
    min = 0,
    max = 100,
    step = 1,
    onValueChange,
    className,
    leftLabel,
    rightLabel,
}: LiquidGlassSliderProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

    // Track mouse position relative to container for liquid glass effect
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Derived values
    const progress = (value[0] - min) / (max - min);

    // Calculate left/right influence for label animations
    const leftInfluence = Math.max(0, 1 - progress * 2); // 1 at 0%, 0 at 50%
    const rightInfluence = Math.max(0, (progress - 0.5) * 2); // 0 at 50%, 1 at 100%

    // Neutral zone calculations (center)
    const deviation = Math.abs(progress - 0.5);
    const isNeutral = deviation < 0.1;
    const intensity = Math.min(1, deviation * 2.5); // 0 to 1 based on how far from center

    return (
        <div className={cn("relative w-full py-16 select-none touch-none", className)}>
            {/* Labels container */}
            <div className="absolute top-0 w-full flex justify-between pointer-events-none px-1">
                <motion.span
                    animate={{
                        opacity: 0.4 + leftInfluence * 0.6,
                        scale: 1 + leftInfluence * 0.1,
                        color: leftInfluence > 0.5 ? BRAND_ORANGE : "#666"
                    }}
                    className="text-sm font-medium transition-colors duration-300"
                >
                    {leftLabel}
                </motion.span>
                <motion.span
                    animate={{
                        opacity: 0.4 + rightInfluence * 0.6,
                        scale: 1 + rightInfluence * 0.1,
                        color: rightInfluence > 0.5 ? BRAND_ORANGE : "#666"
                    }}
                    className="text-sm font-medium transition-colors duration-300"
                >
                    {rightLabel}
                </motion.span>
            </div>

            <SliderPrimitive.Root
                className="relative flex w-full items-center"
                value={value}
                onValueChange={onValueChange}
                max={max}
                min={min}
                step={step}
                onPointerDown={() => setIsDragging(true)}
                onPointerUp={() => setIsDragging(false)}
            >
                <div ref={containerRef} className="relative w-full h-3">

                    {/* Background Track - Inset Glass Effect */}
                    <div className="absolute inset-0 rounded-full bg-zinc-200/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_2px_rgba(0,0,0,0.1)] border border-zinc-300/50 overflow-hidden">
                        {/* Subtle center marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-zinc-400/30 -translate-x-1/2" />
                    </div>

                    {/* Fill - Starts from center, extends left or right */}
                    <motion.div
                        className="absolute top-0 bottom-0 rounded-full"
                        style={{
                            left: progress < 0.5 ? `${progress * 100}%` : '50%',
                            width: `${Math.abs(progress - 0.5) * 100}%`,
                            background: `linear-gradient(90deg, ${BRAND_ORANGE}dd, ${BRAND_ORANGE})`,
                            boxShadow: isNeutral
                                ? 'none'
                                : `0 0 12px ${BRAND_ORANGE}66, inset 0 1px 2px rgba(255,255,255,0.3)`,
                        }}
                        animate={{
                            opacity: isNeutral ? 0.3 : 0.9,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />

                    {/* Actual Radix Track (invisible functional layer) */}
                    <SliderPrimitive.Track className="relative h-full w-full rounded-full bg-transparent overflow-visible">
                        <SliderPrimitive.Range className="absolute h-full bg-transparent" />
                    </SliderPrimitive.Track>
                </div>

                {/* The Thumb - Liquid Glass */}
                <SliderPrimitive.Thumb
                    className="block outline-none cursor-grab active:cursor-grabbing z-20"
                    asChild
                >
                    <motion.div
                        animate={{
                            scale: isDragging ? 1.1 : 1,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative"
                    >
                        <LiquidGlass
                            displacementScale={isDragging ? 80 : 60}
                            blurAmount={0.08}
                            saturation={120}
                            aberrationIntensity={isDragging ? 3 : 1.5}
                            elasticity={0.35}
                            cornerRadius={999}
                            padding="0"
                            overLight={true}
                            mouseContainer={containerRef}
                            globalMousePos={mousePos}
                            className="w-14 h-14 flex items-center justify-center"
                        >
                            {/* Inner Core */}
                            <motion.div
                                className="w-4 h-4 rounded-full"
                                animate={{
                                    scale: isNeutral ? 0.7 : 1,
                                    backgroundColor: isNeutral ? "#9CA3AF" : BRAND_ORANGE,
                                    boxShadow: isNeutral
                                        ? "none"
                                        : `0 0 8px ${BRAND_ORANGE}88`
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            />
                        </LiquidGlass>
                    </motion.div>
                </SliderPrimitive.Thumb>
            </SliderPrimitive.Root>

            {/* Feedback Text below thumb */}
            <div className="absolute top-full mt-2 left-0 w-full pointer-events-none">
                <motion.div
                    className="flex flex-col items-center"
                    style={{
                        marginLeft: `${progress * 100}%`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {isNeutral ? "Neutral" : `${Math.round(intensity * 100)}% Intensity`}
                    </span>
                </motion.div>
            </div>
        </div>
    );
}
