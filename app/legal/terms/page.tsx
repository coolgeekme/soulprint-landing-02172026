import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <h1 className="font-koulen text-4xl md:text-5xl uppercase text-white mb-8">
                    Terms of Service
                </h1>

                <div className="prose prose-invert prose-zinc max-w-none">
                    <p className="text-zinc-400 text-lg mb-8">
                        Last updated: January 2026
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            By accessing or using SoulPrint Engine, you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            SoulPrint Engine provides a personalized AI identity layer that captures your unique
                            communication style, decision-making patterns, and personality traits to create a
                            persistent identity across AI interactions.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">3. User Responsibilities</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account credentials.
                            You agree not to use the service for any unlawful purpose or in any way that could
                            damage, disable, or impair the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">4. Intellectual Property</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            The SoulPrint Engine platform, including its design, features, and content, is owned
                            by ArcheForge. Your SoulPrint data remains yours, and you retain ownership of any
                            content you create using our service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">5. Limitation of Liability</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            SoulPrint Engine is provided &quot;as is&quot; without warranties of any kind. We shall not
                            be liable for any indirect, incidental, or consequential damages arising from your
                            use of the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">6. Changes to Terms</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            We reserve the right to modify these terms at any time. We will notify users of
                            significant changes via email or through the platform.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">7. Contact</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            For questions about these Terms of Service, please contact us at{" "}
                            <a href="mailto:legal@soulprintengine.ai" className="text-orange-500 hover:text-orange-400">
                                legal@soulprintengine.ai
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
