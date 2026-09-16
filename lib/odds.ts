export type MarketPrice = {
  bookmaker: string;
  market: string;
  subject: string;
  line: number;
  odds: number;
  capturedAt: string;
};

export type ValueAssessment = {
  fairOdds: number;
  marketOdds: number | null;
  edge: number | null;
  hasValue: boolean | null;
  thresholdOdds: number;
  message: string;
};

export function assessMarketPrice(probability: number, marketOdds?: number | null, targetEdge = 0.08): ValueAssessment {
  const fairOdds = 1 / probability;
  const thresholdOdds = (1 + targetEdge) / probability;

  if (!marketOdds) {
    return {
      fairOdds,
      marketOdds: null,
      edge: null,
      hasValue: null,
      thresholdOdds,
      message: `Sin cuota confirmada. Interesante si Bet365 >= ${thresholdOdds.toFixed(2)}`
    };
  }

  const edge = probability * marketOdds - 1;
  return {
    fairOdds,
    marketOdds,
    edge,
    hasValue: edge >= targetEdge,
    thresholdOdds,
    message: edge >= targetEdge ? 'Cuota con valor potencial' : 'Cuota por debajo del umbral'
  };
}
