import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json()
  const userMessage = body.message as string

  const supabase = createServerSupabaseClient()

  // TEMP: fake user id for now
  const fakeUserId = '00000000-0000-0000-0000-000000000001'

  // 1. Try to load signup_state for this user
  const { data: existingState, error } = await supabase
    .from('signup_states')
    .select('*')
    .eq('user_id', fakeUserId)
    .single()

  let signupState = existingState

  if (!signupState) {
    // 2. If none exists, create initial state
    const { data: newState, error: insertError } = await supabase
      .from('signup_states')
      .insert({
        user_id: fakeUserId,
        current_phase: 'welcome',
        user_profile: {},
        founder_profile: {},
        idea_profile: {},
        constraints: {},
        preferences: {},
        scores: {},
      })
      .select('*')
      .single()

    if (insertError) {
      console.error(insertError)
      return new Response('Error creating signup state', { status: 500 })
    }

    signupState = newState
  }

  // 3. VERY SIMPLE logic:
  //    If current_phase is welcome, store name and move to userProfile
  //    Otherwise just echo for now

  let reply = ''

  if (signupState.current_phase === 'welcome') {
    // userMessage will be treated as their name
    const newUserProfile = {
      ...(signupState.user_profile || {}),
      name: userMessage,
    }

    const { data: updated, error: updateError } = await supabase
      .from('signup_states')
      .update({
        user_profile: newUserProfile,
        current_phase: 'userProfile',
        updated_at: new Date().toISOString(),
      })
      .eq('id', signupState.id)
      .select('*')
      .single()

    if (updateError) {
      console.error(updateError)
      return new Response('Error updating signup state', { status: 500 })
    }

    reply = `Nice to meet you, ${userMessage}! Are you a student, working, or something else?`

    return new Response(
      JSON.stringify({
        reply,
        signupState: updated,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } else {
    // Later you'll add more logic or the LLM here.
    reply = `Got it: "${userMessage}". (Signup phase: ${signupState.current_phase})`

    return new Response(
      JSON.stringify({
        reply,
        signupState,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
