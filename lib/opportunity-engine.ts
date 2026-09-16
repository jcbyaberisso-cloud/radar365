import { getHistoricalPlayerSamples,getHistoricalTeamSamples,footballRequest,type FootballFixture,type PlayerSampleMarket } from './football';
import { estimateOverProbability,valueDecision } from './stat-model';
import { matchFixture } from './matcher'; import type { RadarPrice } from './live-markets';
type Lineup={team?:{id?:number};startXI?:Array<{player?:{name?:string}}>}; type Injury={player?:{name?:string}};
const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function playerInLineup(ls:Lineup[],name:string){const t=norm(name);return ls.some(l=>(l.startXI??[]).some(x=>{const n=norm(x.player?.name??'');return n&&(n.includes(t)||t.includes(n))}))}
function injured(xs:Injury[],name:string){const t=norm(name);return xs.some(i=>{const n=norm(i.player?.name??'');return n&&(n.includes(t)||t.includes(n))})}
function teamFromText(price:RadarPrice,fixture:FootballFixture){const t=norm(`${price.player} ${price.outcome}`);const h=norm(fixture.teams.home.name),a=norm(fixture.teams.away.name);return t.includes(h)?fixture.teams.home.id:t.includes(a)?fixture.teams.away.id:null}
const playerMarkets=new Set<PlayerSampleMarket>(['player_shots','player_shots_on_target','goalie_saves','player_cards','anytime_goal_scorer','goal_or_assist']);
function binaryProbability(samples:Array<{value:number}>,line:number){if(samples.length<4)return null;const hits=samples.filter(s=>s.value>line).length;return (hits+1)/(samples.length+2)}

export async function evaluatePrices(event:{home_team?:string;away_team?:string;commence_time?:string},prices:RadarPrice[],candidateFixtures:FootballFixture[]){
 const matched=matchFixture(event,candidateFixtures);if(!matched)return{matched:false,fixture:null,opportunities:[]};const fixture=matched.fixture;
 const [ld,id]=await Promise.all([footballRequest<{response:Lineup[]}>(`/fixtures/lineups?fixture=${fixture.fixture.id}`,600),footballRequest<{response:Injury[]}>(`/injuries?fixture=${fixture.fixture.id}`,14400)]);const lineups=ld.response??[],injuries=id.response??[],lineupConfirmed=lineups.length>=2;
 const supported=prices.filter(p=>playerMarkets.has(p.market as PlayerSampleMarket)||['team_corners','total_corners','totals'].includes(p.market)).slice(0,12);const opportunities:any[]=[];
 for(const price of supported){
  let samples:Array<{value:number;minutes?:number}>=[],teamId:number|null=null,confirmedStarter=false,unavailable=false;
  if(playerMarkets.has(price.market as PlayerSampleMarket)){
   const isH=playerInLineup(lineups.filter(l=>l.team?.id===fixture.teams.home.id),price.player),isA=playerInLineup(lineups.filter(l=>l.team?.id===fixture.teams.away.id),price.player);teamId=isH?fixture.teams.home.id:isA?fixture.teams.away.id:null;
   if(teamId)samples=await getHistoricalPlayerSamples(teamId,price.player,price.market as PlayerSampleMarket,6);else{const h=await getHistoricalPlayerSamples(fixture.teams.home.id,price.player,price.market as PlayerSampleMarket,6);if(h.length>=3){teamId=fixture.teams.home.id;samples=h}else{const a=await getHistoricalPlayerSamples(fixture.teams.away.id,price.player,price.market as PlayerSampleMarket,6);if(a.length>=3){teamId=fixture.teams.away.id;samples=a}}}
   confirmedStarter=lineupConfirmed&&playerInLineup(lineups,price.player);unavailable=injured(injuries,price.player);
  }else{
   teamId=teamFromText(price,fixture);if(price.market==='team_corners'&&teamId)samples=await getHistoricalTeamSamples(teamId,'corners',6);else if(price.market==='totals'&&teamId)samples=await getHistoricalTeamSamples(teamId,'goals',6);else if(price.market==='total_corners'){const [h,a]=await Promise.all([getHistoricalTeamSamples(fixture.teams.home.id,'corners',6),getHistoricalTeamSamples(fixture.teams.away.id,'corners',6)]);samples=h.slice(0,Math.min(h.length,a.length)).map((x,i)=>({value:x.value+a[i].value,minutes:90}))}
  }
  const line=price.line??(price.market==='anytime_goal_scorer'||price.market==='goal_or_assist'?0.5:null);if(line===null)continue;
  let estimate:any;if(price.market==='anytime_goal_scorer'||price.market==='goal_or_assist'||price.market==='player_cards'){const probability=binaryProbability(samples,line);estimate={probability,sampleSize:samples.length,confidence:samples.length>=6?'MEDIA':'BAJA'}}else estimate=estimateOverProbability({samples,line,expectedMinutes:confirmedStarter?85:75,lineupConfirmed:confirmedStarter});
  const decision=valueDecision(estimate.probability??null,price.decimalOdds,playerMarkets.has(price.market as PlayerSampleMarket)?confirmedStarter:true);opportunities.push({...price,fixtureId:fixture.fixture.id,teamId,lineupConfirmed,confirmedStarter,unavailable,sampleSize:samples.length,estimate,decision:unavailable?{...decision,status:'DESCARTAR'}:decision});
 }
 opportunities.sort((a,b)=>(b.decision.edge??-99)-(a.decision.edge??-99));return{matched:true,matchScore:matched.score,fixture:{id:fixture.fixture.id,home:fixture.teams.home.name,away:fixture.teams.away.name},lineupConfirmed,injuriesCount:injuries.length,opportunities};
}
