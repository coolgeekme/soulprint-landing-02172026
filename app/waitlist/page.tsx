"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React from "react";

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

        {/* Custom Glass Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative w-full max-w-[92vw] sm:max-w-md"
        >
          <div className="rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-md sm:rounded-2xl">
            <WaitlistForm />
          </div>
        </motion.div>

      </div>
    </div>
  );

  function WaitlistForm() {
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setStatus('loading');

      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
      };

      try {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error('Submission failed');

        setStatus('success');
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    }

    if (status === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-2 font-koulen text-2xl text-white">Access Requested</h3>
          <p className="text-sm text-neutral-400">You've been added to our priority queue in Streak.</p>
          <Link
            href="/"
            className="mt-6 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Return Home
          </Link>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-neutral-400">Name *</label>
          <input
            required
            name="name"
            id="name"
            type="text"
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-neutral-400">Email *</label>
          <input
            required
            name="email"
            id="email"
            type="email"
            placeholder="jane@example.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white/20 focus:outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-start gap-3 py-2">
          <div className="flex h-5 items-center">
            <input
              id="nda"
              name="nda"
              type="checkbox"
              required
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-white focus:ring-0 focus:ring-offset-0"
            />
          </div>
          <label htmlFor="nda" className="text-xs text-neutral-400">
            I am willing to sign a Non-Disclosure Agreement (NDA) to satisfy the confidentiality requirements of this beta program. *
          </label>
        </div>

        {status === 'error' && (
          <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
        )}

        <button
          disabled={status === 'loading'}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
        >
          {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
        </button>
      </form>
    );
  }
}
