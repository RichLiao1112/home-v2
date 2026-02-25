import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRequest } from '@/server/auth';

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: isAuthorizedRequest(req) });
}
