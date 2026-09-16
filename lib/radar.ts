import type { FootballFixture } from './football';

const PRIORITY_LEAGUES = new Set([
  39, 40, 41, 42, // England
  61, 62, // France
  78, 79, // Germany
  135, 136, // Italy
  140, 141, // Spain
  71, 72, // Brazil
  128, 129, // Argentina
  2, 3, 848 // Champions, Europa, Conference
]);

const PRIORITY_NAMES = [
  'Premier League', 'Championship', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'Champions League', 'Europa League', 'Conference League', 'Liga Profesional Argentina',
  'Primera Nacional', 'Copa Argentina', 'Copa Libertadores', 'Copa Sudamericana', 'Serie A'
];

export function isPriorityFixture(fixture: FootballFixture) {
  if (PRIORITY_LEAGUES.has(fixture.league.id)) return true;
  const name = fixture.league.name.toLowerCase();
  return PRIORITY_NAMES.some(item => name.includes(item.toLowerCase()));
}

export function prioritizeFixtures(fixtures: FootballFixture[]) {
  return fixtures
    .filter(isPriorityFixture)
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
}
