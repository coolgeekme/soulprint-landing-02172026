'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const JSON_PARSE_ERROR_HINT = 'Unexpected non-whitespace character after JSON';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/dashboard');
        return;
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const normalizeError = (message: string) => {
    if (message.includes(JSON_PARSE_ERROR_HINT)) {
      return 'Authentication service returned an invalid response. Please retry with Google sign-in, or contact support if this persists.';
    }

    return message;
  };

  const handleEmailPasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(normalizeError(authError.message));
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-white/10 rounded-2xl bg-[#0a0a0a] p-8">
        <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
        <p className="text-white/60 text-sm mb-6">Sign in with Google or your email and password.</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full mb-4 rounded-xl bg-white text-black py-3 font-medium disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="h-px bg-white/10 flex-1" />
          <span className="text-white/40 text-xs">or</span>
          <span className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={handleEmailPasswordSignIn} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-orange-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-orange-500"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-3 font-semibold disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
