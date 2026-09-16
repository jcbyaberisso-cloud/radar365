import { NextRequest, NextResponse } from 'next/server';
import { getFixturesByDate } from '../../../../lib/football';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date') || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  try {
    const data = await getFixturesByDate(date);
    return NextResponse.json({ ok: true, date, count: data.response?.length ?? 0, fixtures: data.response ?? [] });
  } catch (error) {
    return NextResponse.json({ ok: false, date, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
