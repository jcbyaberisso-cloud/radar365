export type CandidateMarket = 'REMATES' | 'AL_ARCO' | 'ATAJADAS' | 'GOLES_EQUIPO';
export type CandidateStatus = 'CANDIDATO' | 'ESPERAR_XI' | 'DESCARTAR';

export type Candidate = {
  fixtureId: number;
  market: CandidateMarket;
  subject: string;
  line: number;
  estimatedProbability: number;
  fairOdds: number;
  minimumMarketOdds: number;
  confidence: number;
  status: CandidateStatus;
  reasons: string[];
};

export function buildCandidate(input: {
  fixtureId: number;
  market: CandidateMarket;
  subject: string;
  line: number;
  probability: number;
  confidence: number;
  lineupConfirmed: boolean;
  reasons: string[];
  targetEdge?: number;
}): Candidate {
  const p = Math.max(0.01, Math.min(0.99, input.probability));
  const fairOdds = 1 / p;
  const targetEdge = input.targetEdge ?? 0.08;
  const minimumMarketOdds = (1 + targetEdge) / p;

  let status: CandidateStatus = 'CANDIDATO';
  if (input.confidence < 0.55 || p < 0.52) status = 'DESCARTAR';
  else if (!input.lineupConfirmed) status = 'ESPERAR_XI';

  return {
    fixtureId: input.fixtureId,
    market: input.market,
    subject: input.subject,
    line: input.line,
    estimatedProbability: p,
    fairOdds,
    minimumMarketOdds,
    confidence: input.confidence,
    status,
    reasons: input.reasons
  };
}

export function rankCandidates(candidates: Candidate[], limit = 6) {
  return candidates
    .filter(c => c.status !== 'DESCARTAR')
    .sort((a, b) => (b.estimatedProbability * b.confidence) - (a.estimatedProbability * a.confidence))
    .slice(0, limit);
}
