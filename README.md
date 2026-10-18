# Next.js + Vetto: block fake signups

A Next.js (App Router) signup form that rejects disposable inboxes, dead domains and bot signups. It also fixes email typos, in two layers:

1. **Browser**: one `<script>` tag ([Vetto](https://usevetto.com)) checks the email field on blur and on submit. It shows "Did you mean jane@gmail.com?" for typos, blocks throwaway and dead domains, and adds a hidden honeypot for bots.
2. **Server**: the Server Action checks the email again, so bots that post straight to your endpoint can't skip the browser check.

Everything fails open: if Vetto is slow or down, signups go through.

| Address | Result |
|---|---|
| `jane@mailinator.com` | Blocked: temporary inbox |
| `jane@gmial.com` | Browser: "Did you mean jane@gmail.com?" with a one-click fix. Server: rejected |
| `jane@doesnotexist-xyz-123.com` | Blocked: domain cannot receive mail |
| `jane@privaterelay.appleid.com` | Allowed: Apple Hide My Email is a real inbox |

## Run it

```bash
git clone https://github.com/yasaiiko/nextjs-vetto-example
cd nextjs-vetto-example
npm install
cp .env.example .env.local
npm run dev
```

It works with no keys at all: the server check runs on the free, keyless [`/v1/audit`](https://usevetto.com/docs#domain-lookup) lookup. For the browser check, create a free account at [usevetto.com](https://usevetto.com) (1 site, 1,000 emails a month, no card). Add your production domain and paste the `pk_...` key into `NEXT_PUBLIC_VETTO_SITE_KEY` (the key also works on `localhost`).

## How it works

**`app/layout.tsx`**: the script tag. It finds email fields by itself, so the form needs no changes.

```tsx
<Script src="https://usevetto.com/v.js" data-site={process.env.NEXT_PUBLIC_VETTO_SITE_KEY} strategy="afterInteractive" />
```

The script listens for `submit` in the capture phase and re-submits with `requestSubmit()`, so it works with React forms and Server Actions (`<form action={...}>`).

**`app/actions.ts`**: the Server Action reads `email` and `vetto_token`. The script adds `vetto_token` as a hidden field on submit. The action then calls `vettoDecision()`.

**`lib/vetto.ts`**: the server check, in two modes:

| | Free (no secret key) | Pro (`VETTO_SECRET_KEY`) |
|---|---|---|
| Server check | `POST /v1/audit` with the domain: throwaway or dead → reject | Verify the signed `vetto_token` offline (HMAC, 15-min TTL, bound to the email) |
| No/invalid token (bot skipped the browser) | Same domain lookup | `POST /v1/check` with your secret key |
| Extra signals | — | Gmail alias farming (`j.a.n.e+1@gmail.com`), VPN/data-center signups, burst limits, your own deny list |
| Limits | 300 lookups/day per server IP | 20,000 checks/month per site |

## Using another auth library?

Keep the same split: the script tag in your layout and `vettoDecision(email, token)` before you create the user.

- **Better Auth**: [`better-auth-vetto`](https://github.com/yasaiiko/better-auth-vetto) does the server check offline with a CC0 list, with no API calls.
- **Auth.js / NextAuth**: call it in the `signIn` callback ([guide](https://usevetto.com/block-disposable-emails-nextauth)).
- **Supabase**: use a `before-user-created` hook ([guide](https://usevetto.com/block-disposable-emails-supabase)).

API reference: [usevetto.com/docs](https://usevetto.com/docs) · OpenAPI: [usevetto.com/openapi.json](https://usevetto.com/openapi.json)

## License

MIT. Disclosure: maintained by the people who build Vetto.
