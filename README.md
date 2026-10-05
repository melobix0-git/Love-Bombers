# Love Bomber 💖

Love Bomber lets anyone create a personalized date invitation and share it with someone special. Recipients can accept, choose a date and time, notify the sender, and add the plans to Google Calendar.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server includes a local, in-memory invitation API, so creation and responses can be tested without credentials. Data in local memory is lost when the dev server restarts. Production still requires durable storage.

## Available scripts

```bash
npm run dev       # Vite app plus local invitation API
npm run build     # Production build
npm run lint      # ESLint
npm test          # API contract tests
npm run preview   # Preview the built frontend
```

## Environment variables

Copy `.env.example` to `.env` and fill in server-side values:

- `APP_URL` — public app URL used in automatic response emails.
- `IMGBB_API_KEY` — optional server-side image upload key. It must never use the `VITE_` prefix.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — optional automatic response email delivery.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — durable invitation storage in production.
- `INVITATION_TTL_DAYS` — invitation retention period, defaulting to 30 days.
- `ALLOW_EPHEMERAL_STORAGE=true` — local-only in-memory storage for development. Do not use this in production.

Never commit `.env` or credentials.

## Product features

- English and Nigerian Pidgin copy
- Romantic, playful, and simple tones
- Classic, Midnight Glow, and Sunset Warmth templates
- Live invitation preview and print/save preview
- Recipient-selected dates or sender-suggested date options
- Private creator status links with editing and resend support
- WhatsApp, native share, email handoff, QR codes, and Google Calendar
- Original browser-generated celebration chime instead of bundled copyrighted music
- Optional Resend email notifications
- Local browser history with a clear-history control

## Production setup checklist

1. Create the Vercel project and deploy the `arena/01a109f8-love-bombers` branch.
2. Create an Upstash Redis database and add its REST URL and token to Vercel environment variables.
3. Set `INVITATION_TTL_DAYS`, normally to `30`.
4. Set `APP_URL` to the final HTTPS domain.
5. If enabling photo file uploads, create an ImgBB key and save it only as the server-side `IMGBB_API_KEY` variable.
6. If enabling automatic email, create a Resend project, verify a sending domain, and add `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
7. Leave `ALLOW_EPHEMERAL_STORAGE` unset or false in production.
8. Enable Vercel Web Analytics if you want the custom funnel events collected.
9. Test invitation creation, public links, private status links, edit links, expiry, email, WhatsApp, social previews, and Google Calendar on the deployed domain.
10. Revoke the old ImgBB credential that was previously committed to repository history.

WhatsApp currently uses click-to-chat links. Fully automatic WhatsApp notifications require a Meta WhatsApp Cloud API or Twilio account, approved message templates, and webhook handling; those are not required for the current flow.

Keep uploaded photos and invitation records subject to a clear retention policy.
