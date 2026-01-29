"use client";

export function FeatureBlogSection() {
    return (
        <section className="w-full py-20 bg-background/50">
            <div className="container px-4 text-center">
                <h2 className="text-3xl font-bold mb-8">Features & Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Placeholders */}
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="text-xl font-bold mb-2">Feature 1</h3>
                        <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="text-xl font-bold mb-2">Feature 2</h3>
                        <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                    <div className="p-6 border rounded-lg bg-card">
                        <h3 className="text-xl font-bold mb-2">Feature 3</h3>
                        <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
