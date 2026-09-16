import { getFixturesByDate, footballRequest, type FootballFixture } from '../lib/football';
import { prioritizeFixtures } from '../lib/radar';
import { getNearestMarketPrices, type RadarPrice } from '../lib/live-markets';
import { evaluatePrices } from '../lib/opportunity-engine';

const markets = ['Remates', 'Al arco', 'Atajadas', 'Goles', 'Corners', 'Tarjetas', 'Handicap', 'BTTS'];
const propSports = [
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_argentina_primera', label: 'Liga Profesional' },
  { key: 'soccer_uefa_champions_league', label: 'Champions League' }
];

function argentinaDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
function localDate(value:string) { return new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value)); }
function marketName(key:string) { return key==='player_shots'?'Remates':key==='player_shots_on_target'?'Al arco':key==='goalie_saves'?'Atajadas':key; }
function pct(v:number|null|undefined){ return typeof v==='number'?`${(v*100).toFixed(0)}%`:'—'; }
function num(v:number|null|undefined){ return typeof v==='number'?v.toFixed(2):'—'; }

export default async function Home() {
  const footballConfigured=Boolean(process.env.FOOTBALL_API_KEY), oddsConfigured=Boolean(process.env.PROPLINE_API_KEY);
  let fixtures:FootballFixture[]=[];
  let feeds:Array<{label:string;event:any;bookmakers:any[];bet365Available:boolean;prices:RadarPrice[];evaluation?:any}>=[];

  if(footballConfigured){ try{ const data=await getFixturesByDate(argentinaDate()); fixtures=data.response??[]; }catch{} }
  if(oddsConfigured){
    const settled=await Promise.allSettled(propSports.map(async s=>({label:s.label,...await getNearestMarketPrices(s.key,5)})));
    feeds=settled.filter((r):r is PromiseFulfilledResult<any>=>r.status==='fulfilled').map(r=>r.value).filter(r=>r.event&&r.prices.length);
  }

  // Match each PropLine event against a narrow API-Football kickoff window, then run the model.
  if(footballConfigured&&feeds.length){
    feeds=await Promise.all(feeds.map(async feed=>{
      try{
        const kick=new Date(feed.event.commence_time); const from=new Date(kick.getTime()-3*3600000).toISOString(); const to=new Date(kick.getTime()+3*3600000).toISOString();
        const nearby=await footballRequest<{response:FootballFixture[]}>(`/fixtures?from=${from.slice(0,10)}&to=${to.slice(0,10)}&timezone=America%2FArgentina%2FBuenos_Aires`,21600);
        return {...feed,evaluation:await evaluatePrices(feed.event,feed.prices,nearby.response??fixtures)};
      }catch{return feed;}
    }));
  }

  const priority=prioritizeFixtures(fixtures).slice(0,8);
  return <main>
    <header><div><span className="pulse"/> RADAR 365</div><span className="live">EN VIVO</span></header>
    <section className="hero"><p className="eyebrow">HOY · {argentinaDate()}</p><h1>Oportunidades de fútbol</h1><p className="muted">Mercado real → histórico → probabilidad → cuota justa → valor.</p></section>
    <section className="health"><div><b>Datos fútbol</b><span className={footballConfigured?'ok':'warn'}>{footballConfigured?'Conectado':'Falta API'}</span></div><div><b>Cuotas / props</b><span className={oddsConfigured?'ok':'warn'}>{oddsConfigured?'PropLine conectado':'Falta API'}</span></div><div><b>Motor</b><span className="ok">Modelo activo</span></div></section>
    <nav>{markets.map(m=><span key={m}>{m}</span>)}</nav>

    <section className="sectionHead"><p className="eyebrow">RADAR · PRÓXIMOS PARTIDOS</p><h2>Señales calculadas</h2></section>
    {feeds.map(feed=><section className="marketBlock" key={`${feed.label}-${feed.event.id}`}>
      <div className="matchHead"><div><small>{feed.label} · {localDate(feed.event.commence_time)}</small><h3>{feed.event.home_team} — {feed.event.away_team}</h3></div><span className={feed.bet365Available?'bookOk':'bookWarn'}>{feed.bet365Available?'Bet365 detectado':'Referencia externa'}</span></div>
      {feed.evaluation?.opportunities?.length ? <div className="priceGrid">{feed.evaluation.opportunities.map((o:any,i:number)=><article className={`priceCard signal ${String(o.decision.status).toLowerCase().replaceAll(' ','-')}`} key={`${o.player}-${o.market}-${i}`}>
        <div className="priceTop"><span>{marketName(o.market)}</span><b>{o.decimalOdds.toFixed(2)}</b></div>
        <h4>{o.player}</h4><p>{o.outcome}</p>
        <div className="signalMetrics"><span><small>Modelo</small><b>{pct(o.estimate?.probability)}</b></span><span><small>Justa</small><b>{num(o.decision?.fairOdds)}</b></span><span><small>Edge</small><b>{pct(o.decision?.edge)}</b></span><span><small>Muestra</small><b>{o.sampleSize}</b></span></div>
        <div className="signalFoot"><strong>{o.decision.status}</strong><small>{o.confirmedStarter?'XI confirmado':o.lineupConfirmed?'No figura titular':'Esperando XI'} · {o.bookmaker}</small></div>
      </article>)}</div> : <div className="pending"><b>Mercados detectados</b><p>{feed.evaluation?.matched===false?'Todavía no se pudo emparejar este partido con API-Football.':'Sin muestra estadística suficiente para publicar una señal.'}</p></div>}
      {!feed.bet365Available&&<p className="note">La cuota mostrada pertenece a la casa indicada. No se presenta como Bet365.</p>}
    </section>)}

    <section className="logic"><p className="eyebrow">PARTIDOS PRIORITARIOS · HOY</p>{priority.length?priority.map(f=><div className="fixture" key={f.fixture.id}><small>{new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}).format(new Date(f.fixture.date))} · {f.league.name}</small><b>{f.teams.home.name} — {f.teams.away.name}</b></div>):<p className="muted">Sin partidos prioritarios hoy.</p>}</section>
    <footer>Radar 365 analiza; vos decidís y ejecutás cualquier apuesta.</footer>
  </main>;
}
