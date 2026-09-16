import { NextRequest, NextResponse } from 'next/server';
import { propLineRequest } from '../../../../../lib/propline';

export const dynamic = 'force-dynamic';

const TARGET_MARKETS = new Set([
  'player_shots',
  'player_shots_on_target',
  'goalkeeper_saves',
  'player_goals',
  'player_assists',
  'team_total',
  'total_corners',
  'totals',
  'h2h',
  'spreads'
]);

type Event = { id: string | number; home_team?: string; away_team?: string; commence_time?: string };
type Market = { key: string; outcomes_count?: number };

function eventTime(event: Event) {
  const value = event.commence_time ? Date.parse(event.commence_time) : Number.NaN;
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

export async function GET(request: NextRequest, context: { params: Promise<{ sport: string }> }) {
  const { sport } = await context.params;
  if (!sport.startsWith('soccer_')) return NextResponse.json({ ok: false, error: 'Soccer sport key required' }, { status: 400 });

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || '12');
  const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? Math.floor(limitParam) : 12, 20));

  try {
    const events = await propLineRequest<Event[]>(`/sports/${encodeURIComponent(sport)}/events`);
    const now = Date.now();
    const future = events
      .filter(event => eventTime(event) >= now - 2 * 60 * 60 * 1000)
      .sort((a, b) => eventTime(a) - eventTime(b));
    const upcoming = future.slice(0, limit);
    const discovered = [];

    for (const event of upcoming) {
      const markets = await propLineRequest<Market[]>(`/sports/${encodeURIComponent(sport)}/events/${encodeURIComponent(String(event.id))}/markets`);
      const relevant = markets.filter(m => TARGET_MARKETS.has(m.key) || /shot|save|goal|assist|corner|card|team_total/i.test(m.key));
      if (relevant.length) discovered.push({ event, markets: relevant });
    }

    return NextResponse.json({
      ok: true,
      sport,
      providerEvents: events.length,
      futureEvents: future.length,
      eventsChecked: upcoming.length,
      nearestEvent: upcoming[0]?.commence_time ?? null,
      eventsWithRelevantMarkets: discovered.length,
      events: discovered
    });
  } catch (error) {
    return NextResponse.json({ ok: false, sport, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
