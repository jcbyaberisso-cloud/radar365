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
  'totals',
  'h2h',
  'spreads'
]);

type Event = { id: string | number; home_team?: string; away_team?: string; commence_time?: string };
type Market = { key: string; outcomes_count?: number };

export async function GET(_request: NextRequest, context: { params: Promise<{ sport: string }> }) {
  const { sport } = await context.params;
  if (!sport.startsWith('soccer_')) return NextResponse.json({ ok: false, error: 'Soccer sport key required' }, { status: 400 });

  try {
    const events = await propLineRequest<Event[]>(`/sports/${encodeURIComponent(sport)}/events`);
    const upcoming = events.slice(0, 12);
    const discovered = [];

    for (const event of upcoming) {
      const markets = await propLineRequest<Market[]>(`/sports/${encodeURIComponent(sport)}/events/${encodeURIComponent(String(event.id))}/markets`);
      const relevant = markets.filter(m => TARGET_MARKETS.has(m.key) || /shot|save|goal|assist|corner|card|team_total/i.test(m.key));
      if (relevant.length) discovered.push({ event, markets: relevant });
    }

    return NextResponse.json({ ok: true, sport, eventsChecked: upcoming.length, eventsWithRelevantMarkets: discovered.length, events: discovered });
  } catch (error) {
    return NextResponse.json({ ok: false, sport, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
