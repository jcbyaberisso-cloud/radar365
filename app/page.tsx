import { getFixturesByDate } from '../lib/football';
import { prioritizeFixtures } from '../lib/radar';
import { getNearestMarketPrices, type RadarPrice } from '../lib/live-markets';

const markets = ['Remates', 'Al arco', 'Atajadas', 'Goles', 'Corners', 'Tarjetas', 'Handicap', 'BTTS'];
const propSports = [
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_argentina_primera', label: 'Liga Profesional' },
  { key: 'soccer_uefa_champions_league', label: 'Champions League' }
];

function argentinaDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function localDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function marketName(key: string) {
  return key === 'player_shots' ? 'Remates' : key === 'player_shots_on_target' ? 'Al arco' : key === 'goalie_saves' ? 'Atajadas' : key;
}

export default async function Home() {
  const footballConfigured = Boolean(process.env.FOOTBALL_API_KEY);
  const oddsConfigured = Boolean(process.env.PROPLINE_API_KEY);
  let fixtures: Array<{ id: number; time: string; league: string; home: string; away: string }> = [];
  let propFeeds: Array<{ label: string; event: any; bookmakers: Array<{key:string;title:string}>; bet365Available: boolean; prices: RadarPrice[] }> = [];

  if (footballConfigured) {
    try {
      const data = await getFixturesByDate(argentinaDate());
      fixtures = prioritizeFixtures(data.response ?? []).slice(0, 8).map(f => ({
        id: f.fixture.id,
        time: new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' }).format(new Date(f.fixture.date)),
        league: f.league.name, home: f.teams.home.name, away: f.teams.away.name
      }));
    } catch { fixtures = []; }
  }

  if (oddsConfigured) {
    const settled = await Promise.allSettled(propSports.map(async sport => ({ label: sport.label, ...(await getNearestMarketPrices(sport.key, 6)) })));
    propFeeds = settled.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').map(r => r.value).filter(r => r.event && r.prices.length);
  }

  return (
    <main>
      <header><div><span className="pulse" /> RADAR 365</div><span className="live">EN VIVO</span></header>
      <section className="hero"><p className="eyebrow">HOY · {argentinaDate()}</p><h1>Radar de fútbol</h1><p className="muted">Partidos y mercados reales. El modelo de probabilidad sólo publicará señales cuando tenga respaldo estadístico suficiente.</p></section>

      <section className="health">
        <div><b>Datos fútbol</b><span className={footballConfigured ? 'ok' : 'warn'}>{footballConfigured ? 'Conectado' : 'Falta API'}</span></div>
        <div><b>Cuotas / props</b><span className={oddsConfigured ? 'ok' : 'warn'}>{oddsConfigured ? 'PropLine conectado' : 'Falta API'}</span></div>
        <div><b>Motor</b><span className="ok">Escaneando</span></div>
      </section>
      <nav>{markets.map(m => <span key={m}>{m}</span>)}</nav>

      <section className="sectionHead"><p className="eyebrow">MERCADOS REALES · PRÓXIMOS PARTIDOS</p><h2>Props detectados</h2></section>
      {propFeeds.length ? propFeeds.map(feed => (
        <section className="marketBlock" key={`${feed.label}-${feed.event.id}`}>
          <div className="matchHead">
            <div><small>{feed.label} · {localDate(feed.event.commence_time)}</small><h3>{feed.event.home_team} — {feed.event.away_team}</h3></div>
            <span className={feed.bet365Available ? 'bookOk' : 'bookWarn'}>{feed.bet365Available ? 'Bet365 detectado' : 'Bet365 no disponible'}</span>
          </div>
          <div className="priceGrid">
            {feed.prices.map((p, index) => (
              <article className="priceCard" key={`${p.bookmakerKey}-${p.market}-${p.player}-${p.outcome}-${index}`}>
                <div className="priceTop"><span>{marketName(p.market)}</span><b>{p.decimalOdds.toFixed(2)}</b></div>
                <h4>{p.player}</h4><p>{p.outcome}</p><small>{p.bookmaker}</small>
              </article>
            ))}
          </div>
          {!feed.bet365Available && <p className="note">Estas son referencias reales de las casas presentes en PropLine. Radar no las presenta como cuotas Bet365.</p>}
        </section>
      )) : <section className="empty"><div className="radar"><i /><i /><i /></div><h2>Sin props próximos</h2><p>El proveedor no devolvió props utilizables en las competiciones escaneadas.</p></section>}

      <section className="logic">
        <p className="eyebrow">PARTIDOS PRIORITARIOS · HOY</p>
        {fixtures.length ? fixtures.map(f => <div className="fixture" key={f.id}><small>{f.time} · {f.league}</small><b>{f.home} — {f.away}</b></div>) : <p className="muted">No hay partidos prioritarios disponibles en el feed de hoy.</p>}
      </section>

      <section className="logic"><p className="eyebrow">SIGUIENTE CAPA</p><h2>Modelo de valor</h2><p className="muted">Las cuotas ya son reales. Todavía no mostramos “verde” ni porcentaje de valor hasta calcular la probabilidad con histórico, rival, localía y XI. Así evitamos fabricar picks.</p></section>
      <footer>Radar 365 analiza; vos decidís y ejecutás cualquier apuesta.</footer>
    </main>
  );
}
