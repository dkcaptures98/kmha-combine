type BrandMarkProps = { size?: number; compact?: boolean }

export default function BrandMark({ size = 64, compact = false }: BrandMarkProps) {
  return <div style={{ width:size, height:size, borderRadius:compact?12:18, background:'linear-gradient(145deg,#ffffff,#e2e8f0)', border:'1px solid rgba(148,163,184,0.45)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 12px 30px rgba(15,23,42,0.18)', overflow:'hidden' }}><div style={{ width:size*0.78, height:size*0.78, borderRadius:'50%', background:'linear-gradient(145deg,#0f172a,#1d4ed8)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'var(--font-display)', fontWeight:900, letterSpacing:compact?'.04em':'.06em', textAlign:'center', lineHeight:1, border:'2px solid #bfdbfe' }}><div><div style={{ fontSize:compact?size*0.19:size*0.18 }}>JR</div><div style={{ fontSize:compact?size*0.16:size*0.15 }}>RANGERS</div></div></div></div>
}
