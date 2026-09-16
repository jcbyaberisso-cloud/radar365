import { NextResponse } from 'next/server';
import { footballRequest } from '../../../../lib/football';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await footballRequest<{ response?: unknown[]; errors?: unknown }>('/status');
    return NextResponse.json({ ok: true, provider: 'API-Football', connected: true, providerResponse: data.response ?? null });
  } catch (error) {
    return NextResponse.json(
      { ok: false, provider: 'API-Football', connected: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
