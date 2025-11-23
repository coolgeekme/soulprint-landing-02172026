"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

export function Hero() {
    return (
        <section className="relative flex w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-black to-black min-h-[60vh] py-[clamp(60px,8vh,120px)] lg:min-h-0">
            <div className="flex h-full w-full max-w-[1400px] items-center justify-center px-6 md:px-12 lg:px-12 xl:px-24">
                <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    {/* Left Column - Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col items-start justify-center"
                    >
                        {/* Headline */}
                        <h1 className="font-koulen text-[clamp(40px,4vw,110px)] leading-[0.9] tracking-tight text-white uppercase">
                            STOP USING AI
                            <br />
                            IN DEFAULT MODE
                        </h1>

                        {/* Subheading */}
                        <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-gray-400 xl:text-xl">
                            Default mode is dead.
                        </p>

                        {/* CTAs */}
                        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                            <Button size="xl" className="bg-[#ea580c] font-medium text-white hover:bg-[#ea580c]/90">
                                Break the Mold
                            </Button>
                        </div>
                    </motion.div>

                    {/* Right Column - Hero Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="hidden flex-col items-center justify-center lg:flex"
                    >
                        <img
                            src="/images/hero-badge.png"
                            alt="Badge"
                            width="500"
                            height="500"
                            className="object-contain w-full max-w-[500px] xl:max-w-[600px]"
                        />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
