import { Navbar } from "@/components/sections/navbar"
import { Hero } from "@/components/sections/hero"
import { Stats } from "@/components/sections/stats"
import { Features } from "@/components/sections/features"
import { CTA } from "@/components/sections/cta"
import { Pricing } from "@/components/sections/pricing"
import { FAQ } from "@/components/sections/faq"
import { Footer } from "@/components/sections/footer"
import { FeatureBlogSection } from "@/components/sections/feature-blog-section"
import { MemorySection } from "@/components/sections/memory-section"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <FeatureBlogSection />
      <MemorySection />
      <Stats />
      <Features />
      <CTA />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  )
}
