import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { isAuthorizedRequest } from '@/server/auth';
import { getMediaDir } from '@/server/data-store';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: '请选择图片文件' }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, message: '仅支持 PNG/JPG/WEBP/GIF/SVG' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, message: '图片需小于 5MB' }, { status: 400 });
  }

  const ext = path.extname(file.name || '').replace('.', '') || 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const mediaDir = getMediaDir();

  await mkdir(mediaDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(mediaDir, filename), buffer);

  return NextResponse.json({
    success: true,
    data: {
      filename,
      url: `/media/${filename}`,
    },
  });
}
