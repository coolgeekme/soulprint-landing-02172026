import { Navbar } from "@/components/sections/navbar"
import { Hero } from "@/components/sections/hero"
import { FeatureBlogSection } from "@/components/sections/feature-blog-section"
import { MemorySection } from "@/components/sections/memory-section"
import BreakpointDesktop from "@/components/BreakpointDesktop"
import { Footer } from "@/components/sections/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <FeatureBlogSection />
      <MemorySection />
      <BreakpointDesktop />
      <Footer />
    </main>
  )
}
