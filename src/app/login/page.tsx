'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';

function LoginContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const redirectTo = searchParams.get('redirectTo') || '/admin';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message || 'Invalid email or password.');
            setLoading(false);
        } else {
            router.push(redirectTo);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center">
                    <div className="text-5xl mb-4">📚</div>
                    <h1 className="text-3xl font-bold text-white">Rawy Admin</h1>
                    <p className="mt-2 text-sm text-gray-400">Sign in to access the dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email address"
                        required
                        autoComplete="email"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        autoComplete="current-password"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />

                    {error && (
                        <div className="rounded-lg bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
