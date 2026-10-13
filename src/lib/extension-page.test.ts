import { afterEach, describe, expect, it, vi } from 'vitest';
import { badgeFor, firstReleased, healthPills } from './extension-page.js';
import type { ZedExtension } from './types.js';

describe('badgeFor', () => {
	it('marks Zed Industries repos Official and zed-extensions repos Zed org', () => {
		expect(badgeFor('https://github.com/zed-industries/zed')?.label).toBe('Official');
		expect(badgeFor('https://github.com/Zed-Extensions/java')?.label).toBe('Zed org');
	});

	it('gives everything else no badge', () => {
		expect(badgeFor('https://github.com/catppuccin/zed')).toBeNull();
		expect(badgeFor(null)).toBeNull();
	});

	it('only trusts the owner of a real github.com URL', () => {
		// Repository URLs are set by extension authors, so a look-alike must not earn a badge
		expect(badgeFor('https://evil.example/github.com/zed-industries/zed')).toBeNull();
		expect(badgeFor('https://github.com.evil.example/zed-industries/zed')).toBeNull();
		expect(badgeFor('https://gitlab.com/x/github.com/zed-extensions/java')).toBeNull();
		expect(badgeFor('https://www.github.com/zed-extensions/java/')?.label).toBe('Zed org');
	});
});

describe('firstReleased', () => {
	const v = (published_at: string) => ({ published_at }) as ZedExtension;

	it('is the earliest publish date in any order', () => {
		expect(firstReleased([v('2025-03-01T00:00:00Z'), v('2024-02-14T00:00:00Z')])).toBe(
			'2024-02-14T00:00:00Z'
		);
		expect(firstReleased([])).toBeNull();
	});
});

describe('healthPills', () => {
	afterEach(() => vi.useRealTimers());

	it('says when it was updated, and warns only when the repo is archived', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-13T00:00:00Z'));
		expect(healthPills('2026-10-10T00:00:00Z', false)).toEqual([
			{ label: 'Updated 3 days ago', tone: 'neutral' }
		]);
		expect(healthPills('2026-10-10T00:00:00Z', true)).toEqual([
			{ label: 'Updated 3 days ago', tone: 'neutral' },
			{ label: 'Archived', tone: 'warning' }
		]);
	});
});
