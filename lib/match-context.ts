import { footballRequest } from './football';

export type MatchContext = {
  fixtureId: number;
  injuries: unknown[];
  lineups: unknown[];
  statistics: unknown[];
  players: unknown[];
  lineupConfirmed: boolean;
};

export async function getMatchContext(fixtureId: number): Promise<MatchContext> {
  const [injuries, lineups, statistics, players] = await Promise.all([
    footballRequest<{ response: unknown[] }>(`/injuries?fixture=${fixtureId}`),
    footballRequest<{ response: unknown[] }>(`/fixtures/lineups?fixture=${fixtureId}`),
    footballRequest<{ response: unknown[] }>(`/fixtures/statistics?fixture=${fixtureId}`),
    footballRequest<{ response: unknown[] }>(`/fixtures/players?fixture=${fixtureId}`)
  ]);

  return {
    fixtureId,
    injuries: injuries.response ?? [],
    lineups: lineups.response ?? [],
    statistics: statistics.response ?? [],
    players: players.response ?? [],
    lineupConfirmed: (lineups.response?.length ?? 0) >= 2
  };
}
