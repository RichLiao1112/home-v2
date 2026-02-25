import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { createConfigKey, deleteConfigKey, readAppData } from '@/server/data-store';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }
  const result = await readAppData();
  return NextResponse.json({ success: true, key: result.key, keys: result.keys });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }
  const body = await req.json();
  const key = String(body?.key || '').trim();
  if (!key) {
    return NextResponse.json({ success: false, message: '请输入配置 key' }, { status: 400 });
  }
  const result = await createConfigKey(key);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }
  const body = await req.json();
  const key = String(body?.key || '').trim();
  if (!key) {
    return NextResponse.json({ success: false, message: '缺少配置 key' }, { status: 400 });
  }
  const result = await deleteConfigKey(key);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
