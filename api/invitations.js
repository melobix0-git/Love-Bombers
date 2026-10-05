import { createHash, randomBytes } from 'node:crypto';
import {
  getInvitation,
  getInvitationTtlSeconds,
  saveInvitation,
  StorageNotConfiguredError,
} from './_storage.js';
import { enforceRateLimit, RateLimitError } from './_rate_limit.js';

const MAX_IMAGE_DATA_LENGTH = 3_500_000;
const DEFAULT_COLOR = '#800020';
const DEFAULT_LOCALE = 'en';
const DEFAULT_TONE = 'romantic';
const DEFAULT_SOUND = 'romantic_chime';
const DEFAULT_TEMPLATE = 'classic';

class ApiError extends Error {
  constructor(status, message, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function text(value, fallback = '', maxLength = 120) {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function email(value) {
  const candidate = text(value, '', 160);
  if (!candidate) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : '';
}

function phone(value) {
  const candidate = text(value, '', 30);
  if (!candidate) return '';
  return /^[+\d][\d\s().-]{6,28}$/.test(candidate) ? candidate : '';
}

function color(value) {
  const candidate = text(value, DEFAULT_COLOR, 7);
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : DEFAULT_COLOR;
}

function safeImageUrl(value) {
  const candidate = text(value, '', 500);
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function safeDate(value) {
  const candidate = text(value, '', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return '';
  const [year, month, day] = candidate.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) return '';
  return candidate;
}

function safeTime(value) {
  const candidate = text(value, '', 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : '';
}

function normalizeDateOptions(value) {
  if (!Array.isArray(value)) return [];
  const options = [];
  value.slice(0, 3).forEach((item) => {
    const date = safeDate(item?.date);
    const time = safeTime(item?.time);
    if (date && time && !options.some((option) => option.date === date && option.time === time)) {
      options.push({ date, time });
    }
  });
  return options;
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
}

function newInvitationId() {
  return randomBytes(9).toString('base64url');
}

function newManageToken() {
  return randomBytes(24).toString('base64url');
}

function hashToken(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isBot(req) {
  return /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Discordbot/i.test(
    req.headers?.['user-agent'] || '',
  );
}

function getBaseUrl(req) {
  const protocol = req.headers?.['x-forwarded-proto'] || 'https';
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  return `${protocol}://${host || 'localhost'}`;
}

function getParam(req, name) {
  if (req.query?.[name]) return text(req.query[name], '', 160);
  try {
    return text(new URL(req.url, 'https://love-bomber.local').searchParams.get(name), '', 160);
  } catch {
    return '';
  }
}

function getId(req) {
  return getParam(req, 'id');
}

function getAccessToken(req) {
  return getParam(req, 'token');
}

function isStatusRequest(req) {
  return getParam(req, 'mode') === 'status' || Boolean(getAccessToken(req));
}

function hasValidManageToken(invitation, token) {
  return Boolean(token && invitation?.manageTokenHash && hashToken(token) === invitation.manageTokenHash);
}

function isExpired(invitation) {
  return invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[character]));
}

async function uploadImageToImgBB(imageData) {
  if (!imageData) return '';
  if (typeof imageData !== 'string' || imageData.length > MAX_IMAGE_DATA_LENGTH) {
    throw new ApiError(413, 'That image is too large. Please choose a smaller image.', 'IMAGE_TOO_LARGE');
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    throw new ApiError(503, 'Image uploads are not configured yet.', 'IMAGE_STORAGE_NOT_CONFIGURED');
  }

  const base64 = imageData.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!/^[a-z0-9+/=\s]+$/i.test(base64)) {
    throw new ApiError(422, 'The selected image could not be processed.', 'INVALID_IMAGE');
  }

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    body: new URLSearchParams({ image: base64 }),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success || !result.data?.url) {
    throw new ApiError(502, 'The image upload failed. Please try again.', 'IMAGE_UPLOAD_FAILED');
  }
  return safeImageUrl(result.data.url);
}

async function sendResponseEmail(invitation) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !invitation.senderEmail) return;

  const hasDate = invitation.selectedDate && invitation.selectedTime;
  const subject = invitation.status === 'declined'
    ? `${invitation.crushName} responded to your invitation`
    : `${invitation.crushName} accepted your invitation 💖`;
  const message = invitation.status === 'declined'
    ? `${invitation.crushName} has declined the invitation. No hard feelings.`
    : hasDate
      ? `${invitation.crushName} accepted! Your date is ${invitation.selectedDate} at ${invitation.selectedTime}.`
      : `${invitation.crushName} accepted! They are choosing a date and time now.`;
  const appUrl = process.env.APP_URL?.replace(/\/$/, '');
  const invitationUrl = appUrl ? `${appUrl}/?id=${encodeURIComponent(invitation.id)}` : '';
  const html = `<p>${escapeHtml(message)}</p>${invitationUrl ? `<p><a href="${escapeHtml(invitationUrl)}">Open the invitation</a></p>` : '<p>Open your saved status link to see the latest details.</p>'}`;
  const from = process.env.RESEND_FROM_EMAIL || 'Love Bomber <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [invitation.senderEmail],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const result = await response.text().catch(() => '');
    console.error('Response email failed:', result);
  }
}

