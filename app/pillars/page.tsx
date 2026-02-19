'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// Brand color
const BRAND_ORANGE = '#E8632B';

// Pillar definitions
const PILLARS = [
  {
    id: 1,
    name: 'Communication Style',
    icon: '🗣️',
    description: 'How you express yourself',
    color: BRAND_ORANGE,
  },
  {
    id: 2,
    name: 'Emotional Alignment',
    icon: '💜',
    description: 'How you feel and connect',
    color: '#9333EA',
  },
  {
    id: 3,
    name: 'Decision-Making',
    icon: '🧭',
    description: 'How you choose and act',
    color: '#3B82F6',
  },
  {
    id: 4,
    name: 'Social & Cultural',
    icon: '🌍',
    description: 'How you relate to others',
    color: '#10B981',
  },
  {
    id: 5,
    name: 'Cognitive Processing',
    icon: '🧠',
    description: 'How you think and learn',
    color: '#F59E0B',
  },
  {
    id: 6,
    name: 'Conflict & Boundaries',
    icon: '⚔️',
    description: 'How you handle tension',
    color: '#EF4444',
  },
];

// All 36 questions
const QUESTIONS = [
  // Pillar 1: Communication (Q1-6)
  { pillar: 1, type: 'slider', leftLabel: 'Defend your stance', rightLabel: 'Engage discussion', prompt: "When you're not being heard:" },
  { pillar: 1, type: 'text', prompt: "What's the first thing people misunderstand about your tone?" },
  { pillar: 1, type: 'slider', leftLabel: 'Fast and concise', rightLabel: 'Slow and deliberate', prompt: 'Your natural pacing:' },
  { pillar: 1, type: 'text', prompt: 'What does silence mean to you in a conversation?' },
  { pillar: 1, type: 'slider', leftLabel: 'Hold back and wait', rightLabel: 'Push through and speak', prompt: 'When interrupted:' },
  { pillar: 1, type: 'text', prompt: 'Finish this sentence: "If I had one sentence to explain myself without apology, it would be…"' },
  
  // Pillar 2: Emotional (Q7-12)
  { pillar: 2, type: 'slider', leftLabel: 'Contain internally', rightLabel: 'Express outwardly', prompt: 'Emotional expression:' },
  { pillar: 2, type: 'text', prompt: 'What emotion is hardest for you to express out loud?' },
  { pillar: 2, type: 'slider', leftLabel: 'Fix the issue', rightLabel: 'Sit with them in it', prompt: 'When someone you care about is hurting:' },
  { pillar: 2, type: 'text', prompt: 'How do you reset after emotional conflict?' },
  { pillar: 2, type: 'slider', leftLabel: 'Guarded', rightLabel: 'Open', prompt: 'Emotional boundary style:' },
  { pillar: 2, type: 'text', prompt: 'Describe a time your emotions surprised you.' },
  
  // Pillar 3: Decision (Q13-18)
  { pillar: 3, type: 'slider', leftLabel: 'Gut feeling', rightLabel: 'Full analysis', prompt: 'Decision instinct:' },
  { pillar: 3, type: 'text', prompt: 'Describe a moment when hesitation cost you something.' },
  { pillar: 3, type: 'slider', leftLabel: 'Charge forward', rightLabel: 'Slow down and evaluate', prompt: 'Response to uncertainty:' },
  { pillar: 3, type: 'text', prompt: 'What does "acceptable risk" mean to you?' },
  { pillar: 3, type: 'slider', leftLabel: 'Move on quickly', rightLabel: 'Reflect deeply', prompt: 'Recovery after mistakes:' },
  { pillar: 3, type: 'text', prompt: 'Do you trust your future self with the consequences of your choices? Why?' },
  
  // Pillar 4: Social (Q19-24)
  { pillar: 4, type: 'slider', leftLabel: 'Observer', rightLabel: 'Participant', prompt: 'Group presence:' },
  { pillar: 4, type: 'text', prompt: 'What community or culture feels like home to you?' },
  { pillar: 4, type: 'slider', leftLabel: 'Small trusted circle', rightLabel: 'Broad network', prompt: 'Social connection preference:' },
  { pillar: 4, type: 'text', prompt: 'What values were you raised with that you kept or rejected?' },
  { pillar: 4, type: 'slider', leftLabel: 'Same self everywhere', rightLabel: 'Adapt depending on environment', prompt: 'Code-switching:' },
  { pillar: 4, type: 'text', prompt: 'What kind of people make you feel rooted and safe?' },
  
  // Pillar 5: Cognitive (Q25-30)
  { pillar: 5, type: 'slider', leftLabel: 'Concrete and literal', rightLabel: 'Abstract and conceptual', prompt: 'Thinking style:' },
  { pillar: 5, type: 'text', prompt: "When you're learning something new, what helps it stick?" },
  { pillar: 5, type: 'slider', leftLabel: 'Zoom into details', rightLabel: 'Pull back to see the whole', prompt: 'Responding to complexity:' },
  { pillar: 5, type: 'text', prompt: 'What kind of information drains you fastest?' },
  { pillar: 5, type: 'slider', leftLabel: 'Speaking out loud', rightLabel: 'Writing it down', prompt: 'Best processing mode:' },
  { pillar: 5, type: 'text', prompt: "When something doesn't make sense, what's your default move?" },
  
  // Pillar 6: Conflict (Q31-36)
  { pillar: 6, type: 'slider', leftLabel: 'Call it out immediately', rightLabel: 'Let it sit until later', prompt: 'When someone crosses a line:' },
  { pillar: 6, type: 'text', prompt: "When someone challenges you publicly, what's your instinct?" },
  { pillar: 6, type: 'slider', leftLabel: 'Quieter', rightLabel: 'Sharper or louder', prompt: 'Anger style:' },
  { pillar: 6, type: 'text', prompt: 'Do you avoid conflict, use it, or transform it?' },
  { pillar: 6, type: 'slider', leftLabel: 'Walk away', rightLabel: 'Correct and clarify', prompt: 'Being misunderstood:' },
  { pillar: 6, type: 'text', prompt: 'How would a close friend describe your conflict style?' },
];

