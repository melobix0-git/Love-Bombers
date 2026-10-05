const memoryStore = globalThis.__loveBomberMemoryStore || new Map();
globalThis.__loveBomberMemoryStore = memoryStore;

const STORAGE_PREFIX = 'love-bomber:invitation:';

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('Durable invitation storage is not configured.');
    this.name = 'StorageNotConfiguredError';
  }
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function canUseMemoryStorage() {
  return process.env.ALLOW_EPHEMERAL_STORAGE === 'true' && !process.env.VERCEL;
}

async function runRedisCommand(command) {
  const config = getRedisConfig();
  if (!config) {
    if (!canUseMemoryStorage()) throw new StorageNotConfiguredError();
    return null;
  }

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) {
    throw new Error(result.error || 'Invitation storage request failed.');
  }
  return result.result;
}

export function getInvitationTtlSeconds() {
  const days = Number.parseInt(process.env.INVITATION_TTL_DAYS || '30', 10);
  const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 30;
  return safeDays * 24 * 60 * 60;
}

export async function getInvitation(id) {
  const key = `${STORAGE_PREFIX}${id}`;
  const config = getRedisConfig();

  if (config) {
    const value = await runRedisCommand(['GET', key]);
    return value ? JSON.parse(value) : null;
  }

  if (!canUseMemoryStorage()) throw new StorageNotConfiguredError();
  const entry = memoryStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function saveInvitation(id, value, ttlSeconds = getInvitationTtlSeconds()) {
  const key = `${STORAGE_PREFIX}${id}`;
  const config = getRedisConfig();

  if (config) {
    await runRedisCommand(['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]);
    return value;
  }

  if (!canUseMemoryStorage()) throw new StorageNotConfiguredError();
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  return value;
}
