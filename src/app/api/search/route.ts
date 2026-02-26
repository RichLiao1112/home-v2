import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';
import { readAppDB } from '@/server/data-store';

export async function GET(_req: NextRequest) {
  if (!isAuthorizedRequest(_req)) {
    return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });
  }

  const db = await readAppDB();
  const items = Object.entries(db).flatMap(([key, data]) =>
    (data.categories || []).flatMap(category =>
      (category.cards || []).map(card => ({
        key,
        categoryId: category.id,
        categoryTitle: category.title,
        card: {
          id: card.id,
          title: card.title,
          description: card.description || '',
          wanLink: card.wanLink || '',
          lanLink: card.lanLink || '',
          openInNewWindow: card.openInNewWindow ?? true,
        },
      })),
    ),
  );

  return NextResponse.json({ success: true, items });
}
