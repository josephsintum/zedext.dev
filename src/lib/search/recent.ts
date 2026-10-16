/**
 * The extension pages someone opened last, newest first, for the search window. Kept only in
 * their browser; storage that's blocked, full or corrupt just means an empty list.
 */

export const RECENT_KEY = 'zedext:recent-extensions';
export const RECENT_LIMIT = 5;

export type RecentStore = Pick<Storage, 'getItem' | 'setItem'>;

function browserStore(): RecentStore | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null; // reading `localStorage` itself throws when site data is blocked
	}
}

export function readRecent(store: RecentStore | null = browserStore()): string[] {
	try {
		const parsed: unknown = JSON.parse(store?.getItem(RECENT_KEY) ?? '[]');
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((id): id is string => typeof id === 'string').slice(0, RECENT_LIMIT);
	} catch {
		return [];
	}
}

export function recordRecent(id: string, store: RecentStore | null = browserStore()): void {
	const next = [id, ...readRecent(store).filter((other) => other !== id)].slice(0, RECENT_LIMIT);
	try {
		store?.setItem(RECENT_KEY, JSON.stringify(next));
	} catch {
		// Full or blocked: the list just doesn't grow
	}
}
