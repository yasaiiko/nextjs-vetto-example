'use server';

import { vettoDecision } from '@/lib/vetto';

export type SignupState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'ok'; email: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get('email') ?? '').trim();
  // Added by the Vetto script on submit: a signed verdict on Pro, empty on Free.
  const token = String(formData.get('vetto_token') ?? '') || null;

  if (!EMAIL_RE.test(email)) return { status: 'error', message: 'Please enter a valid email address.' };

  // The browser script already stopped most bad emails. This server check
  // catches bots that post straight to your endpoint and skip the browser.
  const decision = await vettoDecision(email, token);
  if (!decision.ok) return { status: 'error', message: decision.message };

  // Create the user here: your database, Better Auth, Supabase, Clerk...
  return { status: 'ok', email };
}
