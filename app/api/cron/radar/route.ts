import { NextResponse } from 'next/server';
import { getUpcomingMarketFeeds } from '../../../../lib/live-markets';
import { footballRequest, type FootballFixture } from '../../../../lib/football';
import { evaluatePrices } from '../../../../lib/opportunity-engine';
import { saveOpportunity, saveScan } from '../../../../lib/db';
export const dynamic='force-dynamic';export const maxDuration=300;
const SPORTS=['soccer_epl','soccer_argentina_primera','soccer_uefa_champions_league'];
async function candidateFixtures(commenceTime?:string){if(!commenceTime)return[];const day=new Date(commenceTime).toISOString().slice(0,10);const data=await footballRequest<{response:FootballFixture[]}>(`/fixtures?date=${day}&timezone=America%2FArgentina%2FBuenos_Aires`,21600);return data.response??[]}
export async function GET(request:Request){const secret=process.env.CRON_SECRET;if(secret&&request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 const startedAt=new Date().toISOString();const scans:any[]=[];
 // Two events per competition, 36h horizon: enough to catch nearby fixtures without scanning a full slate repeatedly.
 for(const sport of SPORTS){try{const feeds=await getUpcomingMarketFeeds(sport,2,8,36);if(!feeds.length){scans.push({sport,persisted:false,reason:'No event inside 36h horizon'});continue}
  for(const feed of feeds){const event={id:String(feed.event.id),home_team:feed.event.home_team??null,away_team:feed.event.away_team??null,commence_time:feed.event.commence_time??null};const scanId=await saveScan({startedAt,sport,event,bookmakers:feed.bookmakers.length,bet365Available:feed.bet365Available,prices:feed.prices.length});let evaluation:any=null,saved=0;
   if(feed.prices.length&&process.env.FOOTBALL_API_KEY){const fixtures=await candidateFixtures(event.commence_time??undefined);evaluation=await evaluatePrices(event,feed.prices,fixtures);const publishable=(evaluation.opportunities??[]).filter((o:any)=>o.decision?.status!=='SIN MODELO'&&o.sampleSize>=3);for(const o of publishable){await saveOpportunity(scanId,sport,event,o);saved++}}
   scans.push({sport,scanId,event,bookmakers:feed.bookmakers.length,bet365Available:feed.bet365Available,prices:feed.prices.length,fixtureMatched:Boolean(evaluation?.matched),lineupConfirmed:Boolean(evaluation?.lineupConfirmed),opportunitiesEvaluated:evaluation?.opportunities?.length??0,opportunitiesSaved:saved,persisted:true});
  }}catch(error){scans.push({sport,persisted:false,error:error instanceof Error?error.message:'scan failed'})}}
 return NextResponse.json({ok:scans.some(s=>s.persisted),autonomous:true,database:'neon',model:'statistical-opportunity-engine',horizonHours:36,maxEventsPerSport:2,startedAt,finishedAt:new Date().toISOString(),scans});}
