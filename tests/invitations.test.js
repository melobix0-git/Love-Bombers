import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.ALLOW_EPHEMERAL_STORAGE = 'true';
process.env.VERCEL = '';

const { default: handler } = await import('../api/invitations.js');

function invoke({ method, body, query = {}, userAgent = 'test-runner' }) {
  return new Promise((resolve) => {
    const result = { status: 200, headers: {}, body: null };
    const response = {
      setHeader(name, value) {
        result.headers[name] = value;
        return this;
      },
      status(code) {
        result.status = code;
        return this;
      },
      json(payload) {
        result.body = payload;
        resolve(result);
        return this;
      },
      send(payload) {
        result.body = payload;
        resolve(result);
        return this;
      },
    };

    handler({
      method,
      body,
      query,
      url: `/api/invitations?${new URLSearchParams(query).toString()}`,
      headers: { host: 'love-bomber.test', 'user-agent': userAgent },
    }, response);
  });
}

test('creates an invitation with a private status token', async () => {
  const created = await invoke({
    method: 'POST',
    body: {
      action: 'create',
      senderName: 'Ada',
      crushName: 'Tobi',
      senderEmail: 'ada@example.com',
      template: 'midnight',
      dateMode: 'suggestions',
      dateOptions: [{ date: '2099-08-20', time: '18:49' }],
    },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.success, true);
  assert.match(created.body.id, /^[A-Za-z0-9_-]+$/);
  assert.ok(created.body.manageToken);
  assert.equal(created.body.template, 'midnight');
  assert.equal(created.body.dateOptions.length, 1);
});

test('renders personalized social metadata for crawlers', async () => {
  const created = await invoke({
    method: 'POST',
    body: { action: 'create', senderName: 'Ada', crushName: 'Tobi' },
  });
  const botPage = await invoke({ method: 'GET', query: { id: created.body.id }, userAgent: 'WhatsApp' });

  assert.equal(botPage.status, 200);
  assert.match(botPage.body, /Tobi, you have a date invitation/);
  assert.match(botPage.body, /Ada created a personalized invitation/);
});

test('protects the creator status endpoint', async () => {
  const created = await invoke({
    method: 'POST',
    body: { action: 'create', senderName: 'A', crushName: 'B' },
  });
  const { id, manageToken } = created.body;

  const denied = await invoke({ method: 'GET', query: { id, mode: 'status', token: 'wrong' } });
  assert.equal(denied.status, 403);

  const status = await invoke({ method: 'GET', query: { id, mode: 'status', token: manageToken } });
  assert.equal(status.status, 200);
  assert.equal(status.body.isStatusView, true);
  assert.equal(status.body.manageTokenHash, undefined);
});

test('accepts an allowed suggested date and rejects another date', async () => {
  const created = await invoke({
    method: 'POST',
    body: {
      action: 'create',
      senderName: 'A',
      crushName: 'B',
      dateMode: 'suggestions',
      dateOptions: [{ date: '2099-08-20', time: '18:49' }],
    },
  });
  const { id } = created.body;

  const invalid = await invoke({
    method: 'POST',
    body: { action: 'respond', id, status: 'accepted', date: '2099-08-21', time: '18:49' },
  });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.code, 'DATE_OPTION_NOT_ALLOWED');

  const valid = await invoke({
    method: 'POST',
    body: { action: 'respond', id, status: 'accepted', date: '2099-08-20', time: '18:49' },
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.status, 'accepted');
  assert.equal(valid.body.selectedDate, '2099-08-20');
});

test('updates an invitation only with its private token', async () => {
  const created = await invoke({
    method: 'POST',
    body: { action: 'create', senderName: 'A', crushName: 'B' },
  });
  const { id, manageToken } = created.body;

  const updated = await invoke({
    method: 'POST',
    body: {
      action: 'update',
      id,
      token: manageToken,
      senderName: 'A updated',
      crushName: 'B updated',
      template: 'sunset',
      dateMode: 'recipient',
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.myName, 'A updated');
  assert.equal(updated.body.template, 'sunset');
});
