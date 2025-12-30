import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SESSION_EXPIRY_DAYS } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE_NAME = 'floor-visualizer-session';

/**
 * Get or create an anonymous session
 * Returns the session token and session ID
 */
export async function getOrCreateSession() {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  // If we have an existing token, try to validate it
  if (existingToken) {
    const supabase = await createClient();
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_token', existingToken)
      .single();

    // Check if session exists and is not expired
    if (session) {
      const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
      const now = new Date();

      if (!expiresAt || expiresAt > now) {
        return {
          sessionId: session.id,
          sessionToken: session.session_token,
        };
      }
    }
  }

  // Create a new session
  const newToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const supabase = await createClient();
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({
      session_token: newToken,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !newSession) {
    throw new Error('Failed to create session');
  }

  // Set the session cookie
  cookieStore.set(SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return {
    sessionId: newSession.id,
    sessionToken: newSession.session_token,
  };
}

/**
 * Get the current session (without creating a new one)
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_token', token)
    .single();

  if (!session) {
    return null;
  }

  // Check if expired
  const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
  const now = new Date();

  if (expiresAt && expiresAt < now) {
    return null;
  }

  return {
    sessionId: session.id,
    sessionToken: session.session_token,
  };
}

/**
 * Clear the current session
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
