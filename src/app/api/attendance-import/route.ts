import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}})}

export async function GET(request:Request){
 const {searchParams}=new URL(request.url), athleteId=searchParams.get('athlete_id'), team=searchParams.get('team'), season=searchParams.get('season')
 let q=admin().from('attendance_imports').select('*').order('created_at',{ascending:false})
 if(athleteId)q=q.eq('athlete_id',athleteId); if(team)q=q.eq('team',team); if(season)q=q.eq('season',season)
 const {data,error}=await q; if(error)return NextResponse.json({error:error.message},{status:500}); return NextResponse.json(data||[])
}

export async function POST(request:Request){
 const body=await request.json(), rows=Array.isArray(body.rows)?body.rows:[]
 if(!body.team||!body.season||!rows.length)return NextResponse.json({error:'Team, season and matched attendance rows are required.'},{status:400})
 const db=admin()
 const payload=rows.filter((r:any)=>r.athlete_id).map((r:any)=>({athlete_id:r.athlete_id,athlete_name:r.athlete_name,team:body.team,season:body.season,raw_attendance:r.raw_attendance,adjusted_attendance:r.adjusted_attendance,source_file:body.source_file||null}))
 if(!payload.length)return NextResponse.json({error:'No matched athletes to save.'},{status:400})
 const {data,error}=await db.from('attendance_imports').upsert(payload,{onConflict:'athlete_id,season'}).select()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({saved:data?.length||payload.length,data})
}
