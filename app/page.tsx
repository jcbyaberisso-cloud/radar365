import { recentOpportunities } from '../lib/db';

const markets = ['Remates', 'Al arco', 'Atajadas', 'Goles', 'Corners', 'Tarjetas', 'Handicap', 'BTTS'];
function argentinaDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function localDate(value:string) { return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function marketName(key:string) { const names:Record<string,string>={player_shots:'Remates',player_shots_on_target:'Al arco',goalie_saves:'Atajadas',player_cards:'Tarjetas',anytime_goal_scorer:'Gol',goal_or_assist:'Gol o asistencia',team_corners:'Corners',totals:'Goles'};return names[key]??key; }
function pct(v:any){const n=Number(v);return Number.isFinite(n)?`${(n*100).toFixed(0)}%`:'—';}
function num(v:any){const n=Number(v);return Number.isFinite(n)?n.toFixed(2):'—';}

export const dynamic='force-dynamic';

export default async function Home() {
  let rows:any[]=[];let databaseOk=true;
  try{rows=Array.from(await recentOpportunities(60)) as any[];}catch{databaseOk=false;}
  const now=Date.now();
  const upcoming=rows.filter(r=>!r.commence_time||Date.parse(r.commence_time)>now-3*3600000);
  const visible=upcoming.filter(r=>r.status!=='DESCARTAR').slice(0,24);
  const grouped=new Map<string,any[]>();for(const r of visible){const key=String(r.event_id);grouped.set(key,[...(grouped.get(key)??[]),r]);}

  return <main>
    <header><div><span className="pulse"/> RADAR 365</div><span className="live">AUTÓNOMO</span></header>
    <section className="hero"><p className="eyebrow">HOY · {argentinaDate()}</p><h1>Oportunidades de fútbol</h1><p className="muted">El escáner analiza en segundo plano; esta pantalla lee las señales persistidas.</p></section>
    <section className="health"><div><b>Base histórica</b><span className={databaseOk?'ok':'warn'}>{databaseOk?'Neon conectado':'Sin conexión'}</span></div><div><b>Señales guardadas</b><span className="ok">{rows.length}</span></div><div><b>Motor</b><span className="ok">Modelo activo</span></div></section>
    <nav>{markets.map(m=><span key={m}>{m}</span>)}</nav>

    <section className="sectionHead"><p className="eyebrow">RADAR · PRÓXIMOS PARTIDOS</p><h2>Señales calculadas</h2></section>
    {[...grouped.entries()].map(([eventId,items])=>{const first=items[0];return <section className="marketBlock" key={eventId}>
      <div className="matchHead"><div><small>{first.commence_time?localDate(first.commence_time):'Próximo partido'}</small><h3>{first.home_team} — {first.away_team}</h3></div><span className="bookOk">Persistido</span></div>
      <div className="priceGrid">{items.map((o:any,i:number)=><article className={`priceCard signal ${String(o.status).toLowerCase().replaceAll(' ','-')}`} key={`${o.id}-${i}`}>
        <div className="priceTop"><span>{marketName(o.market)}</span><b>{num(o.decimal_odds)}</b></div>
        <h4>{o.player||o.outcome}</h4><p>{o.outcome}</p>
        <div className="signalMetrics"><span><small>Modelo</small><b>{pct(o.model_probability)}</b></span><span><small>Justa</small><b>{num(o.fair_odds)}</b></span><span><small>Edge</small><b>{pct(o.edge)}</b></span><span><small>Muestra</small><b>{o.sample_size}</b></span></div>
        <div className="signalFoot"><strong>{o.status}</strong><small>{o.confirmed_starter?'XI confirmado':o.lineup_confirmed?'No figura titular':'Esperando XI'} · {o.bookmaker||'Referencia'}</small></div>
      </article>)}</div>
    </section>})}
    {!visible.length&&<section className="pending"><b>Radar activo</b><p>Todavía no hay oportunidades persistidas para mostrar. La pantalla se poblará con los próximos escaneos automáticos.</p></section>}
    <footer>Radar 365 analiza; vos decidís y ejecutás cualquier apuesta.</footer>
  </main>;
}
