'use client';

import { useState } from 'react';
import { Plus, X, FolderOpen, BookmarkPlus, Save, Trash2, Settings, LogOut, Gauge } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';

export default function AddButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { setEditingCategory, setEditingCard } = useAppStore();
  const { logout } = useAuthStore();

  const OPEN_SNAPSHOT_EVENT = 'home-v2:open-snapshot';
  const OPEN_RECYCLE_EVENT = 'home-v2:open-recycle';

  const handleAddCategory = () => {
    setEditingCategory({
      id: '',
      title: '',
      color: '#3B82F6',
      cards: [],
    });
    setIsOpen(false);
  };

  const handleAddCard = () => {
    setEditingCard({
      id: '',
      title: '',
      description: '',
      cover: '',
      coverColor: '#3B82F6',
      wanLink: '',
      lanLink: '',
      openInNewWindow: true,
      categoryId: '',
    });
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2 w-48 space-y-1 rounded-2xl border border-white/10 bg-white/10 p-2 backdrop-blur-xl shadow-xl">
          <button
            onClick={handleAddCategory}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="text-sm">添加分类</span>
          </button>
          <button
            onClick={handleAddCard}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <BookmarkPlus className="h-4 w-4" />
            <span className="text-sm">添加卡片</span>
          </button>
          <div className="my-1 border-t border-white/10" />
          <button
            onClick={() => { window.dispatchEvent(new Event(OPEN_SNAPSHOT_EVENT)); setIsOpen(false); }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <Save className="h-4 w-4" />
            <span className="text-sm">快照</span>
          </button>
          <button
            onClick={() => { window.dispatchEvent(new Event(OPEN_RECYCLE_EVENT)); setIsOpen(false); }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-sm">回收站</span>
          </button>
          <button
            onClick={() => {
              setEditingCategory({
                id: 'layout-settings',
                title: '__layout__',
                color: '#3B82F6',
                cards: [],
              });
              setIsOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">页面设置</span>
          </button>
          <button
            onClick={() => { logout(); setIsOpen(false); }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-100 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">退出</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-lg backdrop-blur-xl transition-all duration-300 ${
          isOpen
            ? 'rotate-45 bg-white/20'
            : 'bg-white/10 border border-white/15 hover:bg-white/20'
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Gauge className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}
