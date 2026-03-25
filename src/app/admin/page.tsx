
'use client';

import AdminScreen from './AdminScreen';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AdminContent() {
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') === 'ar' ? 'ar' : 'en';

    return (
        <AdminScreen
            onExit={() => window.location.href = '/'}
            language={lang}
        />
    );
}

export default function AdminPage() {
    return (
        <main className="min-h-screen">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Admin...</div>}>
                <AdminContent />
            </Suspense>
        </main>
    );
}
