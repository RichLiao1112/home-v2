import { NextRequest, NextResponse } from 'next/server';
import { readAppData } from '@/server/data-store';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || undefined;
  const result = await readAppData(key);
  const head = result.data.layout?.head || {};

  return NextResponse.json({
    success: true,
    key: result.key,
    site: {
      name: head.name || 'Home',
      subtitle: head.subtitle || '',
      backgroundImage: head.backgroundImage || '',
      overlayOpacity: head.overlayOpacity ?? 70,
      navOpacity: head.navOpacity ?? 62,
      backgroundBlur: head.backgroundBlur ?? 0,
    },
  });
}
