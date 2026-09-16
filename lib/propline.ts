const BASE_URL = 'https://api.prop-line.com/v1';

export async function propLineRequest<T>(path: string): Promise<T> {
  const key = process.env.PROPLINE_API_KEY;
  if (!key) throw new Error('PROPLINE_API_KEY is not configured');

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-API-Key': key },
    next: { revalidate: 900 }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`PropLine error ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return response.json() as Promise<T>;
}

export type PropLineSport = { key: string; title: string; active: boolean };

export async function getPropLineSports() {
  return propLineRequest<PropLineSport[]>('/sports');
}
