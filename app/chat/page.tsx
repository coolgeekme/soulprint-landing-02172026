'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
<<<<<<< HEAD
import { Bot, Home, Zap, Download, LogOut, Menu, X, Mic, Send } from 'lucide-react';
=======
import { TelegramChatV2 } from '@/components/chat/telegram-chat-v2';
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
};

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
<<<<<<< HEAD
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  // AI Profile State
  const [aiName, setAiName] = useState<string | null>(null);
=======
  const [aiName, setAiName] = useState<string>('SoulPrint');
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
  const [aiAvatar, setAiAvatar] = useState<string | null>(null);
  const [isNamingMode, setIsNamingMode] = useState(false);
<<<<<<< HEAD
  const [isAvatarPromptMode, setIsAvatarPromptMode] = useState(false);

  // Rename Modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // --- Effects & Logic (Preserved) ---

  // PWA Prompt Logic
  useEffect(() => {
    const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');

    if (isIos && !isStandalone && !dismissed) {
      const showTimer = setTimeout(() => setShowPwaPrompt(true), 3000);
      const hideTimer = setTimeout(() => {
        setShowPwaPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', 'true');
      }, 11000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Speech Recognition
  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.webkitSpeechRecognition && !win.SpeechRecognition) {
      alert('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = input;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current && !recognitionRef.current._manualStop) {
        try { recognition.start(); } catch { }
      }
    };
    recognition.onerror = (e: { error: string }) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setIsListening(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      setInput(finalTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
    };

    recognitionRef.current = recognition;
    recognitionRef.current._manualStop = false;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current._manualStop = true;
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Profile & History Loading
  useEffect(() => {
    const loadChatState = async () => {
      try {
        const [nameRes, avatarRes] = await Promise.all([
          fetch('/api/profile/ai-name'),
          fetch('/api/profile/ai-avatar'),
        ]);

        let loadedAiName: string | null = null;
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          if (nameData.aiName) {
            loadedAiName = nameData.aiName;
            setAiName(nameData.aiName);
          } else {
            setIsNamingMode(true);
            setMessages([{
              id: 'intro',
              role: 'assistant',
              content: "Hey! I'm your new AI — built from your memories and conversations. Before we get started, I need a name. What would you like to call me?"
            }]);
            setLoadingHistory(false);
            return;
          }
        }

        if (avatarRes.ok) {
          const avatarData = await avatarRes.json();
          if (avatarData.avatarUrl) setAiAvatar(avatarData.avatarUrl);
        }

        const res = await fetch('/api/chat/messages?limit=100');
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessages(data.messages);
          } else {
            const name = loadedAiName || 'your AI';
            setMessages([{ id: 'welcome', role: 'assistant', content: `Hey! I'm ${name}. I've got your memories loaded. What's on your mind?` }]);
          }
        }
      } catch {
        setMessages([{ id: 'welcome', role: 'assistant', content: "Hey! I've got your memories loaded. What's on your mind?" }]);
      }
      setLoadingHistory(false);
    };
    loadChatState();
  }, []);

  // Avatar Generation
  const generateAvatar = async (customPrompt?: string): Promise<boolean> => {
    setIsGeneratingAvatar(true);
    try {
      const res = await fetch('/api/profile/ai-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiAvatar(data.avatarUrl);
        setIsGeneratingAvatar(false);
        return true;
      }
    } catch {
      console.error('Failed to generate avatar');
    }
    setIsGeneratingAvatar(false);
    return false;
  };

  const handleRename = async () => {
    if (!renameInput.trim()) return;
    try {
      const res = await fetch('/api/profile/ai-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiName(data.aiName);
        setShowRenameModal(false);
        setRenameInput('');
      }
    } catch { }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
=======
  const [showSettings, setShowSettings] = useState(false);

  // Load initial state
  useEffect(() => {
    const loadChatState = async () => {
      try {
        // Check auth
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Check if AI has a name
        const nameRes = await fetch('/api/profile/ai-name');
        if (nameRes.ok) {
          const nameData = await nameRes.json();
          if (nameData.aiName) {
            setAiName(nameData.aiName);
          } else {
            // No name yet - start naming flow
            setIsNamingMode(true);
            setMessages([{
              id: 'intro',
              role: 'assistant',
              content: "Hey! I'm your new AI — built from your memories and conversations. Before we get started, I need a name. What would you like to call me?",
              timestamp: new Date(),
            }]);
            setLoadingHistory(false);
            return;
          }
        }

        // Load avatar
        const avatarRes = await fetch('/api/profile/ai-avatar');
        if (avatarRes.ok) {
          const avatarData = await avatarRes.json();
          if (avatarData.avatarUrl) {
            setAiAvatar(avatarData.avatarUrl);
          }
        }

        // Load chat history
        const historyRes = await fetch('/api/chat/messages?limit=100');
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.messages?.length > 0) {
            setMessages(data.messages.map((m: Message) => ({
              ...m,
              timestamp: new Date(),
            })));
          } else {
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: `Hey! I'm ${aiName}. I've got your memories loaded. What's on your mind?`,
              timestamp: new Date(),
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to load chat state:', error);
        setMessages([{
          id: 'error',
          role: 'assistant',
          content: "Hey! Something went wrong loading your history, but I'm here. What's on your mind?",
          timestamp: new Date(),
        }]);
      }
      setLoadingHistory(false);
    };

    loadChatState();
  }, [router]);
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59

  const saveMessage = async (role: string, content: string) => {
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch { }
  };

<<<<<<< HEAD
  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    inputRef.current?.focus();

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userContent }]);
    setInput('');
