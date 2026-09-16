import { NextResponse } from 'next/server';
import { recentOpportunities } from '../../../lib/db';

export const dynamic='force-dynamic';

export async function GET(){
 const checks={database:false,footballApi:Boolean(process.env.FOOTBALL_API_KEY),propLine:Boolean(process.env.PROPLINE_API_KEY),cronConfigured:true};
 let stored=0;let databaseError:string|null=null;
 try{const rows=await recentOpportunities(1);checks.database=true;stored=rows.length;}catch(error){databaseError=error instanceof Error?error.message:'Database check failed';}
 return NextResponse.json({ok:checks.database&&checks.footballApi&&checks.propLine,service:'Radar 365',checks,storedOpportunityProbe:stored,databaseError,checkedAt:new Date().toISOString()},{status:checks.database?200:503});
}
