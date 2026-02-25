import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { readAppData, writeAppData } from '@/server/data-store';
import type { AppData } from '@/types';
import { normalizeData } from '@/types';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get('key') || undefined;
  const result = await readAppData(key);
  return NextResponse.json({ success: true, ...result });
}

export async function PUT(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const key = String(body?.key || '').trim();
    if (!key) {
      return NextResponse.json({ success: false, message: '缺少配置 key' }, { status: 400 });
    }
    const data = normalizeData((body?.data || {}) as AppData);
    const result = await writeAppData(key, data);
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ success: false, message: '保存失败，数据格式错误' }, { status: 400 });
  }
}
