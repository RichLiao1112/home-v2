'use client';

import { Category, Card } from '@/types';
import { useAppStore } from '@/stores/appStore';
import {
  Edit2,
  GripVertical,
  Link2,
  Network,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { getBestCardLink } from '@/lib/utils';

interface CategoryCardProps {
  category: Category;
}

function SortableCard({
  categoryId,
  card,
  color,
}: {
  categoryId: string;
  card: Card;
  color: string;
}) {
  const { setEditingCard, deleteCard } = useAppStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const onOpenLink = () => {
    const url = getBestCardLink(card, window.location.hostname);
    if (!url) return;
    window.open(url, card.openInNewWindow === false ? '_self' : '_blank');
  };

  const onOpenSpecificLink = (url?: string) => {
    if (!url) return;
    window.open(url, card.openInNewWindow === false ? '_self' : '_blank');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/card surface-card relative rounded-2xl border border-white/15 p-4 backdrop-blur-lg transition ${
        isDragging ? 'z-20 shadow-lg shadow-cyan-900/40' : 'hover:border-cyan-300/30'
      }`}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover/card:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="rounded-md p-1 text-slate-300 hover:bg-white/10"
          aria-label="拖拽排序卡片"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setEditingCard({ ...card, categoryId })}
          className="rounded-md p-1 text-slate-200 hover:bg-white/10"
          aria-label="编辑卡片"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => deleteCard(card.id, categoryId)}
          className="rounded-md p-1 text-slate-300 hover:bg-rose-500/15 hover:text-rose-200"
          aria-label="删除卡片"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={onOpenLink}
        className="block w-full cursor-pointer text-left"
        aria-label={`打开 ${card.title}`}
      >
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: card.coverColor || color }}
          >
            {card.cover ? (
              <img src={card.cover} alt={`${card.title} 图标`} className="h-7 w-7 rounded object-contain" />
            ) : (
              <Link2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-50 drop-shadow-[0_1px_2px_rgba(2,6,23,0.75)]">
              {card.title}
            </h3>
            {card.description ? (
              <p className="mt-0.5 truncate text-xs text-slate-200/95 drop-shadow-[0_1px_2px_rgba(2,6,23,0.75)]">
                {card.description}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={!card.lanLink}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSpecificLink(card.lanLink);
          }}
          className={`motion-btn-hover inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold ${
            card.lanLink
              ? 'border-white/25 bg-slate-900/55 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-slate-800/70'
              : 'cursor-not-allowed border-white/10 bg-slate-900/35 text-slate-500 opacity-75'
          }`}
          aria-label={card.lanLink ? `打开 ${card.title} 的内网地址` : `${card.title} 暂无内网地址`}
        >
          <Network className="h-4 w-4" />
          LAN
        </button>
        <button
          type="button"
          disabled={!card.wanLink}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSpecificLink(card.wanLink);
          }}
          className={`motion-btn-hover inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold ${
            card.wanLink
              ? 'border-white/25 bg-slate-900/55 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-slate-800/70'
              : 'cursor-not-allowed border-white/10 bg-slate-900/35 text-slate-500 opacity-75'
          }`}
          aria-label={card.wanLink ? `打开 ${card.title} 的公网地址` : `${card.title} 暂无公网地址`}
        >
          <Globe className="h-4 w-4" />
          WAN
        </button>
      </div>
    </div>
  );
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const { setEditingCategory, setEditingCard, deleteCategory, reorderCards } = useAppStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cards = category.cards.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const onCardDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderCards(category.id, String(active.id), String(over.id));
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`surface-category rounded-2xl border border-white/10 p-4 backdrop-blur-xl sm:p-5 ${
        isDragging ? 'shadow-xl shadow-cyan-900/30' : ''
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            aria-label="拖拽排序分类"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-100 sm:text-lg">{category.title}</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setEditingCard({
                id: '',
                title: '',
                description: '',
                cover: '',
                coverColor: category.color,
                wanLink: '',
                lanLink: '',
                openInNewWindow: true,
                categoryId: category.id,
              })
            }
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-cyan-200"
            aria-label="新增卡片"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditingCategory(category)}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
            aria-label="编辑分类"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteCategory(category.id)}
            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-200"
            aria-label="删除分类"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCardDragEnd}>
        <SortableContext items={cards.map((card) => card.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
              <SortableCard key={card.id} categoryId={category.id} card={card} color={category.color} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}
