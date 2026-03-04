import { NextResponse } from 'next/server';

export async function GET() {
  // const apiKey = process.env.QWEATHER_API_KEY;
  // const isConfigured = !!apiKey && apiKey.trim() !== '';

  return NextResponse.json({ configured: true });
}
