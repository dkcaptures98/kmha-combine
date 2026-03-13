import Navbar from '@/components/Navbar'

export default function AthletesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
