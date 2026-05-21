import { supabase } from './supabase';

export interface Session {
  id: string;
  name: string;
  email: string;
  started_at: string;
  completed_at: string | null;
  user_id: string | null;
}

export interface Answer {
  id: string;
  session_id: string;
  phase: string;
  question_id: string;
  answer_given: string | null;
  correct: boolean | null;
  created_at: string;
}

export interface AnswerInput {
  phase: string;
  question_id: string;
  answer_given: string | null;
  correct: boolean;
}

export interface Profile {
  id: string;
  name: string;
  is_manager: boolean;
}

export async function createProfile(userId: string, name: string, isManager = false): Promise<void> {
  const { error } = await supabase.from('va_profiles').insert({ id: userId, name, is_manager: isManager });
  if (error) throw error;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('va_profiles')
    .select('id, name, is_manager')
    .eq('id', userId)
    .single();
  return data ?? null;
}

export async function createSession(name: string, email: string, userId?: string): Promise<string> {
  const { data, error } = await supabase
    .from('va_sessions')
    .insert({ name, email, user_id: userId ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function getAgentSessions(userId: string): Promise<{ session: Session; answers: Answer[] }[]> {
  const { data: sessions, error: se } = await supabase
    .from('va_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (se) throw se;
  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id);
  const { data: answers, error: ae } = await supabase
    .from('va_answers')
    .select('*')
    .in('session_id', ids);
  if (ae) throw ae;

  return sessions.map((session) => ({
    session,
    answers: (answers ?? []).filter((a) => a.session_id === session.id),
  }));
}

export async function markSessionComplete(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('va_sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function saveAnswers(sessionId: string, answers: AnswerInput[]): Promise<void> {
  if (!answers.length) return;
  const rows = answers.map((a) => ({ ...a, session_id: sessionId }));
  const { error } = await supabase.from('va_answers').insert(rows);
  if (error) throw error;
}

export async function getSessionResults(sessionId: string): Promise<{ session: Session; answers: Answer[] }> {
  const [{ data: session, error: se }, { data: answers, error: ae }] = await Promise.all([
    supabase.from('va_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('va_answers').select('*').eq('session_id', sessionId).order('created_at'),
  ]);
  if (se) throw se;
  if (ae) throw ae;
  return { session, answers: answers ?? [] };
}

export interface ManagedAgent {
  id: string;
  agent_user_id: string;
  agent_email: string;
  agent_name: string | null;
  created_at: string;
}

export async function getManagerManagedAgents(managerUserId: string): Promise<ManagedAgent[]> {
  const { data, error } = await supabase
    .from('va_manager_managed_agents')
    .select('id, agent_user_id, agent_email, agent_name, created_at')
    .eq('manager_user_id', managerUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSessionsForAgents(agentUserIds: string[]): Promise<{ session: Session; answers: Answer[] }[]> {
  if (!agentUserIds.length) return [];
  const { data: sessions, error: se } = await supabase
    .from('va_sessions')
    .select('*')
    .in('user_id', agentUserIds)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (se) throw se;
  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id);
  const { data: answers, error: ae } = await supabase
    .from('va_answers')
    .select('*')
    .in('session_id', ids);
  if (ae) throw ae;

  return sessions.map((session) => ({
    session,
    answers: (answers ?? []).filter((a) => a.session_id === session.id),
  }));
}

export async function removeManagerManagedAgent(id: string): Promise<void> {
  const { error } = await supabase
    .from('va_manager_managed_agents')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getAdminManagedAgents(adminUserId: string): Promise<ManagedAgent[]> {
  const { data, error } = await supabase
    .from('va_admin_managed_agents')
    .select('id, agent_user_id, agent_email, agent_name, created_at')
    .eq('admin_user_id', adminUserId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAllSessions(): Promise<{ session: Session; answers: Answer[] }[]> {
  const { data: sessions, error: se } = await supabase
    .from('va_sessions')
    .select('*')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (se) throw se;
  if (!sessions?.length) return [];

  const ids = sessions.map((s) => s.id);
  const { data: answers, error: ae } = await supabase
    .from('va_answers')
    .select('*')
    .in('session_id', ids);
  if (ae) throw ae;

  return sessions.map((session) => ({
    session,
    answers: (answers ?? []).filter((a) => a.session_id === session.id),
  }));
}
