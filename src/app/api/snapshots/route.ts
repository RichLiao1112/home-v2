import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { createSnapshot, deleteSnapshot, listSnapshots, restoreSnapshot } from '@/server/data-store';

export async function GET(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get('key') || undefined;
  const result = await listSnapshots(key);
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = String(body?.action || '').trim();
    const key = String(body?.key || '').trim() || undefined;

    if (action === 'create') {
      const note = String(body?.note || '').trim();
      const result = await createSnapshot(key, 'manual', note || undefined);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'restore') {
      const targetKey = key || 'default';
      const snapshotId = String(body?.snapshotId || '').trim();
      if (!snapshotId) {
        return NextResponse.json({ success: false, message: '缺少 snapshotId' }, { status: 400 });
      }
      const result = await restoreSnapshot(targetKey, snapshotId);
      if (!result.success) {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, message: '不支持的操作' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: '请求格式错误' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const key = String(body?.key || '').trim();
    const snapshotId = String(body?.snapshotId || '').trim();
    if (!key || !snapshotId) {
      return NextResponse.json({ success: false, message: '缺少 key 或 snapshotId' }, { status: 400 });
    }
    const result = await deleteSnapshot(key, snapshotId);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false, message: '请求格式错误' }, { status: 400 });
  }
}
