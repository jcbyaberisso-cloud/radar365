export type OpportunityStatus = 'VERDE' | 'AMARILLO' | 'DESCARTAR';

export function calculateValue(probability: number, marketOdds: number) {
  if (probability <= 0 || probability >= 1) throw new Error('Probability must be between 0 and 1');
  if (marketOdds <= 1) throw new Error('Decimal odds must be greater than 1');
  const fairOdds = 1 / probability;
  const expectedReturn = probability * marketOdds;
  const edge = expectedReturn - 1;
  return { probability, fairOdds, marketOdds, expectedReturn, edge };
}

export function minimumOdds(probability: number, targetEdge = 0.08) {
  return (1 + targetEdge) / probability;
}

export function classifyOpportunity(edge: number, lineupUncertain: boolean): OpportunityStatus {
  if (edge < 0.06) return 'DESCARTAR';
  if (lineupUncertain || edge < 0.12) return 'AMARILLO';
  return 'VERDE';
}
