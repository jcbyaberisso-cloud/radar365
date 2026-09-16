import { NextResponse } from 'next/server';
import { getPropLineSports } from '../../../../lib/propline';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sports = await getPropLineSports();
    const soccer = sports.filter(s => s.key.startsWith('soccer_') && s.active);
    return NextResponse.json({
      ok: true,
      provider: 'PropLine',
      connected: true,
      activeSoccerCompetitions: soccer.length,
      soccer: soccer.map(s => ({ key: s.key, title: s.title }))
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: 'PropLine',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
