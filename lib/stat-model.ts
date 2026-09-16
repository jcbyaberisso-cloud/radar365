export type Sample = { value: number; minutes?: number; weight?: number };
export type EstimateInput = {
  samples: Sample[];
  line: number;
  opponentFactor?: number;
  homeAwayFactor?: number;
  expectedMinutes?: number;
  lineupConfirmed?: boolean;
};

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
function factorial(k: number) { let v = 1; for (let i = 2; i <= k; i++) v *= i; return v; }
function poissonCdf(k: number, lambda: number) {
  let total = 0;
  for (let i = 0; i <= Math.max(0, k); i++) total += Math.exp(-lambda) * Math.pow(lambda, i) / factorial(i);
  return clamp(total, 0, 1);
}

export function estimateOverProbability(input: EstimateInput) {
  const usable = input.samples.filter(s => Number.isFinite(s.value) && s.value >= 0).slice(0, 10);
  if (usable.length < 3) return { probability: null, confidence: 'BAJA' as const, reason: 'Muestra insuficiente' };

  let weighted = 0, weights = 0;
  usable.forEach((s, index) => {
    const recency = s.weight ?? Math.pow(0.88, index);
    const minuteScale = s.minutes && s.minutes > 0 ? 90 / Math.max(45, s.minutes) : 1;
    weighted += s.value * minuteScale * recency;
    weights += recency;
  });

  const rawMean = weighted / weights;
  const minutesFactor = clamp((input.expectedMinutes ?? 90) / 90, 0.35, 1.05);
  const lambda = clamp(rawMean * (input.opponentFactor ?? 1) * (input.homeAwayFactor ?? 1) * minutesFactor, 0.05, 12);
  const threshold = Math.floor(input.line);
  const probability = clamp(1 - poissonCdf(threshold, lambda), 0.02, 0.98);
  const confidence = usable.length >= 8 && input.lineupConfirmed ? 'ALTA' : usable.length >= 5 ? 'MEDIA' : 'BAJA';

  return { probability, lambda, sampleSize: usable.length, rawMean, confidence };
}

export function valueDecision(probability: number | null, decimalOdds: number | null, lineupConfirmed = false) {
  if (!probability) return { status: 'SIN MODELO', fairOdds: null, edge: null, minimumOdds: null };
  const fairOdds = 1 / probability;
  const minimumOdds = 1.08 / probability;
  if (!decimalOdds) return { status: lineupConfirmed ? 'BUSCAR CUOTA' : 'ESPERAR XI', fairOdds, edge: null, minimumOdds };
  const edge = probability * decimalOdds - 1;
  const status = edge < 0.06 ? 'DESCARTAR' : (!lineupConfirmed || edge < 0.12 ? 'AMARILLO' : 'VERDE');
  return { status, fairOdds, edge, minimumOdds };
}
