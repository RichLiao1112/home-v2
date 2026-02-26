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

export interface DeletedCategoryItem {
  recycleId: string;
  deletedAt: string;
  data: Category;
}

export interface DeletedCardItem {
  recycleId: string;
  deletedAt: string;
  sourceCategoryId: string;
  sourceCategoryTitle: string;
  data: Card;
}

export interface RecycleBin {
  categories: DeletedCategoryItem[];
  cards: DeletedCardItem[];
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
  siteImage?: string;
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
  recycleBin?: RecycleBin;
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
const DEFAULT_RECYCLE_RETENTION_DAYS = 30;

const getRecycleRetentionDays = () => {
  const raw =
    process.env.NEXT_PUBLIC_RECYCLE_RETENTION_DAYS ||
    process.env.RECYCLE_RETENTION_DAYS ||
    String(DEFAULT_RECYCLE_RETENTION_DAYS);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RECYCLE_RETENTION_DAYS;
  return Math.min(365, Math.max(1, Math.floor(parsed)));
};

const isNotExpired = (deletedAt: string, nowMs: number, retentionDays: number) => {
  const deletedAtMs = Date.parse(deletedAt);
  if (!Number.isFinite(deletedAtMs)) return true;
  return nowMs - deletedAtMs <= retentionDays * 24 * 60 * 60 * 1000;
};

export const createDefaultData = (): AppData => {
  return {
    layout: {
      head: {
        name: 'Home',
        subtitle: '',
        siteImage: '',
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
    recycleBin: {
      categories: [],
      cards: [],
    },
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
        siteImage: '',
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
      color: category.color ?? category.style?.color ?? DEFAULT_COLORS[categoryIndex % DEFAULT_COLORS.length],
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
    recycleBin: {
      categories: [],
      cards: [],
    },
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
    color: typeof category.color === 'string' ? category.color : DEFAULT_COLORS[categoryIndex % DEFAULT_COLORS.length],
    position: category.position ?? categoryIndex,
    cards: (category.cards || []).map((card, cardIndex) => ({
      ...card,
      id: card.id || uuidv4(),
      title: card.title || `卡片 ${cardIndex + 1}`,
      position: card.position ?? cardIndex,
      openInNewWindow: card.openInNewWindow ?? true,
    })),
  }));
  const recycleBin = {
    categories: Array.isArray(normalizedPayload.recycleBin?.categories)
      ? normalizedPayload.recycleBin!.categories
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            recycleId: item.recycleId || uuidv4(),
            deletedAt: item.deletedAt || new Date().toISOString(),
            data: {
              ...item.data,
              id: item.data?.id || uuidv4(),
              title: item.data?.title || '已删除分类',
              color: typeof item.data?.color === 'string' ? item.data.color : '',
              position: item.data?.position ?? 0,
              cards: (item.data?.cards || []).map((card, cardIndex) => ({
                ...card,
                id: card.id || uuidv4(),
                title: card.title || `卡片 ${cardIndex + 1}`,
                position: card.position ?? cardIndex,
                openInNewWindow: card.openInNewWindow ?? true,
              })),
            },
          }))
      : [],
    cards: Array.isArray(normalizedPayload.recycleBin?.cards)
      ? normalizedPayload.recycleBin!.cards
          .filter(item => item && typeof item === 'object')
          .map(item => ({
            recycleId: item.recycleId || uuidv4(),
            deletedAt: item.deletedAt || new Date().toISOString(),
            sourceCategoryId: item.sourceCategoryId || '',
            sourceCategoryTitle: item.sourceCategoryTitle || '未知分类',
            data: {
              ...item.data,
              id: item.data?.id || uuidv4(),
              title: item.data?.title || '已删除卡片',
              position: item.data?.position ?? 0,
              openInNewWindow: item.data?.openInNewWindow ?? true,
            },
          }))
      : [],
  };
  const nowMs = Date.now();
  const retentionDays = getRecycleRetentionDays();
  const prunedRecycleBin = {
    categories: recycleBin.categories.filter(item => isNotExpired(item.deletedAt, nowMs, retentionDays)),
    cards: recycleBin.cards.filter(item => isNotExpired(item.deletedAt, nowMs, retentionDays)),
  };

  return {
    layout: {
      ...(normalizedPayload.layout || createDefaultData().layout),
      head: {
        ...(normalizedPayload.layout?.head || createDefaultData().layout?.head),
        siteImage: normalizedPayload.layout?.head?.siteImage || '',
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
    recycleBin: prunedRecycleBin,
    updatedAt: new Date().toISOString(),
  };
};
