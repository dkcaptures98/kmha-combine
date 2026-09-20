import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
function parseDateHeader(v: unknown): Date | null { if(v instanceof Date&&!Number.isNaN(v.getTime()))return v;if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);return p?new Date(Date.UTC(p.y,p.m-1,p.d)):null}const s=String(v??'').trim();if(!s||/^(first|last|total|perc\.?|percentage)$/i.test(s))return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d }
const iso=(d:Date)=>d.toISOString().slice(0,10)
function seasonFromDates(dates:Date[]){const d=dates[dates.length-1],y=d.getUTCFullYear();return d.getUTCMonth()+1>=5?`${y}-${y+1}`:`${y-1}-${y}`}

export async function GET(request:Request){
 const supabase=await createClient(),{searchParams}=new URL(request.url),athleteId=searchParams.get('athlete_id'),season=searchParams.get('season'),team=searchParams.get('team')
 let q=supabase.from('attendance_imports').select('*').order('updated_at',{ascending:false});if(athleteId)q=q.eq('athlete_id',athleteId);if(season)q=q.eq('season',season);if(team)q=q.eq('team',team)
 let {data,error}=await q;if(error)return NextResponse.json({error:error.message},{status:500})
 if(athleteId&&(!data||!data.length)){let aq=supabase.from('attendance_imports').select('*').order('updated_at',{ascending:false});if(season)aq=aq.eq('season',season);if(team)aq=aq.eq('team',team);const all=await aq;if(all.error)return NextResponse.json({error:all.error.message},{status:500});const rows=all.data??[];if(rows.length){const ids=[...new Set(rows.map(r=>String(r.athlete_id)).filter(Boolean))],ar=await supabase.from('athletes').select('id,first_name,last_name,team').in('id',ids);if(ar.error)return NextResponse.json({error:ar.error.message},{status:500});const key=norm(athleteId),a=(ar.data??[]).find(x=>{const nk=norm(`${x.first_name}${x.last_name}`),tk=norm(x.team);return !!nk&&key.endsWith(nk)&&(!tk||key.includes(tk))});if(a)data=rows.filter(r=>String(r.athlete_id)===String(a.id))}}
 return NextResponse.json(data??[])
}

export async function POST(request:Request){
 const supabase=await createClient(),form=await request.formData(),file=form.get('file') as File|null,requestedTeam=String(form.get('team')??'').trim(),autoTeams=!requestedTeam||requestedTeam==='__AUTO__',preview=String(form.get('preview')??'')==='1'
 if(!file)return NextResponse.json({error:'TeamBuildr Excel file is required.'},{status:400})
 const wb=XLSX.read(Buffer.from(await file.arrayBuffer()),{type:'buffer',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:null,raw:true})
 if(rows.length<2)return NextResponse.json({error:'The workbook has no attendance rows.'},{status:400})
 const headers=rows[0],firstIdx=headers.findIndex(h=>/^first$/i.test(String(h??'').trim())),lastIdx=headers.findIndex(h=>/^last$/i.test(String(h??'').trim()))
 if(firstIdx<0||lastIdx<0)return NextResponse.json({error:'Could not find First and Last columns.'},{status:400})
 const dateCols=headers.map((h,i)=>({i,d:parseDateHeader(h)})).filter((x):x is {i:number;d:Date}=>!!x.d).sort((a,b)=>a.d.getTime()-b.d.getTime())
 if(!dateCols.length)return NextResponse.json({error:'No session-date columns were detected.'},{status:400})
 const season=seasonFromDates(dateCols.map(x=>x.d))

 // A combined TeamBuildr export must be matched only against the current
 // in-season roster. Historical/offseason rows were causing false duplicates.
 let athleteQuery=supabase.from('athletes').select('id,first_name,last_name,team,season,roster_phase,active').eq('season',season).eq('roster_phase','inseason')
 if(!autoTeams)athleteQuery=athleteQuery.eq('team',requestedTeam)
 const {data:athletes,error:athleteError}=await athleteQuery
 if(athleteError)return NextResponse.json({error:athleteError.message},{status:500})

 const roster=new Map<string,any[]>()
 for(const a of athletes??[]){const key=`${norm(a.first_name)}|${norm(a.last_name)}`;roster.set(key,[...(roster.get(key)??[]),a])}
 const matched:any[]=[],unmatched:string[]=[],ambiguous:string[]=[]
 for(const row of rows.slice(1)){
  const first=String(row[firstIdx]??'').trim(),last=String(row[lastIdx]??'').trim();if(!first&&!last)continue
  const firstKey=norm(first),lastKey=norm(last);if(['total','perc','percentage','test'].includes(firstKey)||['total','perc','percentage'].includes(lastKey))continue
  const candidates=roster.get(`${firstKey}|${lastKey}`)??[]
  if(!candidates.length){unmatched.push(`${first} ${last}`.trim());continue}

  // Duplicate DB rows are okay when they all resolve to one current team.
  // Only flag the name if the current in-season roster genuinely has it on
  // multiple teams.
  const teamNames=[...new Set(candidates.map(c=>String(c.team??'').trim()).filter(Boolean))]
  if(teamNames.length!==1){ambiguous.push(`${first} ${last}`.trim());continue}
  const team=teamNames[0]
  const teamCandidates=candidates.filter(c=>String(c.team??'').trim()===team)
  const athlete=teamCandidates.find(c=>c.active===true)??teamCandidates[0]

  const sessionData:Record<string,number>={};let rawAttended=0
  for(const c of dateCols){const val=row[c.i],attended=val===1||val==='1'||String(val??'').trim().toLowerCase()==='yes'?1:0;sessionData[iso(c.d)]=attended;rawAttended+=attended}
  const total=dateCols.length,bonus=Math.ceil(total*.07),adjusted=Math.min(total,rawAttended+bonus)
  matched.push({athlete_id:athlete.id,athlete_name:`${athlete.first_name} ${athlete.last_name}`,team:athlete.team,season,first_session:iso(dateCols[0].d),last_session:iso(dateCols[dateCols.length-1].d),raw_attended:rawAttended,total_sessions:total,bonus_sessions:bonus,adjusted_attended:adjusted,adjusted_percentage:total?Number((adjusted/total*100).toFixed(1)):0,session_data:sessionData,source_filename:file.name,updated_at:new Date().toISOString()})
 }
 if(!preview&&matched.length){const payload=matched.map(({athlete_name,...r})=>r),{error}=await supabase.from('attendance_imports').upsert(payload,{onConflict:'athlete_id,season'});if(error)return NextResponse.json({error:error.message},{status:500})}
 const teams=[...new Set(matched.map(a=>a.team))].sort()
 return NextResponse.json({team:autoTeams?'Auto-detect':requestedTeam,teams,season,first_session:iso(dateCols[0].d),last_session:iso(dateCols[dateCols.length-1].d),total_sessions:dateCols.length,bonus_sessions:Math.ceil(dateCols.length*.07),matched,unmatched,ambiguous,saved:!preview})
}
