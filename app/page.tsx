'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#09090B] overflow-hidden">
      {/* Ambient glow */}
      <div className="glow-ambient top-[-200px] left-1/2 -translate-x-1/2" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="logo">
            <img src="/logo.svg" alt="SoulPrint" className="logo-icon" />
            <span className="text-white">SoulPrint</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] mb-8">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-micro text-gray-400">Now in Beta</span>
          </div>
          
          {/* Headline */}
          <h1 className="animate-in stagger-1 text-display text-white mb-6">
            AI that actually
            <br />
            <span className="text-gradient">remembers you</span>
          </h1>
          
          {/* Subheadline */}
          <p className="animate-in stagger-2 text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Import your ChatGPT conversations. Build persistent memory.
            <br className="hidden sm:block" />
            Never explain yourself twice again.
          </p>
          
          {/* CTAs */}
          <div className="animate-in stagger-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="btn btn-primary btn-lg w-full sm:w-auto">
              Start for free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg w-full sm:w-auto">
              Sign in
            </Link>
          </div>
        </div>

        {/* Hero visual */}
        <div className="animate-in stagger-4 relative mt-20 max-w-5xl mx-auto">
          {/* Glow behind */}
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-transparent blur-3xl -z-10" />
          
          {/* Preview card */}
          <div className="card-elevated p-1.5">
            <div className="bg-[#09090B] rounded-[16px] p-6 sm:p-8">
              {/* Mock chat interface */}
              <div className="space-y-4">
                {/* AI message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <img src="/logo.svg" alt="" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">SoulPrint</div>
                    <div className="chat-assistant inline-block">
                      <p className="text-gray-200">Hey! I remember you were working on that Next.js project last week. How did the deployment go?</p>
                    </div>
                  </div>
                </div>
                
                {/* User message */}
                <div className="flex justify-end">
                  <div className="chat-user">
                    <p className="text-gray-200">It went great! Finally fixed that hydration bug we discussed.</p>
                  </div>
                </div>
                
                {/* AI message */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <img src="/logo.svg" alt="" className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">SoulPrint</div>
                    <div className="chat-assistant inline-block">
                      <p className="text-gray-200">Nice! Was it the useEffect dependency issue I suggested checking? I saved that pattern for future reference.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <p className="text-micro text-orange-500 mb-3">How it works</p>
            <h2 className="text-headline text-white">
              Three steps to perfect memory
            </h2>
          </div>
          
          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Export your history',
                description: 'Download your ChatGPT conversations in one click. We walk you through it.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'We build your memory',
                description: 'Our system extracts context, preferences, and knowledge from your conversations.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Chat with context',
                description: 'Start conversations that pick up right where you left off. No more repetition.',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="card card-hover p-6 group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:bg-orange-500/15 transition-colors">
                    {feature.icon}
                  </div>
                  <span className="text-4xl font-bold text-white/[0.06]">{feature.step}</span>
                </div>
                <h3 className="text-title text-white mb-2">{feature.title}</h3>
                <p className="text-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card-elevated p-10 sm:p-14 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-orange-500/20 blur-[100px] -z-10" />
            
            <h2 className="text-headline text-white mb-4">
              Ready to never repeat yourself?
            </h2>
            <p className="text-body mb-8">
              Join the beta and experience AI that truly understands you.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Get started for free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="logo">
            <img src="/logo.svg" alt="SoulPrint" className="w-5 h-5" />
            <span className="text-gray-500 text-sm">SoulPrint</span>
          </div>
          <p className="text-caption">
            © 2025 SoulPrint. Your memory, enhanced.
          </p>
        </div>
      </footer>
    </main>
  );
}
