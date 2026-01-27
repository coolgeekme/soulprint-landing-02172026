'use client';

import Link from 'next/link';

function AnimatedOrb() {
  return (
    <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[500px]">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-radial from-orange-500/30 via-orange-600/10 to-transparent blur-3xl scale-150" />
      
      {/* Sliced sphere layers - inspired by moodboard/sphere.jpg */}
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-1">
        {[...Array(9)].map((_, i) => {
          const sizes = [60, 75, 88, 95, 100, 95, 85, 70, 50];
          const opacities = [0.6, 0.7, 0.85, 0.95, 1, 0.95, 0.85, 0.7, 0.5];
          return (
            <div
              key={i}
              className="rounded-full transition-all duration-1000"
              style={{
                width: `${sizes[i]}%`,
                height: '9%',
                background: `linear-gradient(180deg, 
                  rgba(251, 191, 140, ${0.9 * opacities[i]}) 0%,
                  rgba(249, 115, 22, ${0.95 * opacities[i]}) 30%,
                  rgba(234, 88, 12, ${0.9 * opacities[i]}) 70%,
                  rgba(194, 65, 12, ${0.8 * opacities[i]}) 100%
                )`,
                boxShadow: i === 4 ? '0 0 40px rgba(234, 88, 12, 0.4)' : 'none',
                animation: `float ${3 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          );
        })}
      </div>
      
      {/* Reflection/shine overlay */}
      <div className="absolute top-[15%] left-[20%] w-[30%] h-[20%] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black overflow-hidden page-transition">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            <span className="gradient-text">Soul</span>
            <span className="text-white">Print</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="glass-button px-5 py-2.5 text-sm font-medium text-white/90 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-orange px-5 py-2.5 text-sm font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-900/5 via-transparent to-transparent" />
        
        {/* Animated Orb */}
        <div className="relative mb-12 pulse-glow rounded-full">
          <AnimatedOrb />
        </div>

        {/* Text Content */}
        <div className="relative text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-white">AI that </span>
            <span className="gradient-text">remembers</span>
            <span className="text-white"> you</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto leading-relaxed">
            Import your ChatGPT history. Never repeat yourself again.
            <br />
            <span className="text-white/40">Your conversations, your context, always.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="btn-orange px-8 py-4 text-lg font-semibold w-full sm:w-auto"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="glass-button px-8 py-4 text-lg font-medium text-white/80 hover:text-white w-full sm:w-auto"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features preview */}
        <div className="absolute bottom-12 left-0 right-0 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {[
              { label: 'Import', desc: 'ChatGPT exports' },
              { label: 'Remember', desc: 'Your context' },
              { label: 'Chat', desc: 'Like you never left' },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-card-subtle p-4 text-center"
              >
                <div className="text-sm font-medium gradient-text mb-1">
                  {feature.label}
                </div>
                <div className="text-xs text-white/40">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
