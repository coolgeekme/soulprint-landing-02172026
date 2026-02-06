'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mic, Square, ChevronRight, RotateCcw, Play, Pause } from 'lucide-react';

const BRAND_ORANGE = '#E8632B';

// Micro-story placeholders (these would be generated from pillar answers)
const MICRO_STORIES = [
  {
    pillar: 'Communication',
    icon: '🗣️',
    story: `When something lights me up, I don't just tell people—I paint it for them. I want them to see what I see, to feel what I feel. It's not about information. It's about connection.`,
  },
  {
    pillar: 'Emotional',
    icon: '💜',
    story: `I carry my feelings like weather—sometimes still, sometimes storming. I've learned that sitting with discomfort doesn't mean drowning in it. It means holding space until the sky clears.`,
  },
  {
    pillar: 'Decision',
    icon: '🧭',
    story: `I trust the pull in my gut before I trust the spreadsheet. Not because logic doesn't matter—but because my instincts have been trained by every choice I've ever made.`,
  },
  {
    pillar: 'Social',
    icon: '🌍',
    story: `Home isn't a place. It's a frequency. I find it in certain rooms, certain voices, certain silences. I code-switch because adaptation is survival—but the core never changes.`,
  },
  {
    pillar: 'Cognitive',
    icon: '🧠',
    story: `My brain doesn't walk through problems—it orbits them. I see connections where others see walls. Sometimes that's a gift. Sometimes it's a maze.`,
  },
  {
    pillar: 'Conflict',
    icon: '⚔️',
    story: `I don't avoid tension. I metabolize it. When someone crosses my line, I don't flinch—I mark the boundary and hold my ground. Respect is earned in the hard moments.`,
  },
];

type RecordingState = 'idle' | 'recording' | 'recorded' | 'playing';

interface Recording {
  blob: Blob;
  url: string;
  duration: number;
}

export default function VoicePage() {
  const router = useRouter();
  const [currentStory, setCurrentStory] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordings, setRecordings] = useState<(Recording | null)[]>(new Array(6).fill(null));
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const story = MICRO_STORIES[currentStory];
  if (!story) {
    return <div>Error: Story not found</div>;
  }

  const recording = recordings[currentStory] ?? null;
  const allRecorded = recordings.every(r => r !== null);
  const progress = ((currentStory + 1) / MICRO_STORIES.length) * 100;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recordings.forEach(r => {
        if (r?.url) URL.revokeObjectURL(r.url);
      });
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newRecordings = [...recordings];
        newRecordings[currentStory] = { blob, url, duration: recordingTime };
        setRecordings(newRecordings);
        setRecordingState('recorded');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (!recording) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audio = new Audio(recording.url);
    audioRef.current = audio;
    
    audio.onended = () => setRecordingState('recorded');
    audio.play();
    setRecordingState('playing');
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setRecordingState('recorded');
    }
  };

  const reRecord = () => {
    if (recording?.url) {
      URL.revokeObjectURL(recording.url);
    }
    const newRecordings = [...recordings];
    newRecordings[currentStory] = null;
    setRecordings(newRecordings);
    setRecordingState('idle');
    setRecordingTime(0);
  };

  const nextStory = () => {
    if (currentStory < MICRO_STORIES.length - 1) {
      setCurrentStory(prev => prev + 1);
      setRecordingState(recordings[currentStory + 1] ? 'recorded' : 'idle');
    }
  };

  const prevStory = () => {
    if (currentStory > 0) {
      setCurrentStory(prev => prev - 1);
      setRecordingState(recordings[currentStory - 1] ? 'recorded' : 'idle');
    }
  };

  const handleComplete = async () => {
    // Upload all recordings
    // TODO: Implement upload to Cloudinary/API
    console.log('Completing with recordings:', recordings);
    
    // Navigate to completion page
    router.push('/complete');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-muted-foreground">
              Story {currentStory + 1} of {MICRO_STORIES.length}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: BRAND_ORANGE }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-2xl">{story.icon}</span>
            <div>
              <h2 className="font-semibold text-foreground">{story.pillar} Story</h2>
              <p className="text-xs text-muted-foreground">Read naturally. No performance.</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-8">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* Story Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-8"
            >
              <p className="text-lg md:text-xl leading-relaxed text-foreground">
                "{story.story}"
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Recording Controls */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* Recording Button */}
            <motion.button
              onClick={recordingState === 'recording' ? stopRecording : startRecording}
              disabled={recordingState === 'recorded' || recordingState === 'playing'}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                recordingState === 'recording'
                  ? 'bg-red-500'
                  : recordingState === 'recorded'
                  ? 'bg-green-500'
                  : 'bg-primary hover:bg-primary/90'
              }`}
              whileTap={{ scale: 0.95 }}
              style={{ backgroundColor: recordingState === 'idle' ? BRAND_ORANGE : undefined }}
            >
              {recordingState === 'recording' ? (
                <Square className="w-8 h-8 text-white" fill="white" />
              ) : recordingState === 'recorded' ? (
                <span className="text-white text-2xl">✓</span>
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
              
              {/* Pulse animation when recording */}
              {recordingState === 'recording' && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.button>

            {/* Recording Time / Status */}
            <div className="text-center">
              {recordingState === 'recording' && (
                <p className="text-2xl font-mono text-red-500">{formatTime(recordingTime)}</p>
              )}
              {recordingState === 'idle' && (
                <p className="text-muted-foreground">Tap to start recording</p>
              )}
              {recordingState === 'recorded' && (
                <p className="text-green-500">Recording saved ({formatTime(recording!.duration)})</p>
              )}
            </div>

            {/* Playback Controls (when recorded) */}
            {recordingState === 'recorded' && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reRecord}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Re-record
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playRecording}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
              </div>
            )}

            {recordingState === 'playing' && (
              <Button
                variant="outline"
                size="sm"
                onClick={pausePlayback}
                className="gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStory}
            disabled={currentStory === 0}
          >
            Back
          </Button>

          {currentStory === MICRO_STORIES.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={!allRecorded}
              className="gap-2"
              style={{ backgroundColor: allRecorded ? BRAND_ORANGE : undefined }}
            >
              Complete SoulPrint
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={nextStory}
              disabled={!recording}
              className="gap-2"
              style={{ backgroundColor: recording ? BRAND_ORANGE : undefined }}
            >
              Next Story
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
