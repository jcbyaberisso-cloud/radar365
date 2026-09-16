import { NextResponse } from 'next/server';
import { getNearestMarketPrices } from '../../../../lib/live-markets';
import { footballRequest, type FootballFixture } from '../../../../lib/football';
import { evaluatePrices } from '../../../../lib/opportunity-engine';
import { saveOpportunity, saveScan } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SPORTS = ['soccer_epl','soccer_argentina_primera','soccer_uefa_champions_league'];

async function candidateFixtures(commenceTime?: string) {
  if (!commenceTime) return [];
  const kick = new Date(commenceTime);
  const from = new Date(kick.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0,10);
  const to = new Date(kick.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0,10);
  const data = await footballRequest<{response:FootballFixture[]}>(`/fixtures?from=${from}&to=${to}&timezone=America%2FArgentina%2FBuenos_Aires`,21600);
  return data.response ?? [];
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await Promise.allSettled(SPORTS.map(async sport => {
    const feed = await getNearestMarketPrices(sport, 12);
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

    let evaluation: any = null;
    let saved = 0;
    if (event && feed.prices.length && process.env.FOOTBALL_API_KEY) {
      const fixtures = await candidateFixtures(event.commence_time ?? undefined);
      evaluation = await evaluatePrices(event, feed.prices, fixtures);
      const publishable = (evaluation.opportunities ?? []).filter((o:any) =>
        o.decision?.status !== 'SIN MODELO' && o.sampleSize >= 3
      );
      for (const opportunity of publishable) {
        await saveOpportunity(scanId, sport, event, opportunity);
        saved += 1;
      }
    }

    return {
      sport,
      scanId,
      event,
      bookmakers: feed.bookmakers.length,
      bet365Available: feed.bet365Available,
      prices: feed.prices.length,
      fixtureMatched: Boolean(evaluation?.matched),
      lineupConfirmed: Boolean(evaluation?.lineupConfirmed),
      opportunitiesEvaluated: evaluation?.opportunities?.length ?? 0,
      opportunitiesSaved: saved,
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
    model: 'statistical-opportunity-engine',
    startedAt,
    finishedAt: new Date().toISOString(),
    scans
  });
}
