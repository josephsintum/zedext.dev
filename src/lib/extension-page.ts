import type { ZedExtension } from './types.js';
import { timeAgo } from './utils/format.js';
import { parseRepoUrl } from './utils/parse-repo-url.js';

export interface Badge {
	label: 'Official' | 'Zed org';
	title: string;
}

/** Badges come from who owns the repo, nothing else */
export function badgeFor(repository: string | null): Badge | null {
	const owner = parseRepoUrl(repository ?? '')?.owner.toLowerCase();
	if (owner === 'zed-industries') return { label: 'Official', title: 'Made by Zed Industries' };
	if (owner === 'zed-extensions') {
		return { label: 'Zed org', title: 'Maintained in the zed-extensions GitHub organization' };
	}
	return null;
}

export function firstReleased(versions: ZedExtension[]): string | null {
	const dates = versions.map((v) => v.published_at).sort();
	return dates[0] ?? null;
}

export interface HealthPill {
	label: string;
	tone: 'neutral' | 'warning';
}

/** "Updated N ago" always; "Archived" only when it applies (a pill on every page says nothing) */
export function healthPills(updatedAt: string, archived: boolean): HealthPill[] {
	const pills: HealthPill[] = [{ label: `Updated ${timeAgo(updatedAt)}`, tone: 'neutral' }];
	if (archived) pills.push({ label: 'Archived', tone: 'warning' });
	return pills;
}
