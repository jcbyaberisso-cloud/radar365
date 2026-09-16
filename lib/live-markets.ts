import { propLineRequest } from './propline';

const MARKETS = ['player_shots', 'player_shots_on_target', 'goalie_saves'];

export type RadarPrice = {
  sport: string;
  eventId: string;
  home: string;
  away: string;
  commenceTime: string;
  bookmaker: string;
  bookmakerKey: string;
  market: string;
  player: string;
  outcome: string;
  line: number | null;
  decimalOdds: number;
};

type Event = { id: string | number; home_team?: string; away_team?: string; commence_time?: string };
type Outcome = { name?: string; description?: string; price?: number; point?: number };
type Market = { key?: string; outcomes?: Outcome[] };
type Bookmaker = { key?: string; title?: string; markets?: Market[] };
type OddsEvent = Event & { bookmakers?: Bookmaker[] };

function eventTime(event: Event) {
  const parsed = event.commence_time ? Date.parse(event.commence_time) : NaN;
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function americanToDecimal(price?: number) {
  if (typeof price !== 'number' || price === 0) return null;
  return Number((price > 0 ? 1 + price / 100 : 1 + 100 / Math.abs(price)).toFixed(2));
}

function inferLine(outcome: Outcome) {
  if (typeof outcome.point === 'number') return outcome.point;
  const match = outcome.name?.match(/(\d+(?:\.\d+)?)\s*\+/);
  return match ? Number(match[1]) : null;
}

function cleanName(value?: string) {
  if (!value) return '';
  if (!/[ÃÂ]/.test(value)) return value;
  try { return Buffer.from(value, 'latin1').toString('utf8'); } catch { return value; }
}

export async function getNearestMarketPrices(sport: string, maxPrices = 8) {
  const events = await propLineRequest<Event[]>(`/sports/${encodeURIComponent(sport)}/events`);
  const now = Date.now();
  const event = events
    .filter(item => eventTime(item) >= now - 2 * 60 * 60 * 1000)
    .sort((a, b) => eventTime(a) - eventTime(b))[0];

  if (!event) return { event: null, bookmakers: [], bet365Available: false, prices: [] as RadarPrice[] };

  const query = new URLSearchParams({ eventIds: String(event.id), markets: MARKETS.join(',') });
  const raw = await propLineRequest<OddsEvent[] | OddsEvent>(`/sports/${encodeURIComponent(sport)}/odds?${query.toString()}`);
  const oddsEvents = Array.isArray(raw) ? raw : [raw];
  const priced = oddsEvents.find(item => String(item.id) === String(event.id)) ?? oddsEvents[0];
  const bookmakers = (priced?.bookmakers ?? []).map(b => ({ key: b.key ?? '', title: b.title ?? b.key ?? 'Unknown' }));
  const bet365Available = bookmakers.some(b => /bet\s*365/i.test(`${b.key} ${b.title}`));

  const all: RadarPrice[] = (priced?.bookmakers ?? []).flatMap(bookmaker =>
    (bookmaker.markets ?? []).filter(m => m.key && MARKETS.includes(m.key)).flatMap(market =>
      (market.outcomes ?? []).map(outcome => {
        const decimalOdds = americanToDecimal(outcome.price);
        return decimalOdds ? {
          sport,
          eventId: String(event.id),
          home: event.home_team ?? '',
          away: event.away_team ?? '',
          commenceTime: event.commence_time ?? '',
          bookmaker: bookmaker.title ?? bookmaker.key ?? 'Unknown',
          bookmakerKey: bookmaker.key ?? '',
          market: market.key ?? '',
          player: cleanName(outcome.description ?? outcome.name),
          outcome: cleanName(outcome.name),
          line: inferLine(outcome),
          decimalOdds
        } : null;
      }).filter((value): value is RadarPrice => Boolean(value))
    )
  );

  // Keep a useful spread of markets instead of dumping hundreds of near-duplicate prices.
  const selected: RadarPrice[] = [];
  const seen = new Set<string>();
  for (const price of all.sort((a, b) => b.decimalOdds - a.decimalOdds)) {
    const key = `${price.market}|${price.player}|${price.outcome}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(price);
    if (selected.length >= maxPrices) break;
  }

  return { event, bookmakers, bet365Available, prices: selected };
}
