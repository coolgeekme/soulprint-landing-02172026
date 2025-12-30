"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function WaitlistPage() {
  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden">
      {/* Background - Static for now, will be replaced with video */}
      <div className="absolute inset-0 bg-[#0A0A0A]">
        {/* Radial gradient overlay matching hero section */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-black to-black" />

        {/* Subtle animated gradient accent - responsive sizing */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 h-48 w-48 rounded-full bg-[#EA580C]/20 blur-[80px] sm:h-64 sm:w-64 sm:blur-[100px] lg:h-96 lg:w-96 lg:blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-purple-600/10 blur-[80px] sm:h-64 sm:w-64 sm:blur-[100px] lg:h-96 lg:w-96 lg:blur-[120px]" />
        </div>
      </div>

      {/* Video Background - Uncomment when Cloudinary video is ready */}
      {/*
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="YOUR_CLOUDINARY_VIDEO_URL" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40" />
      */}

      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-4 left-4 z-20 sm:top-6 sm:left-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-[#737373] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-geist text-xs font-medium sm:text-sm">Back</span>
        </Link>
      </motion.div>

      {/* Main Content - No scroll, fits viewport */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 sm:px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2 sm:mb-4 lg:mb-6"
        >
          <Image
            src="/images/SoulPrintEngine-title-logo.png"
            alt="SoulPrint"
            width={180}
            height={40}
            className="h-auto w-[100px] sm:w-[130px] lg:w-[160px]"
          />
        </motion.div>

        {/* Headline - Small */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-3 text-center font-koulen text-sm uppercase tracking-tight text-white/80 sm:mb-4 sm:text-base md:text-lg"
        >
          When you're ready, <span className="text-[#737373]">your SoulPrint is waiting.</span>
        </motion.p>

        {/* Glass Form Container - Responsive, fits in viewport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative w-full max-w-[92vw] sm:max-w-md md:max-w-lg lg:max-w-xl"
        >
          {/* Glass effect card - very transparent */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm sm:p-1.5 sm:rounded-2xl">
            {/* Google Form iframe - takes most of the screen */}
            <iframe
              src="https://docs.google.com/forms/d/e/1FAIpQLSd1H1Zhkncg-g1lEQatgFnthp9JEkphTvgE0aAnJFPRFUPx3g/viewform?embedded=true"
              width="100%"
              className="h-[55vh] rounded-lg sm:h-[58vh] sm:rounded-xl md:h-[62vh] lg:h-[65vh]"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              style={{ background: 'transparent' }}
            >
              Loading…
            </iframe>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
