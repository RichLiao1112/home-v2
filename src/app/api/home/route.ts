import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { readAppData, writeAppData } from '@/server/data-store';
import type { AppData } from '@/types';
import { normalizeData } from '@/types';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const data = await readAppData();
  return NextResponse.json({ success: true, data });
}

export async function PUT(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = normalizeData((body?.data || {}) as AppData);
    await writeAppData(data);
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, message: '保存失败，数据格式错误' }, { status: 400 });
  }
}
