'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { TEAMS } from '@/types'

export const dynamic = 'force-dynamic'
const SEASONS = ['2025-2026', '2026-2027']
const PHASES = ['offseason', 'inseason']

type ImportResult = { dryRun:boolean; season:string; roster_phase:string; teamsDetected?:string[]; rowsWithNames?:number; rowsWithResults?:number; matched?:number; missing?:number; readyToImport?:number; imported?:number; skippedMissing?:number; missingExamples?:any[]; teamCounts?:Record<string,number>; format?:string }

function parseCsv(text:string){
  return text.split(/\r?\n/).filter(line=>line.trim()).map(line=>{
    const cells:string[]=[]; let current=''; let inQuotes=false
    for(let i=0;i<line.length;i++){
      const char=line[i], next=line[i+1]
      if(char==='"'&&next==='"'){current+='"';i++}
      else if(char==='"') inQuotes=!inQuotes
      else if(char===','&&!inQuotes){cells.push(current.trim());current=''}
      else current+=char
    }
    cells.push(current.trim()); return cells
  })
}

async function readExcelFile(file:File):Promise<any[][]>{
  const XLSX=await import('xlsx'); const buffer=await file.arrayBuffer(); const workbook=XLSX.read(buffer,{type:'array'}); const sheet=workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}) as any[][]
}

