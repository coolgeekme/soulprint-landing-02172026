"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  icon?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="home"]',
    title: "Home / Chat",
    description: "Chat with your AI that truly understands you. This is your personalized conversation hub.",
    position: "right",
    icon: "🏠",
  },
  {
    target: '[data-tour="questionnaire"]',
    title: "Questionnaire",
    description: "Build and refine your SoulPrint by answering questions about yourself. The more you share, the better AI understands you.",
    position: "right",
    icon: "📝",
  },
  {
    target: '[data-tour="soulprint"]',
    title: "My SoulPrint",
    description: "View your unique digital identity — your communication style, preferences, and personality traits.",
    position: "right",
    icon: "🔮",
  },
  {
    target: '[data-tour="insights"]',
    title: "Insights",
    description: "Discover patterns and analytics about your personality and how you interact with AI.",
    position: "right",
    icon: "📊",
  },
  {
    target: '[data-tour="compare"]',
    title: "Compare",
    description: "See how your SoulPrint compares to others or track changes over time.",
    position: "right",
    icon: "⚖️",
  },
  {
    target: '[data-tour="api-keys"]',
    title: "API Keys",
    description: "Connect your own AI providers or use our built-in models for your conversations.",
    position: "right",
    icon: "🔑",
  },
  {
    target: '[data-tour="settings"]',
    title: "Settings",
    description: "Manage your account, privacy settings, and customize your experience.",
    position: "right",
    icon: "⚙️",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
  isFirstTime?: boolean;
}

export function OnboardingTour({ onComplete, isFirstTime = true }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = intro screen
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const updateTargetPosition = useCallback(() => {
    if (currentStep < 0 || currentStep >= TOUR_STEPS.length) {
      setTargetRect(null);
      return;
    }

    const step = TOUR_STEPS[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [currentStep]);

  useEffect(() => {
    updateTargetPosition();
    
    // Update position on resize
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [currentStep, updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > -1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem("soulprint-tour-completed", "true");
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  // Intro screen
  if (currentStep === -1) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-md mx-4 p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>

          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          {/* Content */}
          <h2 className="font-koulen text-3xl text-white text-center mb-3">
            WELCOME TO SOULPRINT
          </h2>
          <p className="text-zinc-400 text-center mb-8">
            Let's take a quick tour to show you around your new AI identity dashboard.
          </p>

          {/* What you'll learn */}
          <div className="mb-8 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-zinc-300 text-sm font-medium mb-3">In this tour, you'll learn:</p>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                How to chat with your personalized AI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Where to build your SoulPrint
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                How to view your insights & identity
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 h-12 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              Start Tour
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect) return {};

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    switch (step.position) {
      case "right":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      case "left":
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]">
        {targetRect && (
          <div
            className="absolute bg-transparent rounded-lg ring-4 ring-violet-500 ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        className={cn(
          "absolute w-80 p-5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl transition-all duration-300",
          "animate-in fade-in slide-in-from-bottom-2"
        )}
        style={getTooltipStyle()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{step.icon}</span>
          <div>
            <h3 className="font-semibold text-white text-lg">{step.title}</h3>
            <p className="text-zinc-400 text-sm mt-1">{step.description}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 text-sm">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                onClick={handlePrev}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          className="mt-3 text-zinc-500 text-xs hover:text-zinc-300 transition-colors w-full text-center"
        >
          Skip tour
        </button>
      </div>
    </div>
  );
}

// Hook to check if tour should be shown
export function useShouldShowTour() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("soulprint-tour-completed");
    const isFirstLogin = localStorage.getItem("soulprint-first-login");
    
    // Show tour if it's first login and tour hasn't been completed
    if (isFirstLogin === "true" && completed !== "true") {
      setShouldShow(true);
    }
  }, []);

  return shouldShow;
}

// Function to trigger tour on first login
export function markFirstLogin() {
  localStorage.setItem("soulprint-first-login", "true");
}

// Function to reset tour (for testing)
export function resetTour() {
  localStorage.removeItem("soulprint-tour-completed");
  localStorage.removeItem("soulprint-first-login");
}
