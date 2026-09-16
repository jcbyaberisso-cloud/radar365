import { NextResponse } from 'next/server';
import { getFixturesByDate } from '../../../../lib/football';
import { prioritizeFixtures } from '../../../../lib/radar';

export const dynamic = 'force-dynamic';

function argentinaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export async function GET() {
  const date = argentinaDate();
  try {
    const data = await getFixturesByDate(date);
    const all = data.response ?? [];
    const priority = prioritizeFixtures(all);
    return NextResponse.json({
      ok: true,
      date,
      scanned: all.length,
      priorityCount: priority.length,
      fixtures: priority.map(f => ({
        id: f.fixture.id,
        date: f.fixture.date,
        status: f.fixture.status.short,
        league: f.league.name,
        country: f.league.country,
        home: f.teams.home.name,
        away: f.teams.away.name
      }))
    });
  } catch (error) {
    return NextResponse.json({ ok: false, date, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 503 });
  }
}
