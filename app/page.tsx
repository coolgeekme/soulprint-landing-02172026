import { Navbar } from "@/components/sections/navbar"
import { Hero } from "@/components/sections/hero"
import RuixenBentoCards from "@/components/ui/ruixen-bento-cards"
import { FeatureBlogSection } from "@/components/sections/feature-blog-section"
import { MemorySection } from "@/components/sections/memory-section"
import { FaqSection } from "@/components/sections/faq-section"
import { AboutSection } from "@/components/sections/about-section"
import BreakpointDesktop from "@/components/BreakpointDesktop"
import { Footer } from "@/components/sections/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <RuixenBentoCards />
      <FeatureBlogSection />
      <MemorySection />
      <FaqSection />
      <AboutSection />
      <BreakpointDesktop />
      <Footer />
    </main>
  )
}
