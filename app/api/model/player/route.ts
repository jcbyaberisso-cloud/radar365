import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalPlayerSamples } from '../../../../lib/football';
import { estimateOverProbability, valueDecision } from '../../../../lib/stat-model';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const teamId = Number(q.get('teamId'));
  const player = q.get('player')?.trim();
  const market = q.get('market') as 'player_shots' | 'player_shots_on_target' | null;
  const line = Number(q.get('line'));
  const odds = q.get('odds') ? Number(q.get('odds')) : null;
  const lineupConfirmed = q.get('lineupConfirmed') === 'true';
  const expectedMinutes = q.get('expectedMinutes') ? Number(q.get('expectedMinutes')) : 90;

  if (!teamId || !player || !market || !['player_shots','player_shots_on_target'].includes(market) || !Number.isFinite(line)) {
    return NextResponse.json({ ok: false, error: 'teamId, player, market and line are required' }, { status: 400 });
  }

  try {
    const samples = await getHistoricalPlayerSamples(teamId, player, market, 8);
    const estimate = estimateOverProbability({ samples, line, expectedMinutes, lineupConfirmed });
    const decision = valueDecision(estimate.probability, odds, lineupConfirmed);
    return NextResponse.json({ ok: true, player, market, line, samples, estimate, decision, methodology: 'Weighted recent per-90 sample with Poisson count model; no bookmaker probability is used to create the estimate.' });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
