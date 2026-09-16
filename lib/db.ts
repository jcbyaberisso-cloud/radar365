import { neon } from '@neondatabase/serverless';

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export async function saveScan(input:{startedAt:string;sport:string;event:any;bookmakers:number;bet365Available:boolean;prices:number}) {
  const sql=db();
  const rows=await sql`INSERT INTO radar_scans(started_at,sport,event_id,home_team,away_team,commence_time,bookmakers_count,bet365_available,prices_count)
    VALUES(${input.startedAt},${input.sport},${input.event?.id?String(input.event.id):null},${input.event?.home_team??null},${input.event?.away_team??null},${input.event?.commence_time??null},${input.bookmakers},${input.bet365Available},${input.prices}) RETURNING id`;
  return Number(rows[0].id);
}

export async function saveOpportunity(scanId:number,sport:string,event:any,o:any){
  const sql=db();
  await sql`INSERT INTO radar_opportunities(scan_id,fixture_id,sport,event_id,home_team,away_team,commence_time,player,market,outcome,line,bookmaker,decimal_odds,model_probability,fair_odds,edge,status,sample_size,lineup_confirmed,confirmed_starter,unavailable)
  VALUES(${scanId},${o.fixtureId??null},${sport},${String(event.id)},${event.home_team??''},${event.away_team??''},${event.commence_time??null},${o.player??null},${o.market},${o.outcome??null},${o.line??null},${o.bookmaker??null},${o.decimalOdds},${o.estimate?.probability??null},${o.decision?.fairOdds??null},${o.decision?.edge??null},${o.decision?.status??'DESCARTAR'},${o.sampleSize??0},${Boolean(o.lineupConfirmed)},${Boolean(o.confirmedStarter)},${Boolean(o.unavailable)}) ON CONFLICT DO NOTHING`;
}

export async function recentOpportunities(limit=50){const sql=db();return sql`SELECT * FROM radar_opportunities ORDER BY captured_at DESC LIMIT ${limit}`;}
