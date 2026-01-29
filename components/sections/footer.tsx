"use client";

export function Footer() {
    return (
        <footer className="w-full py-8 border-t bg-background">
            <div className="container px-4 flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} SoulPrint. All rights reserved.
                </p>
                <div className="flex gap-4 mt-4 md:mt-0">
                    <span className="text-sm text-muted-foreground">Privacy Policy</span>
                    <span className="text-sm text-muted-foreground">Terms of Service</span>
                </div>
            </div>
        </footer>
    )
}