function publicInvitation(invitation) {
  const safeInvitation = { ...invitation };
  delete safeInvitation.imageData;
  delete safeInvitation.manageTokenHash;
  return safeInvitation;
}

function renderBotHtml(invitation, url) {
  const baseUrl = new URL(url).origin;
  const imageUrl = invitation?.img || `${baseUrl}/og-cover.png`;
  const recipient = invitation?.crushName || 'Someone special';
  const sender = invitation?.myName || 'Someone special';
  const title = `${recipient}, you have a date invitation 💖`;
  const description = `${sender} created a personalized invitation just for you.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Love Bomber">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1672">
  <meta property="og:image:height" content="941">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
</head>
<body></body>
</html>`;
}

async function createInvitation(body) {
  const senderName = text(body.senderName, 'Someone special', 80);
  const crushName = text(body.crushName, 'Someone special', 80);
  const senderPhone = phone(body.senderPhone);
  const senderEmail = email(body.senderEmail);
  const customMessage = text(body.customMessage, '', 500);
  const dateMode = body.dateMode === 'suggestions' ? 'suggestions' : 'recipient';
  const dateOptions = normalizeDateOptions(body.dateOptions);
  if (dateMode === 'suggestions' && dateOptions.length === 0) {
    throw new ApiError(422, 'Add at least one date option or let the recipient choose.', 'DATE_OPTIONS_REQUIRED');
  }
  const imageUrl = body.imageData
    ? await uploadImageToImgBB(body.imageData)
    : safeImageUrl(body.imageUrl);
  const now = new Date();
  const manageToken = newManageToken();
  const invitation = {
    id: newInvitationId(),
    myName: senderName,
    crushName,
    senderPhone,
    senderEmail,
    meal: text(body.meal, 'A meal together', 100),
    place: text(body.place, 'Somewhere special', 160),
    sound: ['none', DEFAULT_SOUND].includes(body.sound) ? body.sound : DEFAULT_SOUND,
    template: ['classic', 'midnight', 'sunset'].includes(body.template) ? body.template : DEFAULT_TEMPLATE,
    img: imageUrl,
    color: color(body.themeColor),
    locale: ['en', 'pidgin'].includes(body.locale) ? body.locale : DEFAULT_LOCALE,
    tone: ['romantic', 'playful', 'simple'].includes(body.tone) ? body.tone : DEFAULT_TONE,
    customMessage,
    playfulNo: body.playfulNo === true,
    dateMode,
    dateOptions,
    status: 'pending',
    selectedDate: '',
    selectedTime: '',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + getInvitationTtlSeconds() * 1000).toISOString(),
    manageTokenHash: hashToken(manageToken),
  };

  await saveInvitation(invitation.id, invitation);
  return { invitation, manageToken };
}

async function updateInvitation(body) {
  const id = text(body.id, '', 80);
  const token = text(body.token, '', 160);
  if (!id || !token) throw new ApiError(400, 'A private status token is required.');

  const invitation = await getInvitation(id);
  if (!invitation || !hasValidManageToken(invitation, token)) {
    throw new ApiError(403, 'That edit link is not valid.', 'EDIT_ACCESS_DENIED');
  }
  if (isExpired(invitation)) throw new ApiError(410, 'This invitation has expired.', 'INVITATION_EXPIRED');

  const dateMode = body.dateMode === 'suggestions' ? 'suggestions' : 'recipient';
  const dateOptions = normalizeDateOptions(body.dateOptions);
  if (dateMode === 'suggestions' && dateOptions.length === 0) {
    throw new ApiError(422, 'Add at least one date option or let the recipient choose.', 'DATE_OPTIONS_REQUIRED');
  }

  const imageUrl = body.imageData
    ? await uploadImageToImgBB(body.imageData)
    : safeImageUrl(body.imageUrl);
  const updated = {
    ...invitation,
    myName: text(body.senderName, invitation.myName, 80),
    crushName: text(body.crushName, invitation.crushName, 80),
    senderPhone: phone(body.senderPhone),
    senderEmail: email(body.senderEmail),
    meal: text(body.meal, invitation.meal, 100),
    place: text(body.place, invitation.place, 160),
    sound: ['none', DEFAULT_SOUND].includes(body.sound) ? body.sound : DEFAULT_SOUND,
    template: ['classic', 'midnight', 'sunset'].includes(body.template) ? body.template : DEFAULT_TEMPLATE,
    img: imageUrl,
    color: color(body.themeColor),
    locale: ['en', 'pidgin'].includes(body.locale) ? body.locale : DEFAULT_LOCALE,
    tone: ['romantic', 'playful', 'simple'].includes(body.tone) ? body.tone : DEFAULT_TONE,
    customMessage: text(body.customMessage, '', 500),
    playfulNo: body.playfulNo === true,
    dateMode,
    dateOptions,
    updatedAt: new Date().toISOString(),
  };

  await saveInvitation(id, updated);
  return updated;
}

