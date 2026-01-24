"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare } from "lucide-react";

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !((window as Window & { MSStream?: unknown }).MSStream);
    setIsIOS(ios);

    // Check if already installed (running in standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
                       (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Check if user has dismissed before
    const dismissed = localStorage.getItem("ios-install-prompt-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt if: iOS, not standalone, not dismissed in last 7 days
    if (ios && !standalone && daysSinceDismissed > 7) {
      // Delay showing the prompt for better UX
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("ios-install-prompt-dismissed", Date.now().toString());
  };

  if (!showPrompt || !isIOS || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 -z-10 h-screen -translate-y-full bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      
      {/* Prompt Card */}
      <div className="mx-4 mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-xl font-bold text-white">S</span>
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">Install SoulPrint</h3>
            <p className="text-zinc-400 text-sm">Add to your home screen</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-zinc-300">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 shrink-0">
              <span className="text-sm font-medium">1</span>
            </div>
            <p className="text-sm">
              Tap the <Share className="inline w-4 h-4 mx-1 text-blue-400" /> Share button in Safari
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-zinc-300">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 shrink-0">
              <span className="text-sm font-medium">2</span>
            </div>
            <p className="text-sm">
              Scroll down and tap <PlusSquare className="inline w-4 h-4 mx-1 text-blue-400" /> <span className="text-white font-medium">Add to Home Screen</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3 text-zinc-300">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800 shrink-0">
              <span className="text-sm font-medium">3</span>
            </div>
            <p className="text-sm">
              Tap <span className="text-white font-medium">Add</span> in the top right
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 text-center">
            ✨ Full-screen experience • ⚡ Faster loading • 📱 Works offline
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
