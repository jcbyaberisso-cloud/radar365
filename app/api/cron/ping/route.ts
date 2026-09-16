import { NextResponse } from 'next/server';
import { saveScan } from '../../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{const now=new Date().toISOString();const scanId=await saveScan({startedAt:now,sport:'system_probe',event:null,bookmakers:0,bet365Available:false,prices:0});return NextResponse.json({ok:true,probe:true,scanId,at:now})}catch(error){return NextResponse.json({ok:false,probe:true,error:error instanceof Error?error.message:'probe failed'},{status:500})}}
