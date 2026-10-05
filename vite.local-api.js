import invitationHandler from './api/invitations.js';

function createResponseAdapter(response) {
  return {
    setHeader(name, value) {
      response.setHeader(name, value);
      return this;
    },
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(payload) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(payload));
      return this;
    },
    send(payload) {
      response.end(payload);
      return this;
    },
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

export function localInvitationApi() {
  return {
    name: 'local-invitation-api',
    configureServer(server) {
      // Local-only memory storage makes the live Vite preview useful without credentials.
      process.env.ALLOW_EPHEMERAL_STORAGE ||= 'true';
      server.middlewares.use('/api/invitations', async (request, response) => {
        try {
          request.body = await readBody(request);
          await invitationHandler(request, createResponseAdapter(response));
        } catch (error) {
          response.statusCode = 400;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ error: error.message || 'Request failed.' }));
        }
      });
    },
  };
}
