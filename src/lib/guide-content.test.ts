import { describe, expect, it } from 'vitest';
import { buildGuide, GUIDES, type Guide } from './guide-content.js';
import { GUIDE_LISTS } from './guides.js';
import type { ExtensionRecord } from './types.js';

const rec = (id: string, downloads = 0) => ({ id, download_count: downloads }) as ExtensionRecord;

const guide: Guide = {
	intro: 'Intro.',
	groups: [
		{
			title: 'First',
			blurb: 'Why.',
			picks: [
				{ id: 'b', why: 'B.' },
				{ id: 'gone', why: 'Not in the snapshot.' },
				{ id: 'a', why: 'A.' }
			]
		},
		{ title: 'Empty', blurb: 'Nothing here matches.', picks: [{ id: 'missing', why: '' }] }
	]
};

describe('buildGuide', () => {
	it('keeps picks in their written order and skips ones the list no longer matches', () => {
		const built = buildGuide(guide, [rec('a', 9), rec('b', 1), rec('c', 5)]);
		expect(built.groups).toHaveLength(1);
		expect(built.groups[0].picks.map((p) => [p.record.id, p.why])).toEqual([
			['b', 'B.'],
			['a', 'A.']
		]);
	});

	it('lists everything not picked under the rest, by downloads', () => {
		const built = buildGuide(guide, [rec('a'), rec('d', 1), rec('c', 5), rec('b')]);
		expect(built.rest.map((r) => r.id)).toEqual(['c', 'd']);
	});

	it('works with an intro and no groups', () => {
		const built = buildGuide({ intro: 'Only words.', groups: [] }, [rec('a')]);
		expect(built).toEqual({ intro: 'Only words.', groups: [], rest: [rec('a')] });
	});
});

describe('GUIDES', () => {
	it('belong to real guide lists', () => {
		const slugs = new Set(GUIDE_LISTS.map((l) => l.slug));
		for (const slug of Object.keys(GUIDES)) expect(slugs.has(slug), slug).toBe(true);
	});

	it('pick each extension at most once per guide', () => {
		for (const [slug, g] of Object.entries(GUIDES)) {
			const ids = g.groups.flatMap((grp) => grp.picks.map((p) => p.id));
			expect(new Set(ids).size, slug).toBe(ids.length);
		}
	});

	it('cover every workflow', () => {
		for (const l of GUIDE_LISTS) {
			expect(Object.hasOwn(GUIDES, l.slug), l.slug).toBe(true);
		}
	});
});
