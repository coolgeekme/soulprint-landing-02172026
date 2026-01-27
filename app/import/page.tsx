'use client';

import Link from 'next/link';
import { useState } from 'react';

const steps = [
  {
    number: '01',
    title: 'We send instructions',
    description: 'Click the button below and we\'ll email you simple steps to export your ChatGPT data.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Export & forward',
    description: 'Download your ChatGPT export and forward it to our secure processing email.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Memory built',
    description: 'We process your history and build your personal AI memory. Takes about 5 minutes.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

export default function ImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendInstructions = async () => {
    setIsLoading(true);
    // TODO: Implement actual email sending
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEmailSent(true);
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-black px-6 py-12 page-transition">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="max-w-4xl mx-auto mb-12">
        <Link href="/" className="text-xl font-semibold tracking-tight inline-block">
          <span className="gradient-text">Soul</span>
          <span className="text-white">Print</span>
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Connect your <span className="gradient-text">memory</span>
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Import your ChatGPT conversations to give your AI perfect context about you.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {steps.map((step, i) => (
            <div key={i} className="glass-card p-6 relative group hover:border-orange-500/30 transition-colors">
              {/* Step number */}
              <div className="text-5xl font-bold text-orange-500/10 absolute top-4 right-4">
                {step.number}
              </div>
              
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center text-orange-400 mb-4">
                {step.icon}
              </div>
              
              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>

              {/* Connector line (not on last) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-white/20 to-transparent" />
              )}
            </div>
          ))}
        </div>

        {/* Action Card */}
        <div className="glass-card p-8 max-w-xl mx-auto glow-orange-sm text-center">
          {!emailSent ? (
            <>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-6 glow-orange">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">Ready to import?</h2>
              <p className="text-white/50 text-sm mb-6">
                We&apos;ll send detailed instructions to your email.
              </p>

              <button
                onClick={handleSendInstructions}
                disabled={isLoading}
                className="btn-orange px-8 py-4 text-lg font-semibold w-full sm:w-auto disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Instructions'
                )}
              </button>

              <div className="mt-6">
                <Link href="/chat" className="text-sm text-white/40 hover:text-white/60">
                  Skip for now →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">Instructions sent!</h2>
              <p className="text-white/50 text-sm mb-6">
                Check your inbox for the next steps. Once you forward your export, we&apos;ll notify you when your memory is ready.
              </p>

              <Link
                href="/chat"
                className="btn-orange px-8 py-4 text-lg font-semibold inline-block"
              >
                Continue to Chat
              </Link>
            </>
          )}
        </div>

        {/* Security note */}
        <div className="text-center mt-8">
          <p className="text-xs text-white/30 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your data is encrypted and never shared
          </p>
        </div>
      </div>
    </main>
  );
}
