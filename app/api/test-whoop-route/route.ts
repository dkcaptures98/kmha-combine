import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ ok: true, message: "deployed test route works", time: new Date().toISOString() })
}
