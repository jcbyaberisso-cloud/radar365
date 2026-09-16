const BASE='https://api.oddspapi.io/v4';
function apiKey(){const k=process.env.ODDSPAPI_API_KEY;if(!k)throw new Error('OddsPapi not configured');return k}
export async function oddsPapiRequest(path:string,params:Record<string,string>={}){const q=new URLSearchParams(params);q.set('apiKey',apiKey());const r=await fetch(`${BASE}${path}?${q}`,{cache:'no-store'});if(!r.ok)throw new Error(`OddsPapi ${r.status}`);return r.json()}
export async function oddsPapiAccount(){return oddsPapiRequest('/account')}
export async function bet365ArgentinaOdds(params:Record<string,string>={}){return oddsPapiRequest('/odds',{...params,bookmakers:'bet365.bet.ar',oddsFormat:'decimal'})}
