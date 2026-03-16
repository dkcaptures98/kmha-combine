import Navbar from '@/components/Navbar'
import InactivityLogout from '@/components/InactivityLogout'
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#020b18' }}>
      <Navbar />
      <InactivityLogout />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        {children}
      </main>
    </div>
  )
}
