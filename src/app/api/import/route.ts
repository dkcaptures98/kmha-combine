import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  const { athletes, entries } = body

  const results = { athletes: 0, entries: 0, errors: [] as string[] }

  if (athletes?.length) {
    const { data, error } = await supabase.from('athletes').upsert(athletes, { onConflict: 'id' }).select()
    if (error) results.errors.push(`Athletes: ${error.message}`)
    else results.athletes = data?.length ?? 0
  }

  if (entries?.length) {
    // Batch in chunks of 500
    const chunkSize = 500
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize)
      const { data, error } = await supabase.from('combine_entries').upsert(chunk, { onConflict: 'id' }).select()
      if (error) results.errors.push(`Entries batch ${i}: ${error.message}`)
      else results.entries += data?.length ?? 0
    }
  }

  return NextResponse.json(results)
}
