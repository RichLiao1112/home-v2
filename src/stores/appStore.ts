'use client';

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AppData, Category, Card, LayoutConfig } from '@/types';
import { apiLoadData, apiSaveData } from '@/lib/api';
import { createDefaultData, normalizeData } from '@/types';

interface AppState {
  layout: LayoutConfig;
  categories: Category[];
  editingCategory: Category | null;
  editingCard: (Card & { categoryId?: string }) | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;

  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  setEditingCategory: (category: Category | null) => void;
  setEditingCard: (card: (Card & { categoryId?: string }) | null) => void;
  updateLayout: (layout: Partial<LayoutConfig>) => void;
  addCategory: (category: Omit<Category, 'id' | 'cards'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addCard: (card: Omit<Card, 'id'> & { categoryId: string }) => void;
  updateCard: (id: string, data: Partial<Card> & { categoryId?: string }) => void;
  deleteCard: (cardId: string, categoryId?: string) => void;
  reorderCategories: (activeId: string, overId: string) => void;
  reorderCards: (categoryId: string, activeId: string, overId: string) => void;
}

const reorderByIds = <T extends { id: string; position?: number }>(
  list: T[],
  activeId: string,
  overId: string
) => {
  const oldIndex = list.findIndex((it) => it.id === activeId);
  const newIndex = list.findIndex((it) => it.id === overId);
  if (oldIndex < 0 || newIndex < 0) return list;
  const cloned = [...list];
  const [moved] = cloned.splice(oldIndex, 1);
  cloned.splice(newIndex, 0, moved);
  return cloned.map((it, index) => ({ ...it, position: index }));
};

const toPayload = (state: AppState): AppData => ({
  layout: state.layout,
  categories: state.categories,
  updatedAt: new Date().toISOString(),
});

export const useAppStore = create<AppState>((set, get) => ({
  layout: createDefaultData().layout || {},
  categories: [],
  editingCategory: null,
  editingCard: null,
  isLoading: true,
  isSaving: false,
  error: '',

  loadData: async () => {
    set({ isLoading: true, error: '' });
    const data = await apiLoadData();
    if (!data) {
      set({ isLoading: false, error: '加载失败，请重新登录后重试' });
      return;
    }
    const normalized = normalizeData(data);
    set({
      layout: normalized.layout || {},
      categories: normalized.categories,
      isLoading: false,
      error: '',
    });
  },

  saveData: async () => {
    set({ isSaving: true });
    const success = await apiSaveData(toPayload(get()));
    set({ isSaving: false, error: success ? '' : '保存失败，请稍后再试' });
  },

  setEditingCategory: (category) => set({ editingCategory: category }),
  setEditingCard: (card) => set({ editingCard: card }),

  updateLayout: (layout) => {
    set((state) => ({ layout: { ...state.layout, ...layout } }));
  },

  addCategory: (category) => {
    set((state) => ({
      categories: [
        ...state.categories,
        {
          id: uuidv4(),
          title: category.title,
          color: category.color,
          position: state.categories.length,
          cards: [],
        },
      ],
    }));
  },

  updateCategory: (id, data) => {
    set((state) => ({
      categories: state.categories.map((it) => (it.id === id ? { ...it, ...data } : it)),
    }));
  },

  deleteCategory: (id) => {
    set((state) => ({
      categories: state.categories
        .filter((it) => it.id !== id)
        .map((it, index) => ({ ...it, position: index })),
    }));
  },

  addCard: (card) => {
    set((state) => ({
      categories: state.categories.map((category) => {
        if (category.id !== card.categoryId) return category;
        const nextCard: Card = {
          id: uuidv4(),
          title: card.title,
          description: card.description,
          cover: card.cover,
          coverColor: card.coverColor,
          wanLink: card.wanLink,
          lanLink: card.lanLink,
          openInNewWindow: card.openInNewWindow ?? true,
          position: category.cards.length,
        };
        return { ...category, cards: [...category.cards, nextCard] };
      }),
    }));
  },

  updateCard: (id, data) => {
    set((state) => {
      const sourceCategory = state.categories.find((it) => it.cards.some((card) => card.id === id));
      if (!sourceCategory) return state;

      const sourceCard = sourceCategory.cards.find((card) => card.id === id);
      if (!sourceCard) return state;

      const targetCategoryId = data.categoryId || sourceCategory.id;

      if (targetCategoryId === sourceCategory.id) {
        return {
          ...state,
          categories: state.categories.map((category) =>
            category.id === sourceCategory.id
              ? {
                  ...category,
                  cards: category.cards.map((card) =>
                    card.id === id ? { ...card, ...data } : card
                  ),
                }
              : category
          ),
        };
      }

      const movedCard = { ...sourceCard, ...data };
      return {
        ...state,
        categories: state.categories.map((category) => {
          if (category.id === sourceCategory.id) {
            return {
              ...category,
              cards: category.cards
                .filter((card) => card.id !== id)
                .map((card, index) => ({ ...card, position: index })),
            };
          }

          if (category.id === targetCategoryId) {
            return {
              ...category,
              cards: [...category.cards, { ...movedCard, position: category.cards.length }],
            };
          }
          return category;
        }),
      };
    });
  },

  deleteCard: (cardId, categoryId) => {
    set((state) => ({
      categories: state.categories.map((category) => {
        if (categoryId && category.id !== categoryId) return category;
        return {
          ...category,
          cards: category.cards
            .filter((card) => card.id !== cardId)
            .map((card, index) => ({ ...card, position: index })),
        };
      }),
    }));
  },

  reorderCategories: (activeId, overId) => {
    set((state) => ({ categories: reorderByIds(state.categories, activeId, overId) }));
  },

  reorderCards: (categoryId, activeId, overId) => {
    set((state) => ({
      categories: state.categories.map((category) =>
        category.id === categoryId ? { ...category, cards: reorderByIds(category.cards, activeId, overId) } : category
      ),
    }));
  },
}));