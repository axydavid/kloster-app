import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create a client to get the user from the request's auth header
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not found or auth error:', userError);
      return new Response(JSON.stringify({ error: 'Authentication error: Could not get user.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id;

    // 1. Remove user from all future dinner_days as a cook
    const { error: dinnerCookError } = await supabaseAdmin.rpc('remove_user_from_all_future_cooks', { p_user_id: userId });
    if (dinnerCookError) throw new Error(`Failed to remove user from dinner cooks: ${dinnerCookError.message}`);

    // 2. Remove user from all future dinner_days as an attendant
    const { error: dinnerAttendantError } = await supabaseAdmin.rpc('remove_user_from_all_future_dinners', { p_user_id: userId });
    if (dinnerAttendantError) throw new Error(`Failed to remove user from dinner attendants: ${dinnerAttendantError.message}`);

    // 3. Delete the user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw new Error(`Failed to delete user: ${deleteUserError.message}`);

    return new Response(JSON.stringify({ message: 'Account deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error deleting account:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
