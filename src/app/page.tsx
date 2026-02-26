'use client';

import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import CategoryList from '@/components/CategoryList';
import AddButton from '@/components/AddButton';
import EditModal from '@/components/EditModal';

export default function Home() {
  const { isAuthenticated, isChecking, checkAuth } = useAuthStore();
  const { categories, layout, loadData, saveData, isLoading, isSaving, error } = useAppStore();

  useEffect(() => {
    checkAuth().catch(() => undefined);
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const keyFromUrl =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('key')?.trim() : '';
    loadData(keyFromUrl || undefined).catch(() => undefined);
  }, [isAuthenticated, loadData]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    const timer = window.setTimeout(() => {
      saveData().catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [categories, layout, isAuthenticated, isLoading, saveData]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-500 border-t-cyan-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const pageOverlayOpacity = Math.min(Math.max(layout.head?.overlayOpacity ?? 70, 0), 100);

  const surfaceVars: CSSProperties = {
    ['--category-opacity' as string]: `${(Math.min(Math.max(layout.head?.categoryOpacity ?? 5, 0), 100) / 100).toFixed(2)}`,
    ['--card-opacity' as string]: `${(Math.min(Math.max(layout.head?.cardOpacity ?? 5, 0), 100) / 100).toFixed(2)}`,
    ['--card-hover-opacity' as string]: `${Math.min(
      Math.max((layout.head?.cardOpacity ?? 5) / 100 + 0.05, 0.06),
      0.35
    ).toFixed(2)}`,
  };

  return (
    <div
      className="min-h-screen bg-slate-950"
      style={
        layout.head?.backgroundImage
          ? {
              ...surfaceVars,
              backgroundImage: `url(${layout.head.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundAttachment: 'fixed',
              backgroundPosition: 'center',
            }
          : surfaceVars
      }
    >
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundColor: `rgba(2, 6, 23, ${pageOverlayOpacity / 100})`,
          backdropFilter: `blur(${layout.head?.backgroundBlur ?? 0}px)`,
        }}
      />
      <div className="relative z-10">
      <Header />
      <main className="mx-auto w-full max-w-[1720px] px-4 pb-24 pt-32 sm:px-6 sm:pt-24 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          </div>
        ) : (
          <CategoryList />
        )}
      </main>
      {isSaving ? (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs text-slate-100 backdrop-blur-md">
          正在保存...
        </div>
      ) : null}
      <AddButton />
      <EditModal />
      </div>
    </div>
  );
}
