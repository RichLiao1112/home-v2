import { readdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { getMediaDir } from '@/server/data-store';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const ASSETS_DIR = process.env.ASSETS_DIR || '';
const MAX_DEPTH = 3;

const walkImageFiles = async (rootDir: string, depth = 0, base = ''): Promise<string[]> => {
  if (!rootDir || depth > MAX_DEPTH) return [];
  try {
    const entries = await readdir(path.join(rootDir, base), { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const relPath = base ? path.posix.join(base, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const nested = await walkImageFiles(rootDir, depth + 1, relPath);
        files.push(...nested);
      } else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(relPath);
      }
    }
    return files;
  } catch {
    return [];
  }
};

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const query = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  const mediaFiles = await walkImageFiles(getMediaDir());
  const assetFiles = await walkImageFiles(ASSETS_DIR);

  const files = [
    ...mediaFiles.map((name) => ({ name, url: `/media/${name}` })),
    ...assetFiles.map((name) => ({ name, url: `/assets/${name}` })),
  ]
    .filter((item) => (!query ? true : item.name.toLowerCase().includes(query)))
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(0, 100)
    .map((item) => ({ name: item.name, url: item.url }));

  return NextResponse.json({ success: true, files });
}
