"use client";

import { Button } from "@/components/ui/button";
import { signIn, signUp, signInWithGoogle } from "@/app/actions/auth";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    router.replace("/chat");
                    return;
                }
            } catch (err) {
                console.error("Auth check error:", err);
            }
            setCheckingAuth(false);
        };
        checkAuth();
    }, [router]);

    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] bg-[#0a0a0a]">
                <Loader2 className="h-6 w-6 animate-spin text-[#EA580C]" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);

        try {
            if (isLogin) {
                const result = await signIn(formData);
                if (result?.error) {
                    setError(result.error);
                    setLoading(false);
                }
            } else {
                formData.append("name", name);
                const result = await signUp(formData);
                if (result?.error) {
                    setError(result.error);
                    setLoading(false);
                } else if (result?.success) {
                    setSuccess(true);
                    setLoading(false);
                }
            }
        } catch {
            // Server action may have redirected
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        const result = await signInWithGoogle();
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    };

    // Email confirmation success
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#0a0a0a] px-6 safe-area-inset">
                <div className="w-full max-w-sm flex flex-col items-center gap-5 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#EA580C]/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-[#EA580C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Check your email</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        We sent a link to <span className="text-white">{email}</span>
                    </p>
                    <button 
                        onClick={() => { setSuccess(false); setIsLogin(true); }}
                        className="mt-2 text-sm text-[#EA580C]"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#0a0a0a] text-white safe-area-inset">
            {/* Main content - centered */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Logo + Brand */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg shadow-[#EA580C]/20 border border-white/10">
                        <Image
                            src="/images/Soulprintengine-logo.png"
                            alt="SoulPrint"
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        SoulPrint
                    </h1>
                    <p className="text-sm text-gray-500">
                        Your AI, personalized
                    </p>
                </div>

                {/* Auth Card */}
                <div className="w-full max-w-sm">
                    {/* Tabs */}
                    <div className="flex mb-5 bg-[#141414] rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(true); setError(""); }}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                isLogin 
                                    ? "bg-[#1f1f1f] text-white shadow-sm" 
                                    : "text-gray-500"
                            }`}
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsLogin(false); setError(""); }}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                                !isLogin 
                                    ? "bg-[#1f1f1f] text-white shadow-sm" 
                                    : "text-gray-500"
                            }`}
                        >
                            Sign up
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                        {!isLogin && (
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                                autoComplete="name"
                                className="w-full h-12 px-4 bg-[#141414] border border-white/5 rounded-xl text-[15px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#EA580C]/50 transition-colors"
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full h-12 px-4 bg-[#141414] border border-white/5 rounded-xl text-[15px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#EA580C]/50 transition-colors"
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            minLength={isLogin ? undefined : 6}
                            className="w-full h-12 px-4 bg-[#141414] border border-white/5 rounded-xl text-[15px] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#EA580C]/50 transition-colors"
                        />

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-[#EA580C] hover:bg-[#d14d0a] text-white font-medium text-[15px] rounded-xl disabled:opacity-60 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                isLogin ? "Log in" : "Create account"
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center my-5">
                        <div className="flex-1 border-t border-white/5" />
                        <span className="px-3 text-xs text-gray-600">or</span>
                        <div className="flex-1 border-t border-white/5" />
                    </div>

                    {/* Google */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full h-12 bg-white hover:bg-gray-100 text-[#1f1f1f] font-medium text-[15px] rounded-xl flex items-center justify-center gap-3 disabled:opacity-60 transition-all active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Continue with Google
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 text-center">
                <a 
                    href="https://shoulprint-hero.vercel.app" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-600"
                >
                    Learn more →
                </a>
            </div>
        </div>
    );
}
