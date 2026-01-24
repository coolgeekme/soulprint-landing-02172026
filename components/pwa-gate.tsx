"use client";

import { useState, useEffect } from "react";
import { Share, PlusSquare, Download, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAGateProps {
  onContinue: () => void;
  userEmail?: string;
  userName?: string;
}

export function PWAGate({ onContinue, userEmail, userName }: PWAGateProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if running as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
                       (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent) && !((window as Window & { MSStream?: unknown }).MSStream);
    const android = /android/.test(userAgent);
    
    setIsIOS(ios);
    setIsAndroid(android);
    setChecking(false);

    // If already in PWA mode, let them continue
    if (standalone) {
      onContinue();
      return;
    }

    // Listen for install prompt (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setInstalling(false);
      // Small delay then continue
      setTimeout(() => onContinue(), 1000);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [onContinue]);

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    
    setInstalling(true);
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      // Wait a moment then check if installed
      setTimeout(() => {
        const standalone = window.matchMedia("(display-mode: standalone)").matches;
        if (standalone) {
          onContinue();
        }
        setInstalling(false);
      }, 2000);
    } else {
      setInstalling(false);
    }
    
    setDeferredPrompt(null);
  };

  // Desktop is handled in the else branch below

  if (checking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-pulse text-white">Checking app status...</div>
      </div>
    );
  }

  // Already installed
  if (isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-koulen text-3xl text-white mb-2">
            ONE MORE STEP
          </h1>
          <p className="text-zinc-400 text-sm">
            Install SoulPrint for the best experience
          </p>
        </div>

        {/* Welcome message */}
        {userName && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
            <p className="text-zinc-300">
              Welcome, <span className="text-white font-medium">{userName}</span>! 👋
            </p>
            {userEmail && (
              <p className="text-zinc-500 text-sm mt-1">{userEmail}</p>
            )}
          </div>
        )}

        {/* Benefits */}
        <div className="mb-8 space-y-3">
          {[
            { icon: "⚡", text: "Lightning fast performance" },
            { icon: "📴", text: "Works offline" },
            { icon: "🔒", text: "Your data stays on your device" },
            { icon: "✨", text: "Full-screen immersive experience" },
          ].map((benefit, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50"
            >
              <span className="text-xl">{benefit.icon}</span>
              <span className="text-zinc-300 text-sm">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Platform-specific instructions */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
          {isIOS ? (
            <>
              <h3 className="font-semibold text-white text-lg mb-4 text-center">
                Install on iPhone
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Tap the Share button</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      <Share className="inline w-4 h-4 text-blue-400" /> at the bottom of Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Add to Home Screen</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      <PlusSquare className="inline w-4 h-4 text-blue-400" /> Scroll and tap this option
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <span className="text-blue-400 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Tap Add</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Then open SoulPrint from your home screen
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-orange-300 text-xs text-center">
                  After installing, open SoulPrint from your home screen to continue
                </p>
              </div>
            </>
          ) : isAndroid && deferredPrompt ? (
            <>
              <h3 className="font-semibold text-white text-lg mb-4 text-center">
                Install on Android
              </h3>
              <Button
                onClick={handleAndroidInstall}
                disabled={installing}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-medium rounded-lg"
              >
                {installing ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-5 w-5" />
                    Install SoulPrint
                  </>
                )}
              </Button>
              <p className="text-zinc-500 text-xs text-center mt-3">
                Tap to add to your home screen
              </p>
            </>
          ) : isAndroid ? (
            <>
              <h3 className="font-semibold text-white text-lg mb-4 text-center">
                Install on Android
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    <span className="text-green-400 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Tap the menu</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      ⋮ Three dots in Chrome
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    <span className="text-green-400 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Add to Home screen</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      Or &quot;Install app&quot; if available
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Desktop - allow skip
            <>
              <h3 className="font-semibold text-white text-lg mb-4 text-center">
                Best on Mobile
              </h3>
              <p className="text-zinc-400 text-sm text-center mb-4">
                SoulPrint is optimized for mobile. Scan the QR code with your phone for the best experience.
              </p>
              <Button
                onClick={onContinue}
                variant="outline"
                className="w-full h-12 border-zinc-700 text-white hover:bg-zinc-800"
              >
                Continue on Desktop
              </Button>
            </>
          )}
        </div>

        {/* Check status button for mobile */}
        {(isIOS || isAndroid) && (
          <Button
            onClick={() => {
              const standalone = window.matchMedia("(display-mode: standalone)").matches ||
                                 (navigator as Navigator & { standalone?: boolean }).standalone === true;
              if (standalone) {
                onContinue();
              } else {
                alert("Please install SoulPrint from your home screen first!");
              }
            }}
            variant="ghost"
            className="w-full mt-4 text-zinc-400 hover:text-white"
          >
            <Check className="mr-2 h-4 w-4" />
            I&apos;ve installed it
          </Button>
        )}
      </div>
    </div>
  );
}
