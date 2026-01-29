'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Shield, CheckCircle2, AlertCircle, Loader2, Lock, Clock, Database, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateClientSoulprint, type ClientSoulprint } from '@/lib/import/client-soulprint';

type ImportStatus = 'idle' | 'processing' | 'saving' | 'success' | 'error';

const faqs = [
  {
    icon: Shield,
    title: 'Privacy',
    content: (
      <div className="space-y-2">
        <p className="text-xs text-white/90 font-medium font-mono">100% local processing</p>
        <ul className="text-xs text-white/60 space-y-1 font-mono">
          <li>• Data never leaves your browser</li>
          <li>• No external server calls</li>
          <li>• You own and control everything</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Database,
    title: "What's included",
    content: (
      <div className="space-y-2">
        <p className="text-xs text-white/90 font-mono">Your ChatGPT export contains:</p>
        <ul className="text-xs text-white/60 space-y-1 font-mono">
          <li>• All conversation history</li>
          <li>• Topics you've discussed</li>
          <li>• Your communication style</li>
          <li>• Interests and preferences</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Clock,
    title: 'How long',
    content: (
      <div className="space-y-2">
        <p className="text-xs text-white/90 font-mono">Processing time:</p>
        <ul className="text-xs text-white/60 space-y-1 font-mono">
          <li>• ~100 chats: ~30s</li>
          <li>• ~500 chats: 1-2min</li>
          <li>• 1000+ chats: 3-5min</li>
        </ul>
      </div>
    ),
  },
  {
    icon: Zap,
    title: 'What happens',
    content: (
      <div className="space-y-2">
        <p className="text-xs text-white/90 font-mono">We extract:</p>
        <ul className="text-xs text-white/60 space-y-1 font-mono">
          <li>• Key facts about you</li>
          <li>• Writing patterns & style</li>
          <li>• Topics you care about</li>
          <li>• Your unique AI profile</li>
        </ul>
      </div>
    ),
  },
];

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
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
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
      setProgressStage('Saving memories...');
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
    <TooltipProvider delayDuration={100}>
      <main className="h-screen bg-black flex flex-col overflow-hidden relative">
        {/* Subtle dot grid background */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="SoulPrint" className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-white font-semibold text-sm tracking-tight">SoulPrint</span>
          </Link>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-white/5 border border-white/10 text-white/50 text-xs font-mono cursor-default">
                <Lock className="w-3 h-3" />
                <span>local</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-900 border border-white/10 text-white/80 rounded-sm">
              <p className="text-xs font-mono">All processing happens in your browser</p>
            </TooltipContent>
          </Tooltip>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 relative z-10 min-h-0 py-4 md:py-8">
          {/* Title */}
          <h1 className="font-koulen text-3xl md:text-5xl text-white mb-6 md:mb-8 text-center tracking-wide">
            Import Your ChatGPT History
          </h1>

          {/* How to export steps */}
          <div className="text-center mb-6 md:mb-8">
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-3">How to export</p>
            <div className="text-white/60 text-sm md:text-base font-mono space-y-1">
              <p><span className="text-orange-500">1.</span> ChatGPT → Settings</p>
              <p><span className="text-orange-500">2.</span> Click "Export data"</p>
              <p><span className="text-orange-500">3.</span> Download the ZIP</p>
            </div>
          </div>

          {/* Upload Zone / States */}
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      cursor-pointer border border-dashed transition-colors duration-150
                      rounded-sm p-8 md:p-12 text-center
                      ${dragActive 
                        ? 'border-orange-500 bg-orange-500/5' 
                        : 'border-white/20 bg-white/[0.02] hover:border-white/40 hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      className="hidden"
                    />
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center mx-auto mb-4 transition-colors ${dragActive ? 'bg-orange-500/10' : 'bg-white/5'}`}>
                      <Upload className={`w-5 h-5 transition-colors ${dragActive ? 'text-orange-500' : 'text-white/40'}`} />
                    </div>
                    <p className="text-white font-medium text-base md:text-lg mb-1">
                      {dragActive ? 'Drop to upload' : 'Drop your ZIP file here'}
                    </p>
                    <p className="text-white/40 text-sm font-mono">or click to browse</p>
                  </div>
                </motion.div>
              )}

              {(status === 'processing' || status === 'saving') && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-sm border border-white/10 bg-white/[0.02] p-8 md:p-12 text-center"
                >
                  <div className="mb-6">
                    <div className="text-4xl md:text-5xl font-mono text-white font-light">
                      {progress}<span className="text-white/40">%</span>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm font-mono mb-4">{progressStage || 'Processing...'}</p>
                  <div className="w-full h-px bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-sm border border-green-500/30 bg-green-500/5 p-8 md:p-12 text-center"
                >
                  <div className="w-12 h-12 rounded-sm bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg md:text-xl mb-1">Import Complete</h3>
                  <p className="text-white/50 text-sm font-mono mb-6">Your AI now knows you</p>
                  <button
                    onClick={() => router.push('/chat')}
                    className="px-6 py-2.5 bg-white text-black font-medium rounded-sm hover:bg-white/90 transition-colors text-sm"
                  >
                    Start Chatting →
                  </button>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-sm border border-red-500/30 bg-red-500/5 p-8 md:p-12 text-center"
                >
                  <div className="w-12 h-12 rounded-sm bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-1">Something went wrong</h3>
                  <p className="text-white/50 text-sm font-mono mb-6">{errorMessage}</p>
                  <button
                    onClick={() => { setStatus('idle'); setErrorMessage(''); }}
                    className="px-6 py-2.5 bg-white/10 text-white font-medium rounded-sm hover:bg-white/15 transition-colors text-sm border border-white/10"
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ Buttons */}
          <div className="w-full max-w-xl mt-6 md:mt-10 px-2 md:px-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {faqs.map((faq, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <button className="group flex items-center justify-center gap-2 px-4 py-3 rounded-sm bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] hover:border-white/20 transition-colors">
                      <faq.icon className="w-4 h-4 text-white/30 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                      <span className="text-sm text-white/50 group-hover:text-white/80 transition-colors">
                        {faq.title}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="max-w-[280px] bg-zinc-900 border border-white/10 text-white/80 p-4 rounded-sm"
                    sideOffset={8}
                  >
                    <p className="text-white font-medium text-sm mb-2">
                      {faq.title}
                    </p>
                    {faq.content}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
