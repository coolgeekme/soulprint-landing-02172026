'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Shield, CheckCircle2, AlertCircle, Loader2, Lock, FileArchive, Clock, ExternalLink } from 'lucide-react';
import { SpotlightCard } from '@/components/ui/spotlight';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { RingProgress } from '@/components/ui/ring-progress';
import { generateClientSoulprint, type ClientSoulprint } from '@/lib/import/client-soulprint';

type ImportStatus = 'idle' | 'processing' | 'saving' | 'success' | 'error';

export default function ImportPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [soulprint, setSoulprint] = useState<ClientSoulprint | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch('/api/memory/status');
        const data = await res.json();
        if (data.status === 'ready' || data.hasSoulprint) {
          router.push('/chat');
          return;
        }
      } catch {}
      setCheckingExisting(false);
    };
    checkExisting();
  }, [router]);

  if (checkingExisting) {
    return (
      <main className="h-screen bg-black flex items-center justify-center overflow-hidden">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </main>
    );
  }

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setErrorMessage('Please upload a ZIP file');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setProgress(0);

    try {
      const { soulprint: result, conversationChunks } = await generateClientSoulprint(file, (stage, percent) => {
        setProgressStage(stage);
        setProgress(percent);
      });

      setSoulprint(result);
      setStatus('saving');
      setProgressStage('Saving your memories...');
      setProgress(90);

      const response = await fetch('/api/import/save-soulprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soulprint: result, conversationChunks }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setProgress(100);
      setStatus('success');
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Processing failed');
      setStatus('error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  return (
    <main className="min-h-screen bg-black flex flex-col overflow-x-hidden relative">
      {/* Background Beams */}
      <BackgroundBeams />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="SoulPrint" className="w-7 h-7" />
            <span className="text-white font-semibold">SoulPrint</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs">
          <Lock className="w-3 h-3" />
          <span>100% Private</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center px-4 md:px-6 py-8 lg:py-12 relative z-10 gap-8 lg:gap-12">
        
        {/* Left Side - Upload Zone & States */}
        <div className="w-full max-w-md">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 text-center lg:text-left">
            Import Your ChatGPT History
          </h1>
          <p className="text-white/50 text-sm md:text-base mb-6 text-center lg:text-left">
            Upload your data export and we'll create your personalized AI.
          </p>

          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <SpotlightCard
                  className={`
                    cursor-pointer border-2 border-dashed transition-all duration-200
                    ${dragActive 
                      ? 'border-orange-500 bg-orange-500/10' 
                      : 'border-white/15 bg-white/[0.02] hover:border-orange-500/40'
                    }
                  `}
                >
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 md:p-10 text-center"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${dragActive ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                      <Upload className={`w-7 h-7 transition-colors ${dragActive ? 'text-orange-400' : 'text-white/40'}`} />
                    </div>
                    <p className="text-white font-semibold text-lg mb-1">
                      {dragActive ? 'Drop to upload' : 'Drop your ZIP file here'}
                    </p>
                    <p className="text-white/40 text-sm">or click to browse</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            )}

            {(status === 'processing' || status === 'saving') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-8 md:p-10 text-center"
              >
                <div className="mb-6">
                  <RingProgress 
                    progress={progress} 
                    size={100} 
                    strokeWidth={6}
                  />
                </div>
                <p className="text-white/60 text-sm mb-4">{progressStage || 'Processing...'}</p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-green-500/20 bg-green-500/5 backdrop-blur-sm p-8 md:p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </motion.div>
                <h3 className="text-white font-semibold text-xl mb-2">Import Complete</h3>
                <p className="text-white/50 text-sm mb-6">Your AI now knows you</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/chat')}
                  className="px-8 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-xl transition-colors"
                >
                  Start Chatting
                </motion.button>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm p-8 md:p-10 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Something went wrong</h3>
                <p className="text-white/50 text-sm mb-6">{errorMessage}</p>
                <button
                  onClick={() => { setStatus('idle'); setErrorMessage(''); }}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 rounded-xl transition-colors font-medium"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side - Info Cards (always visible) */}
        {status === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-md lg:max-w-sm space-y-4"
          >
            {/* How to Export */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <FileArchive className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-white font-medium">How to export from ChatGPT</h3>
              </div>
              <ol className="space-y-2 text-sm text-white/60">
                <li className="flex gap-2">
                  <span className="text-orange-400 font-medium">1.</span>
                  Go to ChatGPT → Settings → Data controls
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-400 font-medium">2.</span>
                  Click "Export data" and confirm
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-400 font-medium">3.</span>
                  Download the ZIP from OpenAI's email
                </li>
              </ol>
              <a 
                href="https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Detailed guide <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Privacy */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-white font-medium">100% Private</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-white/60">
                <li>• All processing happens in your browser</li>
                <li>• Your data never leaves your device</li>
                <li>• No uploads to external servers</li>
              </ul>
            </div>

            {/* Processing Time */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-white font-medium">Processing Time</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-white/60">
                <li>• Small (~100 chats): ~30 seconds</li>
                <li>• Medium (~500 chats): 1-2 minutes</li>
                <li>• Large (1000+ chats): 3-5 minutes</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
