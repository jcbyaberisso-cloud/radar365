const BASE='https://api.oddspapi.io/v4';
function apiKey(){const k=process.env.ODDSPAPI_API_KEY;if(!k)throw new Error('OddsPapi not configured');return k}
export async function oddsPapiRequest(path:string,params:Record<string,string>={}){const q=new URLSearchParams(params);q.set('apiKey',apiKey());const r=await fetch(`${BASE}${path}?${q}`,{cache:'no-store'});if(!r.ok)throw new Error(`OddsPapi ${r.status}`);return r.json()}
export async function oddsPapiAccount(){return oddsPapiRequest('/account')}
export async function bet365ArgentinaOdds(params:Record<string,string>={}){return oddsPapiRequest('/odds',{...params,bookmakers:'bet365.bet.ar',oddsFormat:'decimal',language:'en',verbosity:'3'})}
export async function bet365ArgentinaFixtures(from:string,to:string){return oddsPapiRequest('/fixtures',{sportId:'10',from,to,statusId:'0',hasOdds:'true',bookmakers:'bet365.bet.ar',language:'en'})}
export function normalizeName(v:any){return String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(fc|cf|afc|club|deportivo|calcio)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
export function fixtureMatchScore(f:any,home:string,away:string,time?:string){const h=normalizeName(home),a=normalizeName(away),fh=normalizeName(f?.participant1Name),fa=normalizeName(f?.participant2Name);let s=0;if(fh===h)s+=4;else if(fh.includes(h)||h.includes(fh))s+=2;if(fa===a)s+=4;else if(fa.includes(a)||a.includes(fa))s+=2;if(time&&f?.startTime&&Math.abs(Date.parse(time)-Date.parse(f.startTime))<3*3600000)s+=2;return s}
