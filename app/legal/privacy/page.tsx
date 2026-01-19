import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicyPage() {
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
                    Privacy Policy
                </h1>

                <div className="prose prose-invert prose-zinc max-w-none">
                    <p className="text-zinc-400 text-lg mb-8">
                        Last updated: January 2026
                    </p>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            SoulPrint Engine collects information you provide directly, including your email address,
                            name, and the responses you provide during the questionnaire process. We also collect
                            usage data to improve our services.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            Your SoulPrint data is used to create your personalized identity profile and to
                            enhance your AI interactions. We do not sell your personal information to third parties.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">3. Data Security</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            We implement industry-standard security measures to protect your data. Your SoulPrint
                            is encrypted and stored securely. You can delete your account and all associated data
                            at any time.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">4. Your Rights</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            You have the right to access, modify, or delete your personal data. You can also
                            control whether your SoulPrint profile is public or private through your dashboard settings.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-white mb-4">5. Contact Us</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at{" "}
                            <a href="mailto:privacy@soulprintengine.ai" className="text-orange-500 hover:text-orange-400">
                                privacy@soulprintengine.ai
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    )
}
