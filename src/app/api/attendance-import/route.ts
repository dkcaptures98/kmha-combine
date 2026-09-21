import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const norm=(v:unknown)=>String(v??'').trim().toLowerCase().replace(/[^a-z0-9]/g,'')
function parseDateHeader(v:unknown):Date|null{if(v instanceof Date&&!Number.isNaN(v.getTime()))return v;if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);return p?new Date(Date.UTC(p.y,p.m-1,p.d)):null}const s=String(v??'').trim();if(!s||/^(first|last|total|perc\.?|percentage)$/i.test(s))return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d}
const iso=(d:Date)=>d.toISOString().slice(0,10)
function seasonFromDates(ds:Date[]){const d=ds[ds.length-1],y=d.getUTCFullYear();return d.getUTCMonth()+1>=5?`${y}-${y+1}`:`${y-1}-${y}`}

export async function GET(request:Request){const supabase=await createClient();const{searchParams}=new URL(request.url);let q=supabase.from('attendance_imports').select('*').order('updated_at',{ascending:false});const athleteId=searchParams.get('athlete_id'),season=searchParams.get('season'),team=searchParams.get('team');if(athleteId)q=q.eq('athlete_id',athleteId);if(season)q=q.eq('season',season);if(team)q=q.eq('team',team);const{data,error}=await q;if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json(data??[])}

export async function POST(request:Request){
 const supabase=await createClient(),form=await request.formData(),file=form.get('file') as File|null,preview=String(form.get('preview')??'')==='1'
 if(!file)return NextResponse.json({error:'TeamBuildr Excel file is required.'},{status:400})
 const wb=XLSX.read(Buffer.from(await file.arrayBuffer()),{type:'buffer',cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:null,raw:true})
 if(rows.length<2)return NextResponse.json({error:'The workbook has no attendance rows.'},{status:400})
 let headerRow=-1,firstIdx=-1,lastIdx=-1,dateCols:{i:number;d:Date}[]=[]
 for(let r=0;r<Math.min(rows.length,60);r++){const h=rows[r],fi=h.findIndex(x=>/^(first|first name|firstname)$/i.test(String(x??'').trim())),li=h.findIndex(x=>/^(last|last name|lastname)$/i.test(String(x??'').trim())),dc=h.map((x,i)=>({i,d:parseDateHeader(x)})).filter((x):x is{i:number;d:Date}=>!!x.d).sort((a,b)=>a.d.getTime()-b.d.getTime());if(fi>=0&&li>=0&&dc.length){headerRow=r;firstIdx=fi;lastIdx=li;dateCols=dc;break}}
 if(headerRow<0)return NextResponse.json({error:'Could not detect First/Last and session-date columns.'},{status:400})
 const season=seasonFromDates(dateCols.map(x=>x.d))
 // Match against the complete athlete table so one TeamBuildr export can contain many KMHA teams.
 const{data:athletes,error:athleteError}=await supabase.from('athletes').select('id,first_name,last_name,team')
 if(athleteError)return NextResponse.json({error:athleteError.message},{status:500})
 const byName=new Map<string,any[]>();for(const a of athletes??[]){const k=`${norm(a.first_name)}|${norm(a.last_name)}`;byName.set(k,[...(byName.get(k)??[]),a])}
 const matched:any[]=[],unmatched:string[]=[],ambiguous:string[]=[]
 for(const row of rows.slice(headerRow+1)){const first=String(row[firstIdx]??'').trim(),last=String(row[lastIdx]??'').trim();if(!first&&!last)continue;const hits=byName.get(`${norm(first)}|${norm(last)}`)??[];if(!hits.length){unmatched.push(`${first} ${last}`.trim());continue}if(hits.length>1){ambiguous.push(`${first} ${last}`.trim());continue}const athlete=hits[0],sessionData:Record<string,number>={};let rawAttended=0;for(const c of dateCols){const v=String(row[c.i]??'').trim().toLowerCase(),attended=row[c.i]===1||v==='1'||v==='yes'||v==='x'||v==='present'?1:0;sessionData[iso(c.d)]=attended;rawAttended+=attended}const total=dateCols.length,bonus=Math.ceil(total*.07),adjusted=Math.min(total,rawAttended+bonus);matched.push({athlete_id:athlete.id,athlete_name:`${athlete.first_name} ${athlete.last_name}`,team:athlete.team,season,first_session:iso(dateCols[0].d),last_session:iso(dateCols.at(-1)!.d),raw_attended:rawAttended,total_sessions:total,bonus_sessions:bonus,adjusted_attended:adjusted,adjusted_percentage:total?Number((adjusted/total*100).toFixed(1)):0,session_data:sessionData,source_filename:file.name,updated_at:new Date().toISOString()})}
 if(!preview&&matched.length){const payload=matched.map(({athlete_name,...r})=>r),{error}=await supabase.from('attendance_imports').upsert(payload,{onConflict:'athlete_id,season'});if(error)return NextResponse.json({error:error.message},{status:500})}
 const teams=[...new Set(matched.map(x=>x.team).filter(Boolean))].sort()
 return NextResponse.json({team:teams.length===1?teams[0]:'Multiple teams',teams,season,first_session:iso(dateCols[0].d),last_session:iso(dateCols.at(-1)!.d),total_sessions:dateCols.length,bonus_sessions:Math.ceil(dateCols.length*.07),matched,unmatched,ambiguous,saved:!preview})
}
