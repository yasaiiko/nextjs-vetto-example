'use client';

import { useActionState } from 'react';
import { signup, type SignupState } from './actions';

const initial: SignupState = { status: 'idle' };

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initial);

  if (state.status === 'ok') {
    return (
      <p className="success" role="status">
        Account created for <strong>{state.email}</strong>.
      </p>
    );
  }

  return (
    // A plain form with an email input is all Vetto needs: the script finds
    // the field, checks it on blur and on submit, and shows its message below it.
    <form action={action} className="card" noValidate>
      <label htmlFor="email">Work email</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
      {state.status === 'error' && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
