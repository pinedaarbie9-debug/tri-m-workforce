// Optional helper to insert demo data using the SERVICE ROLE key (bypasses RLS).
// Run locally only, never ship this key to the browser or commit it.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=xxxx VITE_SUPABASE_URL=https://xxx.supabase.co node scripts/seed.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

const AGENCY_ID = '00000000-0000-0000-0000-000000000001'
const SM_NORTH = '00000000-0000-0000-0000-000000000010'

async function main() {
  const { data: merch, error: merchErr } = await supabase
    .from('merchandisers')
    .insert({ agency_id: AGENCY_ID, full_name: 'Juan Dela Cruz', territory: 'North Metro Manila' })
    .select()
    .single()

  if (merchErr) throw merchErr

  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .insert({ principal_id: SM_NORTH, name: 'SM North EDSA', address: 'Quezon City' })
    .select()
    .single()

  if (storeErr) throw storeErr

  const { error: attErr } = await supabase.from('attendance_logs').insert({
    merchandiser_id: merch.id,
    store_id: store.id,
    check_in_time: new Date().toISOString(),
    status: 'on_time',
    biometric_verified: true
  })

  if (attErr) throw attErr

  console.log('Seed complete ✅')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
