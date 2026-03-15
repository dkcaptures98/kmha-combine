import Navbar from '@/components/Navbar'
export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#020b18' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        {children}
      </main>
    </div>
  )
}
