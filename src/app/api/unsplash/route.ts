import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';

const UNSPLASH_API = 'https://api.unsplash.com';

const getAccessKey = () => process.env.UNSPLASH_ACCESS_KEY || '';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const accessKey = getAccessKey();
  if (!accessKey) {
    return NextResponse.json(
      { success: false, message: '未配置 UNSPLASH_ACCESS_KEY' },
      { status: 400 }
    );
  }

  const q = req.nextUrl.searchParams.get('q') || 'wallpaper';
  const page = req.nextUrl.searchParams.get('page') || '1';
  const perPage = req.nextUrl.searchParams.get('perPage') || '12';
  const endpoint = `${UNSPLASH_API}/search/collections?query=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ success: false, message: 'Unsplash 集合请求失败' }, { status: 502 });
  }

  const payload = (await response.json()) as {
    results?: Array<{
      id: string;
      title: string;
      total_photos: number;
      cover_photo?: { urls?: { small?: string } };
    }>;
  };

  const collections = (payload.results || []).map((item) => ({
    id: item.id,
    title: item.title,
    totalPhotos: item.total_photos,
    cover: item.cover_photo?.urls?.small || '',
  }));

  return NextResponse.json({ success: true, collections });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const accessKey = getAccessKey();
  if (!accessKey) {
    return NextResponse.json(
      { success: false, message: '未配置 UNSPLASH_ACCESS_KEY' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const collectionId = String(body?.collectionId || '').trim();
  const page = String(body?.page || '1');
  const perPage = String(body?.perPage || '24');
  if (!collectionId) {
    return NextResponse.json({ success: false, message: '缺少 collectionId' }, { status: 400 });
  }

  const endpoint = `${UNSPLASH_API}/collections/${encodeURIComponent(collectionId)}/photos?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ success: false, message: 'Unsplash 图片请求失败' }, { status: 502 });
  }

  const payload = (await response.json()) as Array<{
    id: string;
    alt_description?: string | null;
    urls?: { thumb?: string; regular?: string };
    user?: { name?: string };
  }>;

  const photos = payload.map((item) => ({
    id: item.id,
    title: item.alt_description || '',
    thumb: item.urls?.thumb || '',
    regular: item.urls?.regular || '',
    author: item.user?.name || '',
  }));

  return NextResponse.json({ success: true, photos });
}
