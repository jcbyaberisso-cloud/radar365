const BASE_URL = process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io';

export type FootballFixture = {
  fixture: { id: number; date: string; status: { short: string; long: string } };
  league: { id: number; name: string; country: string; logo?: string };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
};

export async function footballRequest<T>(path: string): Promise<T> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error('FOOTBALL_API_KEY is not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-apisports-key': key },
    next: { revalidate: 300 }
  });

  if (!response.ok) throw new Error(`API-Football error ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getFixturesByDate(date: string, timezone = 'America/Argentina/Buenos_Aires') {
  return footballRequest<{ response: FootballFixture[]; errors: unknown }>(
    `/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
  );
}
