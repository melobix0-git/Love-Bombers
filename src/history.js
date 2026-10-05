const STORAGE_KEY = 'love-bomber:recent-invitations';
const MAX_ITEMS = 6;

export function getRecentInvitations() {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function clearRecentInvitations() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage permission errors.
  }
}

export function saveRecentInvitation(invitation) {
  if (typeof window === 'undefined' || !invitation?.id) return getRecentInvitations();
  const next = [invitation, ...getRecentInvitations().filter((item) => item.id !== invitation.id)].slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local history is a convenience and should never block invitation creation.
  }
  return next;
}