export default function CombineImportPage(){
  const [season,setSeason]=useState('2026-2027')
  const [phase,setPhase]=useState('offseason')
  const [team,setTeam]=useState('')
  const [grid,setGrid]=useState<any[][]>([])
  const [csvText,setCsvText]=useState('')
  const [fileName,setFileName]=useState('')
  const [result,setResult]=useState<ImportResult|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [allowOverwriteExisting,setAllowOverwriteExisting]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  function syncCsvText(text:string){setCsvText(text);setGrid(parseCsv(text));setFileName(text.trim()?'Pasted CSV':'');setResult(null);setError('')}
  async function handleFile(file?:File){if(!file)return;setFileName(file.name);setResult(null);setError('');try{if(/\.xlsx?$/.test(file.name.toLowerCase())){const excelGrid=await readExcelFile(file);setGrid(excelGrid);setCsvText(excelGrid.slice(0,20).map(r=>r.join(',')).join('\n'))}else{const text=await file.text();setCsvText(text);setGrid(parseCsv(text))}}catch(err){setError(err instanceof Error?err.message:'Could not read file.')}}
  async function runImport(dryRun:boolean){
    const liveGrid=csvText.trim()?parseCsv(csvText):grid
    if(!team){setError('Select the team before importing.');return}
    if(!liveGrid.length){setError('Upload a combine file or paste CSV content first.');return}
    setGrid(liveGrid);setLoading(true);setError('')
    try{
      const res=await fetch('/api/import-combine-results',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grid:liveGrid,season,roster_phase:phase,team,dryRun,allowOverwriteExisting})})
      const data=await res.json(); if(!res.ok) throw new Error(data?.error||'Combine import failed'); setResult(data)
    }catch(err){setError(err instanceof Error?err.message:'Combine import failed')}finally{setLoading(false)}
  }

  const liveGridCount=csvText.trim()?parseCsv(csvText).length:grid.length
  const canConfirm=result?.dryRun===true&&!loading&&(result?.missing??0)===0
  const uniqueMissing = Array.from(new Map((result?.missingExamples||[]).map((m:any)=>[`${m.first_name||''}|${m.last_name||''}`,{first_name:m.first_name,last_name:m.last_name}])).values()) as {first_name?:string;last_name?:string}[]

  return <div style={{paddingBottom:'48px',width:'100%'}}><div style={{maxWidth:'1120px',margin:'0 auto',padding:'0 20px'}}>
    <div style={{borderBottom:'1px solid rgba(59,130,246,0.1)',padding:'24px 0 20px',marginBottom:'24px'}}><Link href="/dashboard" style={{display:'inline-block',marginBottom:'12px',color:'#60a5fa',fontSize:'13px',textDecoration:'none'}}>← Back to Dashboard</Link><h1 style={{margin:0,fontFamily:'var(--font-display)',fontSize:'36px',fontWeight:700,letterSpacing:'0.06em',color:'white'}}>COMBINE IMPORT</h1><p style={{margin:'6px 0 0',color:'#64748b',fontSize:'13px'}}>Upload a file or paste long-format CSV directly. Missing test cells are okay.</p></div>
    <div style={{maxWidth:'860px',margin:'0 auto 20px',background:'rgba(10,20,40,0.8)',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'10px',padding:'20px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'12px',marginBottom:'16px'}}>
        <select value={season} onChange={e=>{setSeason(e.target.value);setResult(null)}} className="kmha-select w-full">{SEASONS.map(s=><option key={s}>{s}</option>)}</select>
        <select value={phase} onChange={e=>{setPhase(e.target.value);setResult(null);setAllowOverwriteExisting(false)}} className="kmha-select w-full">{PHASES.map(p=><option key={p}>{p}</option>)}</select>
        <select value={team} onChange={e=>{setTeam(e.target.value);setResult(null)}} className="kmha-select w-full"><option value="">Select team...</option>{TEAMS.map(t=><option key={t}>{t}</option>)}</select>
      </div>
      <div onClick={()=>fileRef.current?.click()} style={{border:'2px dashed rgba(59,130,246,0.2)',borderRadius:'8px',padding:'34px',textAlign:'center',cursor:'pointer',marginBottom:'14px',background:'rgba(5,15,35,0.25)'}}><p style={{margin:'0 0 8px',fontSize:'32px'}}>📊</p><p style={{margin:'0 0 4px',fontSize:'14px',color:'#94a3b8'}}>Click to upload combine Excel/CSV</p><p style={{margin:0,fontSize:'12px',color:'#334155'}}>Or paste CSV text below</p><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={e=>handleFile(e.target.files?.[0])} style={{display:'none'}}/></div>
      {fileName&&<p style={{margin:'0 0 12px',color:'#60a5fa',fontSize:'12px'}}>{fileName}</p>}
      <textarea value={csvText} onChange={e=>syncCsvText(e.target.value)} rows={9} style={{width:'100%',background:'rgba(5,15,35,0.8)',border:'1px solid rgba(59,130,246,0.2)',color:'white',borderRadius:'6px',padding:'10px 12px',fontSize:'12px',fontFamily:'monospace',resize:'vertical',outline:'none',boxSizing:'border-box'}}/>
      <p style={{margin:'8px 0 0',color:'#475569',fontSize:'12px'}}>{liveGridCount} CSV rows detected</p>
      <label style={{display:'flex',gap:'10px',alignItems:'flex-start',marginTop:'14px',padding:'12px',borderRadius:'8px',background:allowOverwriteExisting?'rgba(245,158,11,0.10)':'rgba(5,15,35,0.45)',border:allowOverwriteExisting?'1px solid rgba(245,158,11,0.45)':'1px solid rgba(148,163,184,0.15)',color:'#cbd5e1',fontSize:'13px',cursor:'pointer'}}><input type="checkbox" checked={allowOverwriteExisting} onChange={e=>{setAllowOverwriteExisting(e.target.checked);setResult(null);setError('')}} style={{marginTop:'2px'}}/><span><strong style={{color:allowOverwriteExisting?'#fbbf24':'#e2e8f0'}}>Overwrite existing results</strong><br/><span style={{fontSize:'12px',color:'#94a3b8'}}>Use only for intentional recovery. Existing {phase} results for matched athletes will be replaced.</span></span></label>
      {error&&<div style={{marginTop:'12px',padding:'10px 14px',borderRadius:'6px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171',fontSize:'13px'}}>{error}</div>}
      <div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button onClick={()=>runImport(true)} disabled={!liveGridCount||!team||loading} style={{flex:1,padding:'11px',borderRadius:'8px'}}>Preview Import</button><button onClick={()=>runImport(false)} disabled={!canConfirm} style={{flex:1,padding:'11px',borderRadius:'8px',background:canConfirm?(allowOverwriteExisting?'#b45309':'#2563eb'):'#334155',color:'white',border:'none'}}>{allowOverwriteExisting?'Confirm OVERWRITE':'Confirm Import'}</button></div>
    </div>
    {result&&<div style={{maxWidth:'860px',margin:'0 auto',padding:'16px',border:'1px solid rgba(59,130,246,0.15)',borderRadius:'10px',background:'rgba(10,20,40,0.8)',color:'white'}}><strong>{result.dryRun?'Preview Result':'Import Complete'} · {result.season} · {result.roster_phase}</strong><div style={{marginTop:'10px',color:'#94a3b8',fontSize:'13px'}}>Matched: {result.matched??result.imported??0} · Missing: {result.missing??result.skippedMissing??0} · Ready: {result.readyToImport??result.imported??0}</div>{uniqueMissing.length>0&&<div style={{marginTop:'14px',padding:'12px 14px',borderRadius:'8px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)'}}><div style={{fontWeight:700,color:'#f87171',fontSize:'13px',marginBottom:'6px'}}>Unmatched athletes — fix these before importing:</div>{uniqueMissing.map((m,i)=><div key={`${m.first_name}-${m.last_name}-${i}`} style={{color:'#fecaca',fontSize:'13px',lineHeight:1.6}}>{m.first_name} {m.last_name}</div>)}</div>}{result.dryRun&&(result.missing??0)>0&&<div style={{marginTop:'10px',color:'#fbbf24',fontSize:'12px'}}>Confirm Import is disabled until all athlete names match.</div>}</div>}
  </div></div>
}
