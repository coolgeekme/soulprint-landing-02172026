"use client";

import Image from "next/image";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface Feature {
  title: string;
  description: string;
  imgSrc: string;
}

const features: Feature[] = [
  {
    title: "Your Identity, Captured",
    description: "A deep, personality-level profile that learns how you speak, think, and create — so every AI responds in your voice, not default mode.",
    imgSrc: "https://ui.shadcn.com/placeholder.svg",
  },
  {
    title: "Works Across Every AI",
    description: "Use ChatGPT, Claude, Gemini, Perplexity. Anything. Your SoulPrint travels with you and upgrades every model instantly.",
    imgSrc: "https://ui.shadcn.com/placeholder.svg",
  },
  {
    title: "Fully Private. Fully Yours.",
    description: "Your data stays with you. Encrypted on your device. Nothing leaves your hands unless you choose it.",
    imgSrc: "https://ui.shadcn.com/placeholder.svg",
  },
  {
    title: "Your AI, Finally Personalized",
    description: "Your AI adapts to your mood, goals, tone, and pace bringing out your best thinking and your true voice.",
    imgSrc: "https://ui.shadcn.com/placeholder.svg",
  },
];

export function FeaturesSection() {
  return (
    <section className="w-full bg-background py-16 lg:py-24">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-10 lg:gap-12">
          <div className="flex max-w-xl flex-col items-center gap-5 text-center">
            <h2 className="font-koulen text-5xl font-normal leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Meet the AI that actually gets you.
            </h2>
            <p className="text-base text-muted-foreground">
              SoulPrint builds a personal identity layer that upgrades every AI you use. Your tone. Your patterns. Your cognitive rhythm — carried with you, encrypted and under your control.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-4">
                <AspectRatio ratio={4 / 3} className="overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={feature.imgSrc}
                    alt={feature.title}
                    fill
                    className="object-cover"
                  />
                </AspectRatio>
                <div className="flex flex-col gap-3">
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
