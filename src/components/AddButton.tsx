'use client';

import { useState } from 'react';
import { Plus, X, Folder, Grid3X3 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

export default function AddButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { setEditingCategory, setEditingCard } = useAppStore();

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
        <div className="absolute bottom-16 right-0 mb-2 space-y-2">
          <button
            onClick={handleAddCategory}
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-slate-900/95 px-4 py-2 text-slate-100 shadow-lg transition hover:bg-slate-800"
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm">添加分类</span>
          </button>
          <button
            onClick={handleAddCard}
            className="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-white/15 bg-slate-900/95 px-4 py-2 text-slate-100 shadow-lg transition hover:bg-slate-800"
          >
            <Grid3X3 className="w-4 h-4" />
            <span className="text-sm">添加卡片</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? 'rotate-45 bg-slate-700' : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:shadow-cyan-900/40'
        }`}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <Plus className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}
