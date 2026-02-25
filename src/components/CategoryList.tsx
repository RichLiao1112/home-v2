'use client';

import { useAppStore } from '@/stores/appStore';
import CategoryCard from './CategoryCard';
import { FolderOpen } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function CategoryList() {
  const { categories, reorderCategories } = useAppStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderCategories(String(active.id), String(over.id));
  };

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-24 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800">
          <FolderOpen className="h-10 w-10 text-slate-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-100">还没有分类</h3>
        <p className="max-w-sm text-slate-400">
          点击右下角的 + 按钮创建第一个分类，开始管理您的导航链接
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={categories.map((category) => category.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-5">
          {categories
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
