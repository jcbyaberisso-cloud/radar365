import { NextResponse } from 'next/server';
import { getNearestMarketPrices } from '../../../../lib/live-markets';
import { saveScan } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SPORTS = ['soccer_epl','soccer_argentina_primera','soccer_uefa_champions_league'];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await Promise.allSettled(SPORTS.map(async sport => {
    const feed = await getNearestMarketPrices(sport, 18);
    const event = feed.event ? {
      id: String(feed.event.id),
      home_team: feed.event.home_team ?? null,
      away_team: feed.event.away_team ?? null,
      commence_time: feed.event.commence_time ?? null
    } : null;

    const scanId = await saveScan({
      startedAt,
      sport,
      event,
      bookmakers: feed.bookmakers.length,
      bet365Available: feed.bet365Available,
      prices: feed.prices.length
    });

    return {
      sport,
      scanId,
      event,
      bookmakers: feed.bookmakers.length,
      bet365Available: feed.bet365Available,
      prices: feed.prices.length,
      persisted: true
    };
  }));

  const scans = results.map((r, i) => r.status === 'fulfilled'
    ? r.value
    : { sport: SPORTS[i], persisted: false, error: r.reason instanceof Error ? r.reason.message : 'scan failed' });

  return NextResponse.json({
    ok: scans.some(scan => scan.persisted),
    autonomous: true,
    database: 'neon',
    startedAt,
    finishedAt: new Date().toISOString(),
    scans
  });
}
