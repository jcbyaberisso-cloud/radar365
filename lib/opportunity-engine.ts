import { getHistoricalPlayerSamples, footballRequest, type FootballFixture } from './football';
import { estimateOverProbability, valueDecision } from './stat-model';
import { matchFixture } from './matcher';
import type { RadarPrice } from './live-markets';

type Lineup = { team?: { id?: number }; startXI?: Array<{ player?: { id?: number; name?: string } }> };
type Injury = { player?: { name?: string }; team?: { id?: number } };

function playerInLineup(lineups: Lineup[], name: string) {
  const target = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return lineups.some(l => (l.startXI ?? []).some(x => {
    const n = (x.player?.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return n && (n.includes(target) || target.includes(n));
  }));
}

function injured(injuries: Injury[], name: string) {
  const target = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return injuries.some(i => {
    const n = (i.player?.name ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return n && (n.includes(target) || target.includes(n));
  });
}

export async function evaluatePrices(event: { home_team?: string; away_team?: string; commence_time?: string }, prices: RadarPrice[], candidateFixtures: FootballFixture[]) {
  const matched = matchFixture(event, candidateFixtures);
  if (!matched) return { matched: false, fixture: null, opportunities: [] };
  const fixture = matched.fixture;

  // Pre-match context only: two calls, cached. Do not waste the free quota on fixture/player live stats here.
  const [lineupData, injuryData] = await Promise.all([
    footballRequest<{ response: Lineup[] }>(`/fixtures/lineups?fixture=${fixture.fixture.id}`, 600),
    footballRequest<{ response: Injury[] }>(`/injuries?fixture=${fixture.fixture.id}`, 14400)
  ]);
  const lineups = lineupData.response ?? [];
  const injuries = injuryData.response ?? [];
  const lineupConfirmed = lineups.length >= 2;

  const supported = prices.filter(p => (p.market === 'player_shots' || p.market === 'player_shots_on_target') && p.line !== null).slice(0, 5);
  const opportunities = [] as any[];

  for (const price of supported) {
    const isHome = price.player ? playerInLineup(lineups.filter(l => l.team?.id === fixture.teams.home.id), price.player) : false;
    const isAway = price.player ? playerInLineup(lineups.filter(l => l.team?.id === fixture.teams.away.id), price.player) : false;
    let teamId = isHome ? fixture.teams.home.id : isAway ? fixture.teams.away.id : null;

    // Before official XI, identify team by searching both sides' recent samples, but stop after the first useful sample set.
    let samples: Array<{ value: number; minutes?: number }> = [];
    if (teamId) samples = await getHistoricalPlayerSamples(teamId, price.player, price.market, 6);
    else {
      const homeSamples = await getHistoricalPlayerSamples(fixture.teams.home.id, price.player, price.market, 6);
      if (homeSamples.length >= 3) { teamId = fixture.teams.home.id; samples = homeSamples; }
      else { const awaySamples = await getHistoricalPlayerSamples(fixture.teams.away.id, price.player, price.market, 6); if (awaySamples.length >= 3) { teamId = fixture.teams.away.id; samples = awaySamples; } }
    }

    const unavailable = injured(injuries, price.player);
    const confirmedStarter = lineupConfirmed && playerInLineup(lineups, price.player);
    const estimate = estimateOverProbability({ samples, line: price.line!, expectedMinutes: confirmedStarter ? 85 : 75, lineupConfirmed: confirmedStarter });
    const decision = valueDecision(estimate.probability ?? null, price.decimalOdds, confirmedStarter);
    opportunities.push({ ...price, fixtureId: fixture.fixture.id, teamId, lineupConfirmed, confirmedStarter, unavailable, sampleSize: samples.length, estimate, decision: unavailable ? { ...decision, status: 'DESCARTAR' } : decision });
  }

  return { matched: true, matchScore: matched.score, fixture: { id: fixture.fixture.id, home: fixture.teams.home.name, away: fixture.teams.away.name }, lineupConfirmed, injuriesCount: injuries.length, opportunities };
}
