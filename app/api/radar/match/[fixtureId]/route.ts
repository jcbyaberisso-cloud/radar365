import { NextRequest, NextResponse } from 'next/server';
import { getMatchContext } from '../../../../../lib/match-context';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId: raw } = await context.params;
  const fixtureId = Number(raw);
  if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid fixture id' }, { status: 400 });
  }

  try {
    const data = await getMatchContext(fixtureId);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ ok: false, fixtureId, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
