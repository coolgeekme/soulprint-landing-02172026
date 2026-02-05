'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle } from 'lucide-react';

const BRAND_ORANGE = '#E8632B';

export default function CompletePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate processing
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const processingSteps = [
    { threshold: 0, text: 'Analyzing pillar responses...' },
    { threshold: 20, text: 'Mapping communication patterns...' },
    { threshold: 40, text: 'Extracting emotional signatures...' },
    { threshold: 60, text: 'Processing voice cadence...' },
    { threshold: 80, text: 'Building SoulPrint Core Layer...' },
    { threshold: 95, text: 'Finalizing your identity map...' },
  ];

  const currentStep = processingSteps
    .filter(s => progress >= s.threshold)
    .pop();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {isProcessing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Processing Animation */}
            <div className="relative w-32 h-32 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary/20"
                style={{ borderColor: `${BRAND_ORANGE}33` }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-t-primary"
                style={{ borderTopColor: BRAND_ORANGE }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: BRAND_ORANGE }}>
                  {Math.round(Math.min(progress, 100))}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Creating Your SoulPrint
              </h2>
              <p className="text-muted-foreground animate-pulse">
                {currentStep?.text}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="relative w-32 h-32 mx-auto"
            >
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                <Sparkles className="w-12 h-12 text-white" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: `4px solid ${BRAND_ORANGE}` }}
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Success Message */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-foreground">
                Your SoulPrint is Ready
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Your AI now speaks with your rhythm, thinks with your logic,
                and pauses when you would pause.
              </p>
            </div>

            {/* SoulPrint Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: BRAND_ORANGE }}
                >
                  SP
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">SoulPrint Active</p>
                  <p className="text-xs text-muted-foreground">ID: SP_USER_001</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold" style={{ color: BRAND_ORANGE }}>6</p>
                  <p className="text-xs text-muted-foreground">Pillars</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: BRAND_ORANGE }}>36</p>
                  <p className="text-xs text-muted-foreground">Answers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: BRAND_ORANGE }}>6</p>
                  <p className="text-xs text-muted-foreground">Voice Prints</p>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={() => router.push('/chat')}
                className="w-full h-14 text-lg gap-2"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                <MessageCircle className="w-5 h-5" />
                Meet Your AI
              </Button>
            </motion.div>

            {/* Manifesto */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-muted-foreground italic"
            >
              "Presence over automation. Cadence over calculation. Soul over script."
            </motion.p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
