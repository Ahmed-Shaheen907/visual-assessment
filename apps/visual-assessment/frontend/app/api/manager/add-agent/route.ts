import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Verify the caller is a manager
  const cookieStore = await cookies();
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user: managerUser } } = await supabaseServer.auth.getUser();
  if (!managerUser) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  // Check is_manager in va_profiles
  const { data: profile } = await supabaseServer
    .from('va_profiles')
    .select('is_manager')
    .eq('id', managerUser.id)
    .single();
  if (!profile?.is_manager) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  // Standalone client (no cookies) — won't affect manager session
  const standalone = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let agentUserId: string | null = null;
  let agentEmail = email.toLowerCase().trim();
  let agentName = name?.trim() || null;

  // Try signing in as the agent (works if they already have an account)
  const { data: signInData, error: signInError } = await standalone.auth.signInWithPassword({ email: agentEmail, password });
  if (signInData?.user) {
    agentUserId = signInData.user.id;
    agentName = agentName ?? signInData.user.user_metadata?.name ?? null;

    // Fetch profile while still signed in as agent — RLS allows self-read
    const { data: agentProfile } = await standalone
      .from('va_profiles')
      .select('name, is_manager')
      .eq('id', agentUserId)
      .single();

    await standalone.auth.signOut();

    if (!agentName) agentName = agentProfile?.name ?? null;

    if (agentProfile?.is_manager) {
      return NextResponse.json(
        { error: 'This account is a manager and cannot be added as an agent.' },
        { status: 400 }
      );
    }
  } else if (signInError?.message?.toLowerCase().includes('invalid login credentials')) {
    // User doesn't exist — create them (new accounts are never managers)
    const { data: signUpData, error: signUpError } = await standalone.auth.signUp({ email: agentEmail, password });
    if (signUpData?.user) {
      agentUserId = signUpData.user.id;
    } else {
      return NextResponse.json({ error: signUpError?.message ?? 'Could not create agent account.' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: signInError?.message ?? 'Unexpected error.' }, { status: 400 });
  }

  if (!agentUserId) {
    return NextResponse.json({ error: 'Could not resolve agent user ID.' }, { status: 500 });
  }

  // Upsert into va_manager_managed_agents
  const { error: upsertError } = await supabaseServer
    .from('va_manager_managed_agents')
    .upsert(
      { manager_user_id: managerUser.id, agent_user_id: agentUserId, agent_email: agentEmail, agent_name: agentName },
      { onConflict: 'manager_user_id,agent_user_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, agentUserId, agentEmail, agentName });
}
