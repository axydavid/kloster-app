import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const findUserByEmail = async (supabaseAdmin: any, email: string) => {
  const normalized = email.trim().toLowerCase()
  const { data: userId } = await supabaseAdmin.rpc('get_user_id_by_email', { user_email: email })
  if (userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (error) throw error
    return data.user
  }

  let page = 1
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user: { email?: string }) => user.email?.toLowerCase() === normalized)
    if (found) return found
    if (data.users.length < 200) return null
    page += 1
  }
}

const callerIsAdmin = async (supabaseAdmin: any, callingUserId: string) => {
  const { data: allUsers } = await supabaseAdmin.rpc('get_all_users')
  const listed = Array.isArray(allUsers) ? allUsers.find((user: any) => user.id === callingUserId) : null
  if (listed?.type === 'admin' || listed?.raw_user_meta_data?.type === 'admin') {
    return true
  }

  const { data } = await supabaseAdmin.auth.admin.getUserById(callingUserId)
  return data.user?.user_metadata?.type === 'admin'
}

const removeUserFromFutureDinners = async (supabaseAdmin: any, userId: string, displayName: string, iconColor?: string) => {
  const today = new Date().toISOString().split('T')[0]
  const { data: dinnerDays, error: dinnerDaysError } = await supabaseAdmin
    .from('dinner_days')
    .select('date, cooks, attendants')
  if (dinnerDaysError) throw new Error(`Failed to load dinner days: ${dinnerDaysError.message}`)

  for (const day of dinnerDays || []) {
    const cooks = Array.isArray(day.cooks) ? [...day.cooks] : []
    const attendants = Array.isArray(day.attendants) ? [...day.attendants] : []
    const isCook = cooks.includes(userId)
    const attendantIndex = attendants.findIndex((attendant: { id: string }) => attendant.id === userId)

    if (!isCook && attendantIndex === -1) {
      continue
    }

    let nextCooks = cooks
    let nextAttendants = attendants

    if (day.date >= today) {
      nextCooks = cooks.filter((id: string) => id !== userId)
      nextAttendants = attendants.filter((attendant: { id: string }) => attendant.id !== userId)
    } else if (attendantIndex !== -1) {
      nextAttendants[attendantIndex] = {
        ...nextAttendants[attendantIndex],
        displayName,
        iconColor,
      }
    } else if (isCook) {
      nextAttendants.push({
        id: userId,
        portions: 0,
        isTakeAway: false,
        isAutomaticallySet: false,
        isNameSnapshot: true,
        displayName,
        iconColor,
      })
    }

    const { error: updateDinnerError } = await supabaseAdmin
      .from('dinner_days')
      .update({ cooks: nextCooks, attendants: nextAttendants })
      .eq('date', day.date)
    if (updateDinnerError) throw new Error(`Failed to update dinner day ${day.date}: ${updateDinnerError.message}`)
  }

  const { data: adminSettings, error: adminSettingsError } = await supabaseAdmin
    .from('admin_settings')
    .select('id, dinner')
    .eq('id', 1)
    .maybeSingle()
  if (adminSettingsError) throw new Error(`Failed to load admin settings: ${adminSettingsError.message}`)

  if (adminSettings) {
    const currentDinner = Array.isArray(adminSettings.dinner) ? adminSettings.dinner : []
    const { error: updateAdminError } = await supabaseAdmin
      .from('admin_settings')
      .update({ dinner: currentDinner.filter((id: string) => id !== userId) })
      .eq('id', adminSettings.id)
    if (updateAdminError) throw new Error(`Failed to update dinner membership: ${updateAdminError.message}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user: callingUser }, error: userError } = await supabase.auth.getUser()

    if (userError || !callingUser) {
      console.error('User not found or auth error:', userError)
      return json({ error: 'Authentication error: Could not get user.' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action || 'delete'

    if (action === 'restore') {
      if (!(await callerIsAdmin(supabaseAdmin, callingUser.id))) {
        return json({ error: 'Forbidden: Not authorized to restore users.' }, 403)
      }

      const email = String(body.email || '').trim()
      const password = String(body.password || '')
      const displayName = String(body.displayName || '').trim()
      const type = body.type === 'admin' ? 'admin' : 'user'

      if (!email || !password || !displayName) {
        return json({ error: 'Email, password, and name are required.' }, 400)
      }
      if (password.length < 6) {
        return json({ error: 'Password should be at least 6 characters long.' }, 400)
      }

      const existingUser = await findUserByEmail(supabaseAdmin, email)
      if (!existingUser) {
        return json({ restored: false, error: 'User not found' }, 404)
      }
      if (!existingUser.user_metadata?.deleted) {
        return json({ error: 'A user with this email already exists.' }, 409)
      }

      const { error: restoreError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        ban_duration: 'none',
        password,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: displayName,
          type,
          deleted: false,
          deleted_at: null,
          joinDinners: false,
        },
      })
      if (restoreError) throw new Error(`Failed to restore user: ${restoreError.message}`)

      return json({
        restored: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          type,
          raw_user_meta_data: {
            ...existingUser.user_metadata,
            display_name: displayName,
            type,
            deleted: false,
            deleted_at: null,
            joinDinners: false,
          },
        },
      })
    }

    let userId: string
    if (body.userIdToDelete) {
      if (!(await callerIsAdmin(supabaseAdmin, callingUser.id))) {
        return json({ error: 'Forbidden: Not authorized to delete other users.' }, 403)
      }
      userId = body.userIdToDelete
    } else {
      userId = callingUser.id
    }

    const { data: userRecord, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userLookupError) throw new Error(`Failed to load user before delete: ${userLookupError.message}`)

    const displayName =
      userRecord.user.user_metadata?.display_name ||
      userRecord.user.email?.split('@')[0] ||
      'Former member'
    const iconColor = userRecord.user.user_metadata?.iconColor || userRecord.user.user_metadata?.icon_color

    await removeUserFromFutureDinners(supabaseAdmin, userId, displayName, iconColor)

    const { error: softDeleteError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '876000h',
      user_metadata: {
        ...userRecord.user.user_metadata,
        deleted: true,
        deleted_at: new Date().toISOString(),
        joinDinners: false,
      },
    })
    if (softDeleteError) throw new Error(`Failed to deactivate user: ${softDeleteError.message}`)

    return json({ message: 'Account deleted successfully' })
  } catch (err) {
    console.error('Error managing account:', err)
    return json({ error: 'Internal server error', details: err.message }, 500)
  }
})
