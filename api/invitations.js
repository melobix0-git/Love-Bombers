// api/invitations.js

// In-memory store for generated short links
const invitationsStore = new Map();

export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Discordbot/i.test(userAgent);

  // 1. HANDLE GET REQUESTS
  if (req.method === 'GET') {
    const { id } = req.query;

    // A. Social Media Crawler / Bot Request (WhatsApp, Twitter, Telegram, etc.)
    if (isBot) {
      const host = req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const absoluteImageUrl = `${protocol}://${host}/og-cover.png`;

      const botHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Love Bomber 💖 Custom Date Invitation</title>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Love Bomber">
  <meta property="og:title" content="You Have a Special Date Invitation! 💖">
  <meta property="og:description" content="Someone special created a customized date invitation just for you. Open to see your details!">
  <meta property="og:image" content="${absoluteImageUrl}">
  <meta property="og:image:secure_url" content="${absoluteImageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${absoluteImageUrl}">
</head>
<body></body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(botHtml);
    }

    // B. Human Browser Fetching Invitation Data by ID
    if (id) {
      const inviteData = invitationsStore.get(id);
      if (inviteData) {
        return res.status(200).json({ success: true, ...inviteData });
      }
      return res.status(200).json({ success: true, id });
    }

    return res.status(400).json({ error: 'Missing invitation ID' });
  }

  // 2. HANDLE POST REQUESTS
  if (req.method === 'POST') {
    const body = req.body || {};
    const { action } = body;

    if (action === 'create') {
      const id = Math.random().toString(36).substring(2, 10);

      // Save invitation parameters into the server memory map
      const inviteData = {
        id,
        myName: body.senderName || 'Your Name',
        crushName: body.crushName || 'My Crush',
        senderPhone: body.senderPhone || '',
        meal: body.meal || 'Jollof Rice',
        place: body.place || 'Lekki, Lagos',
        song: body.song || 'none',
        img: body.imageUrl || body.img || '',
        color: body.themeColor || body.color || '#800020'
      };

      invitationsStore.set(id, inviteData);

      return res.status(200).json({ success: true, id, ...inviteData });
    }

    if (action === 'accept') {
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
