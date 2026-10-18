import { SignupForm } from './signup-form';

const TRY = ['jane@mailinator.com', 'jane@gmial.com', 'jane@doesnotexist-xyz-123.com', 'jane@privaterelay.appleid.com'];

export default function Home() {
  return (
    <main>
      <h1>Sign up</h1>
      <p className="lead">Next.js signup form protected by Vetto: one script tag in the browser, one check in the Server Action.</p>
      <SignupForm />
      <section className="hint">
        <p>Try these addresses:</p>
        <ul>
          {TRY.map((e) => (
            <li key={e}>
              <code>{e}</code>
            </li>
          ))}
        </ul>
        <p>
          Throwaway and dead domains are rejected, the typo gets a &ldquo;did you mean&rdquo; fix, and the Apple relay address is let through.
        </p>
      </section>
    </main>
  );
}
