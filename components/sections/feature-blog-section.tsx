"use client";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";

const features = [
    {
        title: "Your Identity, Captured",
        description: "A deep, personality-level profile that learns how you speak, think, and create — so every AI responds in your voice, not default mode.",
        image: "/images/feature-identity.png",
    },
    {
        title: "Works Across Every AI",
        description: "Use ChatGPT, Claude, Gemini, Perplexity. Anything. Your SoulPrint travels with you and upgrades every model instantly.",
        image: "/images/feature-works.png",
    },
    {
        title: "Fully Private. Fully Yours.",
        description: "Your data stays with you. Encrypted on your device. Nothing leaves your hands unless you choose it.",
        image: "/images/feature-private.png",
    },
    {
        title: "Your AI, Finally Personalized",
        description: "Your AI adapts to your mood, goals, tone, and pace bringing out your best thinking and your true voice.",
        image: "/images/feature-personalized.png",
    },
];

export function FeatureBlogSection() {
    return (
        <section className="flex w-full flex-col items-center bg-white py-24">
            <div className="flex w-full max-w-[1400px] flex-col items-center gap-16 px-6 md:px-12 lg:px-12 xl:px-24">
                {/* Header Section */}
                <div className="flex w-full max-w-[800px] flex-col items-center gap-6 text-center">
                    <h2 className="font-koulen text-[48px] font-normal leading-[0.9] text-[#0A0A0A] uppercase md:text-[64px] lg:text-[72px]">
                        MEET THE AI THAT
                        <br />
                        ACTUALLY GETS YOU.
                    </h2>
                    <p className="max-w-[600px] font-inter text-base font-normal leading-relaxed text-[#737373] md:text-lg">
                        SoulPrint builds a personal identity layer that upgrades every AI you use.
                        <br className="hidden md:block" />
                        Your tone. Your patterns. Your cognitive rhythm — carried with you,
                        <br className="hidden md:block" />
                        encrypted and under your control.
                    </p>
                </div>

                {/* Grid Section */}
                <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="flex flex-col gap-4">
                            <AspectRatio ratio={4 / 3} className="overflow-hidden bg-neutral-100">
                                <Image
                                    src={feature.image}
                                    alt={feature.title}
                                    fill
                                    className="object-cover transition-transform duration-300 hover:scale-105"
                                />
                            </AspectRatio>
                            <div className="flex flex-col gap-3">
                                <h3 className="font-geist text-lg font-semibold leading-tight text-[#0A0A0A]">
                                    {feature.title}
                                </h3>
                                <p className="font-geist text-sm font-normal leading-relaxed text-[#737373]">
                                    {feature.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
