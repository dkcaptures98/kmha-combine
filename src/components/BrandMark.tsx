type BrandMarkProps = { size?: number; compact?: boolean }

export default function BrandMark({ size = 64, compact = false }: BrandMarkProps) {
  return <div style={{ width:size, height:size, borderRadius:compact?10:14, background:'white', border:'1px solid rgba(148,163,184,0.35)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 12px 30px rgba(15,23,42,0.18)', overflow:'hidden', padding:compact?4:6 }}><img src="/logo.jpg" alt="Kitchener Jr Rangers" style={{ width:'100%', height:'100%', objectFit:'contain', display:'block' }} /></div>
}
