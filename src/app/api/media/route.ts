import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { getMediaDir } from '@/server/data-store';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const query = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const mediaDir = getMediaDir();
  const entries = await readdir(mediaDir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => (!query ? true : name.toLowerCase().includes(query)))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 100)
    .map((name) => ({ name, url: `/media/${name}` }));

  return NextResponse.json({ success: true, files });
}
