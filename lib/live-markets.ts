import { propLineRequest } from './propline';

export const RADAR_MARKETS = [
  'player_shots','player_shots_on_target','goalie_saves','total_corners','team_corners','corners_spread',
  'totals','h2h','spreads','anytime_goal_scorer','2plus_goals','goal_or_assist','player_cards','team_cards'
];

export type RadarPrice={sport:string;eventId:string;home:string;away:string;commenceTime:string;bookmaker:string;bookmakerKey:string;market:string;player:string;outcome:string;line:number|null;decimalOdds:number};
type Event={id:string|number;home_team?:string;away_team?:string;commence_time?:string};
type Outcome={name?:string;description?:string;price?:number;point?:number};
type Market={key?:string;outcomes?:Outcome[]}; type Bookmaker={key?:string;title?:string;markets?:Market[]}; type OddsEvent=Event&{bookmakers?:Bookmaker[]};
function eventTime(e:Event){const p=e.commence_time?Date.parse(e.commence_time):NaN;return Number.isFinite(p)?p:Number.MAX_SAFE_INTEGER}
function americanToDecimal(p?:number){if(typeof p!=='number'||p===0)return null;return Number((p>0?1+p/100:1+100/Math.abs(p)).toFixed(2))}
function inferLine(o:Outcome){if(typeof o.point==='number')return o.point;const m=o.name?.match(/(\d+(?:\.\d+)?)\s*\+/);return m?Number(m[1]):null}
function clean(v?:string){if(!v)return'';if(!/[ÃÂ]/.test(v))return v;try{return Buffer.from(v,'latin1').toString('utf8')}catch{return v}}

export async function getNearestMarketPrices(sport:string,maxPrices=18){
 const events=await propLineRequest<Event[]>(`/sports/${encodeURIComponent(sport)}/events`); const now=Date.now();
 const event=events.filter(e=>eventTime(e)>=now-7200000).sort((a,b)=>eventTime(a)-eventTime(b))[0];
 if(!event)return{event:null,bookmakers:[],bet365Available:false,prices:[] as RadarPrice[]};
 const query=new URLSearchParams({eventIds:String(event.id),markets:RADAR_MARKETS.join(',')});
 const raw=await propLineRequest<OddsEvent[]|OddsEvent>(`/sports/${encodeURIComponent(sport)}/odds?${query}`); const arr=Array.isArray(raw)?raw:[raw]; const priced=arr.find(x=>String(x.id)===String(event.id))??arr[0];
 const bookmakers=(priced?.bookmakers??[]).map(b=>({key:b.key??'',title:b.title??b.key??'Unknown'})); const bet365Available=bookmakers.some(b=>/bet\s*365/i.test(`${b.key} ${b.title}`));
 const all:RadarPrice[]=(priced?.bookmakers??[]).flatMap(b=>(b.markets??[]).filter(m=>m.key&&RADAR_MARKETS.includes(m.key)).flatMap(m=>(m.outcomes??[]).map(o=>{const d=americanToDecimal(o.price);return d?{sport,eventId:String(event.id),home:event.home_team??'',away:event.away_team??'',commenceTime:event.commence_time??'',bookmaker:b.title??b.key??'Unknown',bookmakerKey:b.key??'',market:m.key??'',player:clean(o.description??o.name),outcome:clean(o.name),line:inferLine(o),decimalOdds:d}:null}).filter((v):v is RadarPrice=>Boolean(v))));
 const priority=['player_shots_on_target','player_shots','goalie_saves','total_corners','team_corners','totals','anytime_goal_scorer','goal_or_assist','player_cards','spreads','h2h'];
 const selected:RadarPrice[]=[]; const seen=new Set<string>();
 for(const market of priority){for(const p of all.filter(x=>x.market===market).sort((a,b)=>b.decimalOdds-a.decimalOdds)){const k=`${p.market}|${p.player}|${p.outcome}`;if(seen.has(k))continue;seen.add(k);selected.push(p);if(selected.filter(x=>x.market===market).length>=2||selected.length>=maxPrices)break}if(selected.length>=maxPrices)break}
 return{event,bookmakers,bet365Available,prices:selected};
}