interface Answer {
  questionIndex: number;
  value: number | string;
}

// Simple slider component
function PremiumSlider({ 
  value, 
  onValueChange, 
  leftLabel, 
  rightLabel 
}: { 
  value: number[]; 
  onValueChange: (v: number[]) => void; 
  leftLabel?: string; 
  rightLabel?: string;
}) {
  return (
    <div className="space-y-4">
      <input
        type="range"
        min={0}
        max={100}
        value={value[0]}
        onChange={(e) => onValueChange([parseInt(e.target.value)])}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
        style={{ accentColor: BRAND_ORANGE }}
      />
      <div className="flex justify-between text-sm text-white/60">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

export default function PillarsPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [sliderValue, setSliderValue] = useState([50]);
  const [textValue, setTextValue] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);

  const question = QUESTIONS[currentQuestion];
  const pillar = PILLARS.find(p => p.id === question.pillar)!;
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  // Load saved answer when question changes
  useEffect(() => {
    const saved = answers.find(a => a.questionIndex === currentQuestion);
    if (saved) {
      if (question.type === 'slider') {
        setSliderValue([saved.value as number]);
      } else {
        setTextValue(saved.value as string);
      }
    } else {
      setSliderValue([50]);
      setTextValue('');
    }
  }, [currentQuestion, answers, question.type]);

  const saveAnswer = () => {
    const value = question.type === 'slider' ? sliderValue[0] : textValue;
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionIndex !== currentQuestion);
      return [...filtered, { questionIndex: currentQuestion, value }];
    });
  };

  const handleNext = () => {
    if (question.type === 'text' && !textValue.trim()) return;
    
    saveAnswer();
    setIsTransitioning(true);
    
    setTimeout(() => {
      if (currentQuestion < QUESTIONS.length - 1) {
        setCurrentQuestion(prev => prev + 1);
      } else {
        handleComplete();
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      saveAnswer();
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestion(prev => prev - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleComplete = async () => {
    const allAnswers = [...answers];
    if (question.type === 'slider') {
      allAnswers.push({ questionIndex: currentQuestion, value: sliderValue[0] });
    } else if (textValue.trim()) {
      allAnswers.push({ questionIndex: currentQuestion, value: textValue });
    }

    localStorage.setItem('soulprint_pillars', JSON.stringify(allAnswers));
    localStorage.setItem('soulprint_pillars_complete', 'true');
    
    router.push('/chat');
  };

  const handleSkip = () => {
    // Mark as skipped (not complete) so SoulPrint can remind later
    localStorage.setItem('soulprint_pillars_skipped', 'true');
    localStorage.removeItem('soulprint_pillars_complete');
    router.push('/chat');
  };

  const canProceed = question.type === 'slider' || textValue.trim().length > 0;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Overall Progress */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-white/50">
              {currentQuestion + 1} of {QUESTIONS.length}
            </span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: BRAND_ORANGE }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          
          {/* Current Pillar */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">{pillar.icon}</span>
            <div className="flex-1">
              <h2 className="font-semibold text-white">{pillar.name}</h2>
              <p className="text-xs text-white/50">{pillar.description}</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    (currentQuestion % 6) + 1 >= i ? 'bg-orange-500' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Question Area */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-2xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Question Prompt */}
              <h1 className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                {question.prompt}
              </h1>

              {/* Answer Input */}
              {question.type === 'slider' ? (
                <div className="py-8">
                  <PremiumSlider
                    value={sliderValue}
                    onValueChange={setSliderValue}
                    leftLabel={question.leftLabel}
                    rightLabel={question.rightLabel}
                  />
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={textValue}
                    onChange={e => setTextValue(e.target.value)}
                    placeholder="Take your time. Be honest. There are no wrong answers."
                    className="w-full min-h-[200px] p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    autoFocus
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-white/30">
                    {textValue.length} characters
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 bg-black/80 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowSkipModal(true)}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              Skip
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed || isTransitioning}
              className="gap-2 text-black font-semibold"
              style={{ backgroundColor: canProceed ? BRAND_ORANGE : '#666' }}
            >
              {currentQuestion === QUESTIONS.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>

      {/* Skip Confirmation Modal */}
      <AnimatePresence>
        {showSkipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setShowSkipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowSkipModal(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="text-3xl">✨</div>
                <h3 className="text-xl font-semibold text-white">
                  No problem!
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Your SoulPrint will still learn these answers from you naturally as you chat over time.
                </p>
                <p className="text-white/50 text-sm">
                  You can also ask your SoulPrint to do the full assessment all at once whenever you're ready.
                </p>

                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    onClick={handleSkip}
                    className="w-full text-black font-semibold"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    Continue to Chat
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowSkipModal(false)}
                    className="w-full text-white/50 hover:text-white hover:bg-white/10"
                  >
                    Keep Answering
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
