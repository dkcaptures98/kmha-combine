import Navbar from '@/components/Navbar'
import TestingSessionGuide from '@/components/TestingSessionGuide'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#020b18' }}>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ paddingTop: '24px' }}>
          <TestingSessionGuide embedded />
        </div>
        {children}
      </main>
    </div>
  )
}