async function respondToInvitation(body) {
  const id = text(body.id, '', 80);
  if (!id) throw new ApiError(400, 'Invitation ID is required.');

  const invitation = await getInvitation(id);
  if (!invitation) throw new ApiError(404, 'This invitation could not be found.', 'INVITATION_NOT_FOUND');
  if (isExpired(invitation)) throw new ApiError(410, 'This invitation has expired.', 'INVITATION_EXPIRED');

  const status = body.status === 'declined' ? 'declined' : 'accepted';
  const rawDate = text(body.date, '', 10);
  const rawTime = text(body.time, '', 5);
  const selectedDate = status === 'accepted' ? safeDate(rawDate) : '';
  const selectedTime = status === 'accepted' ? safeTime(rawTime) : '';

  if (status === 'accepted' && Boolean(rawDate || rawTime) && (!selectedDate || !selectedTime)) {
    throw new ApiError(422, 'Please choose a valid date and time.', 'INVALID_DATE');
  }

  if (
    invitation.dateMode === 'suggestions'
    && selectedDate
    && selectedTime
    && !invitation.dateOptions.some((option) => option.date === selectedDate && option.time === selectedTime)
  ) {
    throw new ApiError(422, 'Please choose one of the suggested date options.', 'DATE_OPTION_NOT_ALLOWED');
  }

  const updated = {
    ...invitation,
    status,
    selectedDate,
    selectedTime,
    respondedAt: new Date().toISOString(),
  };

  await saveInvitation(id, updated);
  const responseChanged = invitation.status !== updated.status
    || invitation.selectedDate !== updated.selectedDate
    || invitation.selectedTime !== updated.selectedTime;
  if (responseChanged) await sendResponseEmail(updated).catch((error) => console.error('Response email error:', error));
  return updated;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'POST') enforceRateLimit(req);

    if (req.method === 'GET') {
      const id = getId(req);
      let invitation = id ? await getInvitation(id) : null;
      const accessToken = getAccessToken(req);

      if (id && invitation && isExpired(invitation)) {
        invitation = null;
        if (isBot(req)) return res.status(410).send('<!doctype html><title>This invitation has expired</title>');
        return res.status(410).json({ error: 'This invitation has expired.', code: 'INVITATION_EXPIRED' });
      }

      if (isStatusRequest(req)) {
        if (!invitation || !hasValidManageToken(invitation, accessToken)) {
          throw new ApiError(403, 'That status link is not valid.', 'STATUS_ACCESS_DENIED');
        }
        return res.status(200).json({ success: true, isStatusView: true, ...publicInvitation(invitation) });
      }

      if (isBot(req)) {
        const pageUrl = `${getBaseUrl(req)}/?id=${encodeURIComponent(id)}`;
        res.status(invitation ? 200 : 404);
        res.setHeader('Content-Type', 'text/html');
        return res.send(renderBotHtml(invitation, pageUrl));
      }

      if (!id) throw new ApiError(400, 'Missing invitation ID.');
      if (!invitation) throw new ApiError(404, 'This invitation could not be found.', 'INVITATION_NOT_FOUND');
      return res.status(200).json({ success: true, ...publicInvitation(invitation) });
    }

    if (req.method === 'POST') {
      const body = parseBody(req);

      if (body.action === 'create') {
        const { invitation, manageToken } = await createInvitation(body);
        return res.status(201).json({ success: true, ...publicInvitation(invitation), manageToken });
      }

      if (body.action === 'accept' || body.action === 'respond') {
        const invitation = await respondToInvitation(body);
        return res.status(200).json({ success: true, ...publicInvitation(invitation) });
      }

      if (body.action === 'update') {
        const invitation = await updateInvitation(body);
        return res.status(200).json({ success: true, ...publicInvitation(invitation) });
      }

      throw new ApiError(400, 'Invalid invitation action.');
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.setHeader('Retry-After', String(error.retryAfter));
      return res.status(429).json({ error: error.message, code: 'RATE_LIMITED' });
    }

    if (error instanceof StorageNotConfiguredError) {
      return res.status(503).json({
        error: 'Invitation storage is not configured. Add the Upstash Redis environment variables.',
        code: 'STORAGE_NOT_CONFIGURED',
      });
    }

    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('Invitation API error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' });
  }
}
