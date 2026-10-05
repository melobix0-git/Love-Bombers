# Love Bomber 💖

Love Bomber lets anyone create a personalized date invitation and share it with someone special. Recipients can accept, choose a date and time, notify the sender, and add the plans to Google Calendar.

## Local development

```bash
npm install
npm run dev
```

The Vite dev server includes a local, in-memory invitation API, so creation and responses can be tested without credentials. Data in local memory is lost when the dev server restarts. Production still requires durable storage.

## Environment variables

Copy `.env.example` to `.env` and fill in server-side values:

- `IMGBB_API_KEY` — optional server-side image upload key. It must never use the `VITE_` prefix.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — durable invitation storage in production.
- `INVITATION_TTL_DAYS` — invitation retention period, defaulting to 30 days.
- `ALLOW_EPHEMERAL_STORAGE=true` — local-only in-memory storage for development. Do not use this in production.

Never commit `.env` or credentials.

## Production checklist

- Configure Upstash Redis before deploying.
- Configure the server-side ImgBB key only if photo uploads are enabled.
- Verify `POST /api/invitations` and `GET /api/invitations?id=...` through the deployed domain.
- Test social previews with WhatsApp, Telegram, and Facebook crawler tools.
- Keep uploaded photos and invitation records subject to a clear retention policy.
