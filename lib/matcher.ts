import type { FootballFixture } from './football';

export function normalizeTeam(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\b(fc|cf|afc|sc|ac|club|deportivo|calcio)\b/g, '').replace(/[^a-z0-9]/g, '');
}

function teamScore(a: string, b: string) {
  const x = normalizeTeam(a), y = normalizeTeam(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  return 0;
}

export function matchFixture(event: { home_team?: string; away_team?: string; commence_time?: string }, fixtures: FootballFixture[]) {
  const eventTime = event.commence_time ? Date.parse(event.commence_time) : NaN;
  let best: { fixture: FootballFixture; score: number } | null = null;
  for (const fixture of fixtures) {
    const home = teamScore(event.home_team ?? '', fixture.teams.home.name);
    const away = teamScore(event.away_team ?? '', fixture.teams.away.name);
    const delta = Number.isFinite(eventTime) ? Math.abs(Date.parse(fixture.fixture.date) - eventTime) / 3600000 : 0;
    const timeScore = delta <= 1 ? 1 : delta <= 3 ? 0.7 : delta <= 12 ? 0.25 : 0;
    const score = home * 0.4 + away * 0.4 + timeScore * 0.2;
    if ((!best || score > best.score) && score >= 0.72) best = { fixture, score };
  }
  return best;
}
