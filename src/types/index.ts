import { v4 as uuidv4 } from 'uuid';

export interface Card {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  coverColor?: string;
  wanLink?: string;
  lanLink?: string;
  openInNewWindow?: boolean;
  position?: number;
}

export interface Category {
  id: string;
  title: string;
  color: string;
  position?: number;
  cards: Card[];
}

export interface HeadConfig {
  name?: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundBlur?: number;
  unsplashCollectionId?: string;
  desktopColumns?: number; // 1-8, cards per row on desktop
  navOpacity?: number; // 0-100
  overlayOpacity?: number; // 0-100
  categoryOpacity?: number; // 0-100
  cardOpacity?: number; // 0-100
}

export interface LayoutConfig {
  head?: HeadConfig;
}

export interface AppData {
  categories: Category[];
  layout?: LayoutConfig;
  updatedAt?: string;
}

interface LegacyCard {
  id?: string;
  title?: string;
  description?: string;
  remark?: string;
  cover?: string;
  coverColor?: string;
  wanLink?: string;
  lanLink?: string;
  openInNewWindow?: boolean;
  position?: number;
}

interface LegacyCategory {
  id?: string;
  title?: string;
  color?: string;
  position?: number;
  style?: { color?: string };
  cards?: LegacyCard[];
}

interface LegacyProfile {
  layout?: {
    head?: {
      name?: string;
      backgroundImage?: string;
      backgroundBlur?: number;
    };
  };
  categories?: LegacyCategory[];
}

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

export const createDefaultData = (): AppData => {
  return {
    layout: {
      head: {
        name: 'Home',
        subtitle: '',
        backgroundBlur: 0,
        unsplashCollectionId: '',
        desktopColumns: 4,
        navOpacity: 62,
        overlayOpacity: 70,
        categoryOpacity: 5,
        cardOpacity: 5,
      },
    },
    categories: [
      {
        id: uuidv4(),
        title: '常用',
        color: DEFAULT_COLORS[0],
        position: 0,
        cards: [],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
};

const convertLegacyPayload = (payload: unknown): AppData | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const root = payload as Record<string, unknown>;
  const candidate = (root.default as LegacyProfile) || (Object.values(root)[0] as LegacyProfile);
  if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.categories)) return null;

  return {
    layout: {
      head: {
        name: candidate.layout?.head?.name || 'Home',
        backgroundImage: candidate.layout?.head?.backgroundImage || '',
        backgroundBlur: candidate.layout?.head?.backgroundBlur ?? 0,
        unsplashCollectionId: '',
        desktopColumns: 4,
        navOpacity: 62,
        overlayOpacity: 70,
        categoryOpacity: 5,
        cardOpacity: 5,
      },
    },
    categories: candidate.categories.map((category, categoryIndex) => ({
      id: category.id || uuidv4(),
      title: category.title || `分类 ${categoryIndex + 1}`,
      color: category.color || category.style?.color || DEFAULT_COLORS[categoryIndex % DEFAULT_COLORS.length],
      position: category.position ?? categoryIndex,
      cards: (category.cards || []).map((card, cardIndex) => ({
        id: card.id || uuidv4(),
        title: card.title || `卡片 ${cardIndex + 1}`,
        description: card.description || card.remark || '',
        cover: card.cover || '',
        coverColor: card.coverColor || '',
        wanLink: card.wanLink || '',
        lanLink: card.lanLink || '',
        openInNewWindow: card.openInNewWindow ?? true,
        position: card.position ?? cardIndex,
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
};

export const normalizeData = (payload: AppData | Record<string, unknown>): AppData => {
  const legacy = convertLegacyPayload(payload);
  if (legacy) {
    return legacy;
  }

  const normalizedPayload = payload as AppData;
  const categories = (normalizedPayload.categories || []).map((category, categoryIndex) => ({
    ...category,
    id: category.id || uuidv4(),
    title: category.title || `分类 ${categoryIndex + 1}`,
    color: category.color || DEFAULT_COLORS[categoryIndex % DEFAULT_COLORS.length],
    position: category.position ?? categoryIndex,
    cards: (category.cards || []).map((card, cardIndex) => ({
      ...card,
      id: card.id || uuidv4(),
      title: card.title || `卡片 ${cardIndex + 1}`,
      position: card.position ?? cardIndex,
      openInNewWindow: card.openInNewWindow ?? true,
    })),
  }));

  return {
    layout: {
      ...(normalizedPayload.layout || createDefaultData().layout),
      head: {
        ...(normalizedPayload.layout?.head || createDefaultData().layout?.head),
        backgroundBlur: Math.min(Math.max(normalizedPayload.layout?.head?.backgroundBlur ?? 0, 0), 40),
        unsplashCollectionId: normalizedPayload.layout?.head?.unsplashCollectionId || '',
        desktopColumns: Math.min(Math.max(normalizedPayload.layout?.head?.desktopColumns ?? 4, 1), 8),
        navOpacity: normalizedPayload.layout?.head?.navOpacity ?? 62,
        overlayOpacity: normalizedPayload.layout?.head?.overlayOpacity ?? 70,
        categoryOpacity: normalizedPayload.layout?.head?.categoryOpacity ?? 5,
        cardOpacity: normalizedPayload.layout?.head?.cardOpacity ?? 5,
      },
    },
    categories: categories.length > 0 ? categories : createDefaultData().categories,
    updatedAt: new Date().toISOString(),
  };
};
