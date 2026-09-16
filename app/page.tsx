import { getFixturesByDate } from '../lib/football';
import { prioritizeFixtures } from '../lib/radar';

const markets = ['Remates', 'Al arco', 'Atajadas', 'Goles', 'Corners', 'Tarjetas', 'Handicap', 'BTTS'];

function argentinaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

export default async function Home() {
  const footballConfigured = Boolean(process.env.FOOTBALL_API_KEY);
  const oddsConfigured = Boolean(process.env.PROPLINE_API_KEY);
  let fixtures: Array<{ id: number; time: string; league: string; home: string; away: string }> = [];

  if (footballConfigured) {
    try {
      const data = await getFixturesByDate(argentinaDate());
      fixtures = prioritizeFixtures(data.response ?? []).slice(0, 10).map(f => ({
        id: f.fixture.id,
        time: new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }).format(new Date(f.fixture.date)),
        league: f.league.name,
        home: f.teams.home.name,
        away: f.teams.away.name
      }));
    } catch {
      fixtures = [];
    }
  }

  return (
    <main>
      <header><div><span className="pulse" /> RADAR 365</div><span className="live">EN VIVO</span></header>
      <section className="hero"><p className="eyebrow">HOY · {argentinaDate()}</p><h1>Radar de fútbol</h1><p className="muted">Datos reales, cuotas reales y análisis de valor. Sin picks ficticios.</p></section>

      <section className="health">
        <div><b>Datos fútbol</b><span className={footballConfigured ? 'ok' : 'warn'}>{footballConfigured ? 'Conectado' : 'Falta API'}</span></div>
        <div><b>PropLine</b><span className={oddsConfigured ? 'ok' : 'warn'}>{oddsConfigured ? 'Conectado' : 'Falta API'}</span></div>
        <div><b>Motor</b><span className="ok">Activo</span></div>
      </section>

      <nav>{markets.map(m => <span key={m}>{m}</span>)}</nav>

      <section className="logic">
        <p className="eyebrow">PARTIDOS PRIORITARIOS · HOY</p>
        {fixtures.length ? fixtures.map(f => (
          <div key={f.id} style={{padding:'14px 0',borderBottom:'1px solid #20242d'}}>
            <small className="muted">{f.time} · {f.league}</small>
            <div style={{fontWeight:700,marginTop:5}}>{f.home} — {f.away}</div>
          </div>
        )) : <p className="muted">No hay partidos prioritarios disponibles en el feed de hoy.</p>}
      </section>

      <section className="empty">
        <div className="radar"><i /><i /><i /></div>
        <h2>Motor de oportunidades</h2>
        <p>Las señales aparecerán cuando una línea real supere el umbral calculado. Si Bet365 no está disponible en el proveedor, Radar mostrará la cuota mínima necesaria en vez de inventarla.</p>
      </section>

      <footer>Radar 365 analiza; vos decidís y ejecutás cualquier apuesta.</footer>
    </main>
  );
}
