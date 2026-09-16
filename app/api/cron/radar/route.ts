import { NextResponse } from 'next/server';
import { getUpcomingMarketFeeds } from '../../../../lib/live-markets';
import { footballRequest, type FootballFixture } from '../../../../lib/football';
import { evaluatePrices } from '../../../../lib/opportunity-engine';
import { saveOpportunity, saveScan } from '../../../../lib/db';
export const dynamic='force-dynamic';export const maxDuration=300;
const SPORTS=['soccer_epl','soccer_argentina_primera','soccer_uefa_champions_league'];
const DISCOVERY_HOURS=168;const DEEP_ANALYSIS_HOURS=6;
const fixtureCache=new Map<string,FootballFixture[]>();
async function candidateFixtures(commenceTime?:string){if(!commenceTime)return[];const day=new Date(commenceTime).toISOString().slice(0,10);if(fixtureCache.has(day))return fixtureCache.get(day)!;const data=await footballRequest<{response:FootballFixture[]}>(`/fixtures?date=${day}&timezone=America%2FArgentina%2FBuenos_Aires`,21600);const fixtures=data.response??[];fixtureCache.set(day,fixtures);return fixtures}
function hoursUntil(value?:string|null){if(!value)return Infinity;return (Date.parse(value)-Date.now())/3600000}
export async function GET(request:Request){const secret=process.env.CRON_SECRET;if(secret&&request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
 const startedAt=new Date().toISOString();const scans:any[]=[];let deepAnalysisUsed=false;
 for(const sport of SPORTS){try{const feeds=await getUpcomingMarketFeeds(sport,2,8,DISCOVERY_HOURS);if(!feeds.length){const scanId=await saveScan({startedAt,sport,event:null,bookmakers:0,bet365Available:false,prices:0});scans.push({sport,scanId,persisted:true,reason:'No event inside discovery horizon'});continue}
  for(const feed of feeds){const event={id:String(feed.event.id),home_team:feed.event.home_team??null,away_team:feed.event.away_team??null,commence_time:feed.event.commence_time??null};const scanId=await saveScan({startedAt,sport,event,bookmakers:feed.bookmakers.length,bet365Available:feed.bet365Available,prices:feed.prices.length});let evaluation:any=null,saved=0;const nearKickoff=hoursUntil(event.commence_time)<=DEEP_ANALYSIS_HOURS&&hoursUntil(event.commence_time)>=-0.5;
   if(!deepAnalysisUsed&&nearKickoff&&feed.prices.length&&process.env.FOOTBALL_API_KEY){deepAnalysisUsed=true;const fixtures=await candidateFixtures(event.commence_time??undefined);evaluation=await evaluatePrices(event,feed.prices,fixtures);const publishable=(evaluation.opportunities??[]).filter((o:any)=>o.decision?.status!=='SIN MODELO'&&o.sampleSize>=3);for(const o of publishable){await saveOpportunity(scanId,sport,event,o);saved++}}
   scans.push({sport,scanId,event,bookmakers:feed.bookmakers.length,bet365Available:feed.bet365Available,prices:feed.prices.length,fixtureMatched:Boolean(evaluation?.matched),lineupConfirmed:Boolean(evaluation?.lineupConfirmed),deepAnalysis: Boolean(evaluation),opportunitiesEvaluated:evaluation?.opportunities?.length??0,opportunitiesSaved:saved,persisted:true});
  }}catch(error){scans.push({sport,persisted:false,error:error instanceof Error?error.message:'scan failed'})}}
 return NextResponse.json({ok:scans.some(s=>s.persisted),autonomous:true,database:'neon',model:'statistical-opportunity-engine',discoveryHorizonHours:DISCOVERY_HOURS,deepAnalysisHorizonHours:DEEP_ANALYSIS_HOURS,maxDeepAnalysesPerRun:1,startedAt,finishedAt:new Date().toISOString(),scans});}
