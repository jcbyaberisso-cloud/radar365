const BASE_URL = process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io';

export type FootballFixture = {
  fixture: { id: number; date: string; status: { short: string; long: string } };
  league: { id: number; name: string; country: string; logo?: string };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
};

export async function footballRequest<T>(path: string, revalidate = 1800): Promise<T> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error('FOOTBALL_API_KEY is not configured');
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': key },
    next: { revalidate }
  });
  if (!response.ok) throw new Error(`API-Football error ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getFixturesByDate(date: string, timezone = 'America/Argentina/Buenos_Aires') {
  return footballRequest<{ response: FootballFixture[]; errors: unknown }>(`/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`, 1800);
}

export async function getRecentTeamFixtures(teamId: number, last = 10) {
  return footballRequest<{ response: FootballFixture[]; errors: unknown }>(`/fixtures?team=${teamId}&last=${Math.min(last, 10)}&status=FT`, 21600);
}

export type FixturePlayer = {
  player: { id: number; name: string };
  statistics: Array<{
    games?: { minutes?: number | null; substitute?: boolean };
    shots?: { total?: number | null; on?: number | null };
    goals?: { total?: number | null; assists?: number | null };
    cards?: { yellow?: number | null; red?: number | null };
  }>;
};

export type FixturePlayersTeam = { team: { id: number; name: string }; players: FixturePlayer[] };

export async function getFixturePlayers(fixtureId: number) {
  return footballRequest<{ response: FixturePlayersTeam[]; errors: unknown }>(`/fixtures/players?fixture=${fixtureId}`, 86400);
}

export async function getHistoricalPlayerSamples(teamId: number, playerName: string, market: 'player_shots' | 'player_shots_on_target', last = 8) {
  const fixtures = await getRecentTeamFixtures(teamId, last);
  const ids = (fixtures.response ?? []).map(f => f.fixture.id).slice(0, last);
  const batches = await Promise.all(ids.map(id => getFixturePlayers(id)));
  const target = playerName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const samples: Array<{ value: number; minutes?: number }> = [];

  for (const batch of batches) {
    for (const team of batch.response ?? []) {
      const found = team.players?.find(p => p.player.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(target) || target.includes(p.player.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
      const stat = found?.statistics?.[0];
      if (!stat) continue;
      const value = market === 'player_shots_on_target' ? stat.shots?.on : stat.shots?.total;
      if (typeof value === 'number') samples.push({ value, minutes: stat.games?.minutes ?? undefined });
    }
  }
  return samples;
}
