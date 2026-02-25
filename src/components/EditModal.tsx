'use client';

import { useAppStore } from '@/stores/appStore';
import CategoryEditForm from './CategoryEditForm';
import CardEditForm from './CardEditForm';

export default function EditModal() {
  const { editingCategory, editingCard, setEditingCategory, setEditingCard } = useAppStore();

  if (!editingCategory && !editingCard) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => {
          setEditingCategory(null);
          setEditingCard(null);
        }}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto">
        {editingCategory && <CategoryEditForm />}
        {editingCard && <CardEditForm />}
      </div>
    </div>
  );
}
