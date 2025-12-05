import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userMessage = body.message as string

    const supabase = createServerSupabaseClient()

    // TEMP: fake user id just for dev
    const fakeUserId = '00000000-0000-0000-0000-000000000001'

    // 1. Try to load signup_state for this user
    const { data: existingState, error: selectError } = await supabase
      .from('signup_states')
      .select('*')
      .eq('user_id', fakeUserId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "No rows found"
      console.error('Error selecting signup_state:', selectError)

      return new Response(
        JSON.stringify({
          error: 'Error selecting signup state',
          details: selectError.message ?? selectError,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    let signupState = existingState
    // 2. If none exists, create initial state
    if (!signupState) {
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
        console.error('Error creating signup state:', insertError)

        return new Response(
          JSON.stringify({
            error: 'Error creating signup state',
            details: insertError.message ?? insertError,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      signupState = newState
    }

    // 3. Decide what to do based on current_phase
    let reply: string

    if (signupState.current_phase === 'welcome') {
      // Treat the userMessage as their name
      const name = userMessage.trim()

      const newUserProfile = {
        ...(signupState.user_profile || {}),
        name,
      }

      // Update row: set name + advance phase
      const { data: updatedState, error: updateError } = await supabase
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
        console.error('Error updating signup state:', updateError)

        return new Response(
          JSON.stringify({
            error: 'Error updating signup state',
            details: updateError.message ?? updateError,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      reply = `Nice to meet you, ${name}! Are you a student, working, or something else?`

      return new Response(
        JSON.stringify({
          reply,
          signupState: updatedState,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      // For now, other phases just echo
      reply = `Got your message: "${userMessage}". Current phase: ${signupState.current_phase}`

      return new Response(
        JSON.stringify({
          reply,
          signupState,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error handling signup:', error)

    return new Response(
      JSON.stringify({
        error: 'Unexpected error processing signup',
        details:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
