import { NextRequest, NextResponse } from 'next/server';
import { propLineRequest } from '../../../../../../lib/propline';

export const dynamic = 'force-dynamic';

const DEFAULT_MARKETS = ['player_shots', 'player_shots_on_target', 'goalie_saves'];

type Outcome = {
  name?: string;
  description?: string;
  price?: number;
  point?: number;
};

type Market = { key?: string; outcomes?: Outcome[] };
type Bookmaker = { key?: string; title?: string; markets?: Market[] };
type OddsEvent = {
  id?: string | number;
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  bookmakers?: Bookmaker[];
};

export async function GET(request: NextRequest, context: { params: Promise<{ sport: string; eventId: string }> }) {
  const { sport, eventId } = await context.params;
  if (!sport.startsWith('soccer_')) return NextResponse.json({ ok: false, error: 'Soccer sport key required' }, { status: 400 });

  const requested = (request.nextUrl.searchParams.get('markets') || DEFAULT_MARKETS.join(','))
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 6);

  try {
    const query = new URLSearchParams({ eventIds: eventId, markets: requested.join(',') });
    const raw = await propLineRequest<OddsEvent[] | OddsEvent>(`/sports/${encodeURIComponent(sport)}/odds?${query.toString()}`);
    const events = Array.isArray(raw) ? raw : [raw];
    const event = events.find(item => String(item?.id) === String(eventId)) ?? events[0];

    if (!event) return NextResponse.json({ ok: true, sport, eventId, requestedMarkets: requested, found: false, prices: [] });

    const prices = (event.bookmakers ?? []).flatMap(bookmaker =>
      (bookmaker.markets ?? [])
        .filter(market => market.key && requested.includes(market.key))
        .flatMap(market => (market.outcomes ?? []).map(outcome => ({
          bookmaker: bookmaker.title ?? bookmaker.key ?? 'Unknown',
          bookmakerKey: bookmaker.key ?? null,
          market: market.key,
          player: outcome.description ?? outcome.name ?? null,
          outcome: outcome.name ?? null,
          line: outcome.point ?? null,
          odds: outcome.price ?? null
        })))
    );

    return NextResponse.json({
      ok: true,
      sport,
      eventId,
      requestedMarkets: requested,
      found: true,
      event: { home: event.home_team, away: event.away_team, commenceTime: event.commence_time },
      bookmakers: event.bookmakers?.length ?? 0,
      pricesCount: prices.length,
      prices
    });
  } catch (error) {
    return NextResponse.json({ ok: false, sport, eventId, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
