import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Generate a random 8-char code
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST /api/couple — generate invite or accept invite
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, code } = body

  // ---------- GENERATE INVITE ----------
  if (action === 'generate') {
    // Check if already in couple
    const { data: couple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    if (couple) {
      return NextResponse.json({ error: 'Already in a couple' }, { status: 400 })
    }

    // Delete old invites from this user
    await supabase
      .from('couple_invites')
      .delete()
      .eq('inviter_id', user.id)
      .is('accepted_at', null)

    // Create new invite
    const newCode = generateCode()
    const { data: invite, error } = await supabase
      .from('couple_invites')
      .insert({ code: newCode, inviter_id: user.id })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: invite.code, expires_at: invite.expires_at })
  }

  // ---------- ACCEPT INVITE ----------
  if (action === 'accept' && code) {
    // Check if already in couple
    const { data: existingCouple } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    if (existingCouple) {
      return NextResponse.json({ error: 'Already in a couple' }, { status: 400 })
    }

    // Find invite
    const { data: invite, error: inviteError } = await supabase
      .from('couple_invites')
      .select('*')
      .eq('code', code.toUpperCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 404 })
    }

    if (invite.inviter_id === user.id) {
      return NextResponse.json({ error: 'Cannot accept your own invite' }, { status: 400 })
    }

    // Use service role to bypass RLS for creating couple
    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create couple
    const { data: couple, error: coupleError } = await adminClient
      .from('couples')
      .insert({
        user1_id: invite.inviter_id,
        user2_id: user.id,
      })
      .select()
      .single()

    if (coupleError) {
      return NextResponse.json({ error: coupleError.message }, { status: 500 })
    }

    // Mark invite as accepted
    await adminClient
      .from('couple_invites')
      .update({ accepted_by: user.id, accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ couple_id: couple.id })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// GET /api/couple — get current user's couple info
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: couple } = await supabase
    .from('couples')
    .select('id, user1_id, user2_id, created_at')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle()

  if (!couple) {
    return NextResponse.json({ coupled: false })
  }

  const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id

  const { data: partner } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, email')
    .eq('id', partnerId)
    .single()

  return NextResponse.json({
    coupled: true,
    couple_id: couple.id,
    partner,
    created_at: couple.created_at,
  })
}