=======
  const handleSendMessage = async (content: string) => {
    if (isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
    setIsLoading(true);

    // Feature: Naming Mode
    if (isNamingMode) {
      try {
        const res = await fetch('/api/profile/ai-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: content }),
        });

        if (res.ok) {
          const data = await res.json();
          setAiName(data.aiName);
          setIsNamingMode(false);
<<<<<<< HEAD
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(), role: 'assistant',
            content: `${data.aiName}. I like it! 💫\n\nI'm ready when you are. I've got your memories loaded — ask me anything, or just tell me what's on your mind.`
          }]);
          saveMessage('assistant', "Hey! I'm your new AI — built from your memories and conversations. Before we get started, I need a name. What would you like to call me?");
          saveMessage('user', userContent);
          saveMessage('assistant', `${data.aiName}. I like it! 💫\n\nI'm ready when you are. I've got your memories loaded — ask me anything, or just tell me what's on your mind.`);
        } else {
          setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Hmm, I couldn't save that name. Try again?" }]);
        }
      } catch {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: "Something went wrong. Try giving me a name again?" }]);
      }
      setIsLoading(false);
      return;
    }

    // Feature: Avatar Prompt Mode
    if (isAvatarPromptMode) {
      const answer = userContent.toLowerCase();
      const isYes = ['yes', 'yeah', 'sure', 'ok', 'yep', 'y', 'go ahead'].some(w => answer.includes(w));
      setIsAvatarPromptMode(false);

      if (isYes) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: `Give me a moment... ✨` }]);
        saveMessage('user', userContent);
        saveMessage('assistant', `Give me a moment... ✨`);

        const success = await generateAvatar();
        if (success) {
          const msg = `There we go! That's me now. 😊\n\nI'm ready when you are.`;
          setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), role: 'assistant', content: msg }]);
          saveMessage('assistant', msg);
        } else {
          const msg = `Hmm, something went wrong. Say "try again" or we can skip it.`;
          setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), role: 'assistant', content: msg }]);
          saveMessage('assistant', msg);
          setIsAvatarPromptMode(true);
        }
      } else {
        const msg = `No problem! I'm ready when you are.`;
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: msg }]);
        saveMessage('user', userContent);
        saveMessage('assistant', msg);
