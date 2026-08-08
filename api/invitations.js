// api/invitations.js

export default async function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /WhatsApp|facebookexternalhit|Twitterbot|TelegramBot|LinkedInBot|Discordbot/i.test(userAgent);

  // 1. Handle GET Requests (Both Bots and Humans/React App)
  if (req.method === 'GET') {
    const { id } = req.query;

    // A. If a WhatsApp or Social Bot opens the link
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

    // B. If a regular browser opens the link or React app fetches data
    if (id) {
      // If fetching from Supabase or DB, replace/query the record here
      return res.status(200).json({ success: true, id });
    }

    return res.status(400).json({ error: 'Missing invitation ID' });
  }

  // 2. Handle POST Requests (Creating or Updating Invitations)
  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'create') {
      const id = Math.random().toString(36).substring(2, 10);
      // If using Supabase / Database, insert record here
      return res.status(200).json({ success: true, id });
    }

    if (action === 'accept') {
      const { id, acceptedDate, acceptedTime } = req.body || {};
      // Update record in database here
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  // 3. Catch-all for unsupported HTTP methods
  return res.status(405).json({ error: 'Method not allowed' });
}
