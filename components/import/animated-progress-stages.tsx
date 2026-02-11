'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileSearch,
  Sparkles,
  Fingerprint,
  Check,
} from 'lucide-react';
import { mapProgress, STAGES, getStageProgress } from '@/lib/import/progress-mapper';

interface AnimatedProgressStagesProps {
  progress: number;          // 0-100 overall progress
  stage: string | null;      // Backend stage string
  lastKnownPercent: number;  // For monotonic guard (passed to mapProgress)
}

// Map icon names to Lucide components
const ICON_MAP = {
  Upload,
  FileSearch,
  Sparkles,
  Fingerprint,
} as const;

export function AnimatedProgressStages({
  progress,
  stage,
  lastKnownPercent,
}: AnimatedProgressStagesProps) {
  // Map backend progress to frontend stage info
  const stageInfo = mapProgress(progress, stage, lastKnownPercent);
  const { stageIndex, stageLabel, displayPercent, isComplete, safeToClose } = stageInfo;

  return (
    <div className="max-w-md w-full space-y-6">
      {/* Stage Stepper */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STAGES.map((stageData, index) => {
            const IconComponent = ICON_MAP[stageData.icon as keyof typeof ICON_MAP];
            const isCompleted = index < stageIndex;
            const isActive = index === stageIndex;
            const isPending = index > stageIndex;

            return (
              <div key={index} className="flex flex-col items-center flex-1 relative">
                {/* Connecting Line (before circle, except for first) */}
                {index > 0 && (
                  <div
                    className="absolute top-4 right-1/2 h-0.5 w-full -z-10"
                    style={{
                      background: isCompleted || (isActive && index > 0)
                        ? '#f97316' // orange-500
                        : 'rgba(255, 255, 255, 0.1)',
                      transition: 'background 300ms ease-in-out',
                    }}
                  />
                )}

                {/* Stage Circle */}
                <motion.div
                  className="relative flex items-center justify-center rounded-full"
                  style={{
                    width: 32,
                    height: 32,
                    background: isCompleted
                      ? '#f97316' // orange-500
                      : isActive
                      ? 'transparent'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: isActive ? '2px solid #f97316' : 'none',
                    transition: 'background 300ms, border 300ms',
                    willChange: 'transform',
                  }}
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.05, 1],
                        }
                      : {}
                  }
                  transition={
                    isActive
                      ? {
                          repeat: Infinity,
                          duration: 2,
                          ease: 'easeInOut',
                        }
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <IconComponent
                      className="w-4 h-4"
                      style={{
                        color: isActive
                          ? '#f97316' // orange-500
                          : 'rgba(255, 255, 255, 0.3)',
                      }}
                    />
                  )}

                  {/* Active glow effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'rgba(249, 115, 22, 0.2)',
                        filter: 'blur(8px)',
                      }}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.div>

                {/* Stage Label */}
                <div
                  className="mt-2 text-xs text-center"
                  style={{
                    color: isActive || isCompleted
                      ? 'white'
                      : 'rgba(255, 255, 255, 0.4)',
                    transition: 'color 300ms',
                  }}
                >
                  {stageData.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Stage Message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stageLabel}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="text-center text-sm text-white"
          style={{ willChange: 'transform, opacity' }}
        >
          {stageLabel}
        </motion.div>
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full relative overflow-hidden"
            animate={{ width: `${displayPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ willChange: 'width' }}
          >
            {/* Shimmer overlay for active indication */}
            <div
              className="absolute inset-0 bg-white/20 animate-pulse"
              style={{
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Percentage Display */}
      <div className="text-right">
        <span className="text-sm font-semibold text-white/70">
          {Math.round(displayPercent)}%
        </span>
      </div>

      {/* Context Message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={safeToClose ? 'safe' : 'keep-open'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center text-xs"
        >
          {safeToClose ? (
            <span className="text-green-400">
              Safe to close this tab — processing continues in the background
            </span>
          ) : displayPercent < 50 ? (
            <span className="text-orange-400">
              Large exports can take a few minutes — please keep this tab open
            </span>
          ) : (
            <span className="text-orange-400">
              Please keep this tab open until upload completes
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