=======

          const responseMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `${data.aiName}. I like it! 💫\n\nI'm ready when you are. I've got your memories loaded — ask me anything, or just tell me what's on your mind.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, responseMessage]);

          // Save to history
          saveMessage('assistant', "Hey! I'm your new AI — built from your memories and conversations. Before we get started, I need a name. What would you like to call me?");
          saveMessage('user', content);
          saveMessage('assistant', responseMessage.content);
        }
      } catch (error) {
        console.error('Failed to save name:', error);
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
      }
      setIsLoading(false);
      return;
    }

<<<<<<< HEAD
    // Default Chat
    saveMessage('user', userContent);
=======
    // Regular chat flow
    saveMessage('user', content);

>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      let responseContent = '';
      const aiId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '', timestamp: new Date() }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
<<<<<<< HEAD
        for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'text') {
              content += data.text;
              setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content } : m));
            }
          } catch { }
=======

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                responseContent += parsed.content;
                setMessages(prev =>
                  prev.map(m => m.id === aiId ? { ...m, content: responseContent } : m)
                );
              }
            } catch {}
          }
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
        }
      }

      if (responseContent) {
        saveMessage('assistant', responseContent);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, something went wrong. Try again?",
        timestamp: new Date(),
      }]);
    }

    setIsLoading(false);
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loadingHistory) {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
=======
      <div className="chat-container bg-black items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#8E8E93] text-sm">Loading your memories...</span>
        </div>
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
      </div>
    );
  }

<<<<<<< HEAD
  const safeAreaTop = 'env(safe-area-inset-top, 0px)';
  const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';

  return (
    <div className="flex h-[100dvh] bg-[#09090B] text-white overflow-hidden font-sans">

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-[300px] flex-col bg-[#0f0f11] border-r border-white/5 p-6 z-40">
        {/* Brand */}
        <div className="flex items-center gap-4 px-2 mb-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white/90">SoulPrint</span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-2">
          <Link href="/chat" className="flex items-center gap-4 px-4 py-3.5 bg-white/5 text-white rounded-xl transition-all hover:bg-white/10 group">
            <Bot className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="font-semibold tracking-wide">New Chat</span>
          </Link>
          <div className="pt-4 pb-2 px-4">
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Menu</p>
          </div>
          <Link href="/memory" className="flex items-center gap-4 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Zap className="w-5 h-5 group-hover:text-amber-400 transition-colors" />
            <span className="font-medium">Memory Bank</span>
          </Link>
          <Link href="/import" className="flex items-center gap-4 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Download className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
            <span className="font-medium">Import History</span>
          </Link>
          <Link href="/" className="flex items-center gap-4 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group">
            <Home className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
            <span className="font-medium">Home Page</span>
          </Link>
        </nav>

        {/* User / AI Profile (Bottom) */}
        <div className="pt-6 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-4 px-3 py-4 mb-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner ring-2 ring-white/5">
              {aiAvatar ? (
                <img src={aiAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">🧠</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-sm font-bold text-white/90 truncate mr-2">{aiName || 'SoulPrint'}</p>
                <button onClick={() => setShowRenameModal(true)} className="text-[10px] bg-white/10 hover:bg-orange-500 hover:text-white px-1.5 py-0.5 rounded text-white/50 transition-colors">EDIT</button>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-xs text-white/40 truncate font-medium">Active Memory</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-3 px-4 py-3 w-full text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all group font-medium"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>


      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-[#09090B]">

        {/* Mobile Header (Hidden on Desktop) */}
        <header
          className="md:hidden flex-shrink-0 bg-[#09090B]/90 backdrop-blur-md border-b border-white/5 z-30"
          style={{ paddingTop: safeAreaTop }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center overflow-hidden">
                {aiAvatar ? (
                  <img src={aiAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">🧠</span>
                )}
              </div>
              <span className="font-semibold">{aiName || 'SoulPrint'}</span>
            </div>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-white/60 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="absolute top-full left-0 right-0 bg-[#151516] border-b border-white/10 p-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
              <nav className="flex flex-col gap-1">
                <button onClick={() => { setShowRenameModal(true); setShowMobileMenu(false); }} className="p-3 text-left text-sm font-medium text-white/80 hover:bg-white/5 rounded-lg">Rename AI</button>
                <Link href="/memory" className="p-3 text-sm font-medium text-white/80 hover:bg-white/5 rounded-lg">Memory</Link>
                <Link href="/import" className="p-3 text-sm font-medium text-white/80 hover:bg-white/5 rounded-lg">Import</Link>
                <button onClick={handleSignOut} className="p-3 text-left text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg">Sign Out</button>
              </nav>
            </div>
          )}
        </header>

        {/* --- MESSAGES AREA --- */}
        <main className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-12 lg:px-16" style={{ scrollBehavior: 'smooth' }}>
          <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full py-8 md:py-16 space-y-10 md:space-y-12">
            {messages.map((msg) => (
              msg.role === 'user' ? (
                <div key={msg.id} className="flex justify-end pl-12 md:pl-24">
                  <div className="bg-[#f97415] text-white px-6 py-5 md:px-8 md:py-6 rounded-[28px] rounded-tr-none max-w-full shadow-lg shadow-orange-500/10">
                    <p className="text-[16px] md:text-[17px] leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-4 md:gap-6 pr-6 md:pr-12 max-w-full">
                  {/* Avatar visible on desktop messages too for cleaner look */}
                  <div className="hidden md:flex w-10 h-10 rounded-full bg-white/5 items-center justify-center shrink-0 mt-1 border border-white/10 overflow-hidden ring-2 ring-black">
                    {aiAvatar ? <img src={aiAvatar} alt="" className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-orange-500" />}
                  </div>

                  <div className="flex flex-col gap-2 max-w-full min-w-0">
                    <span className="md:hidden text-xs font-bold text-white/30 uppercase tracking-widest px-1">{aiName || 'SoulPrint'}</span>
                    <span className="hidden md:block text-sm font-semibold text-white/40 px-1">{aiName || 'SoulPrint'}</span>
                    <div className="text-white/90 text-[16px] md:text-[17px] leading-relaxed md:leading-8 whitespace-pre-wrap break-words rounded-2xl md:rounded-3xl md:rounded-tl-none bg-white/[0.02] md:bg-transparent p-4 md:p-0 border border-white/5 md:border-none">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-4 md:gap-6 opacity-60">
                <div className="hidden md:flex w-10 h-10 rounded-full bg-white/5 items-center justify-center shrink-0 border border-white/10">
                  <Bot className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-white/40 px-1">{aiName || 'Bot'}</span>
                  <div className="flex gap-2 py-2 px-1">
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4 md:h-8" />
          </div>
        </main>

        {/* --- FOOTER INPUT --- */}
        <footer
          className="flex-shrink-0 bg-[#09090B] px-4 sm:px-6 md:px-12 lg:px-16 pb-6 pt-4 relative z-20"
          style={{ paddingBottom: `calc(${safeAreaBottom} + ${isListening ? '24px' : '40px'})` }}
        >
          {/* Gradient overlay to fade messages behind wrapper */}
          <div className="absolute top-[-60px] left-0 right-0 h-16 bg-gradient-to-t from-[#09090B] to-transparent pointer-events-none" />

          <div className="max-w-4xl mx-auto w-full relative">
            <form onSubmit={handleSubmit} className="relative group">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Message your soul..."}
                className="w-full h-16 md:h-20 bg-[#161617] hover:bg-[#1c1c1d] focus:bg-[#1c1c1d] border border-white/5 hover:border-white/10 rounded-[32px] pl-8 pr-20 text-[17px] text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500/30 transition-all shadow-2xl"
                autoComplete="off"
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {input.trim() ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-10 h-10 md:w-14 md:h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5 md:w-6 md:h-6 ml-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
                  >
                    <Mic className="w-5 h-5 md:w-7 md:h-7" />
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-[11px] md:text-sm text-white/20 mt-4 font-medium tracking-wide">
              SoulPrint remembers your conversations forever.
            </p>
          </div>
        </footer>

        {/* PWA Prompt (Mobile Only usually) */}
        {showPwaPrompt && (
          <div className="absolute bottom-20 left-4 right-4 md:bottom-8 md:right-8 md:left-auto md:w-80 bg-[#1c1c1d] border border-white/10 rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📲</span>
              <div className="flex-1">
                <p className="text-sm text-white/90 font-medium mb-1">Install App</p>
                <p className="text-xs text-white/60">Tap <span className="text-orange-400">Share</span> then <span className="text-orange-400">Add to Home Screen</span> for the best experience.</p>
              </div>
              <button onClick={() => setShowPwaPrompt(false)}><X className="w-4 h-4 text-white/40" /></button>
            </div>
          </div>
        )}

      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1d] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-white mb-2">Rename AI</h3>
            <p className="text-sm text-white/50 mb-6">Give your memory a unique name.</p>

            <input
              type="text"
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              placeholder="e.g. Atlas, Echo, Jarvis..."
              className="w-full h-12 bg-[#2c2c2e] border border-white/5 rounded-xl px-4 text-white placeholder:text-white/20 outline-none focus:ring-2 focus:ring-orange-500/50 mb-6"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={() => setShowRenameModal(false)} className="flex-1 h-12 rounded-xl font-medium text-white/60 hover:bg-white/5 transition-colors">Cancel</button>
              <button
                onClick={handleRename}
                disabled={!renameInput.trim()}
                className="flex-1 h-12 bg-orange-500 hover:bg-orange-400 rounded-xl font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Changes
=======
  return (
    <>
      <div className="chat-container">
        <TelegramChatV2
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          aiName={aiName}
          aiAvatar={aiAvatar || undefined}
          onBack={handleBack}
          onSettings={() => setShowSettings(true)}
          defaultDarkMode={true}
        />
      </div>

      {/* Settings Modal - Dark Mode */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-[#1C1C1E] w-full max-w-md rounded-t-2xl p-6 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-[#0A84FF] text-[17px] min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              >
                Done
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full text-left px-4 py-4 min-h-[50px] bg-[#2C2C2E] rounded-xl text-white active:opacity-70"
              >
                Dashboard
              </button>
              <button 
                onClick={() => router.push('/import')}
                className="w-full text-left px-4 py-4 min-h-[50px] bg-[#2C2C2E] rounded-xl text-white active:opacity-70"
              >
                Import More Memories
              </button>
              <button 
                onClick={handleSignOut}
                className="w-full text-left px-4 py-4 min-h-[50px] bg-[#2C2C2E] rounded-xl text-[#FF453A] active:opacity-70"
              >
                Sign Out
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
              </button>
            </div>
          </div>
        </div>
      )}
<<<<<<< HEAD

    </div>
=======
    </>
>>>>>>> 115f75ce150e011fdb2c0013d2be71e187804e59
  );
}
