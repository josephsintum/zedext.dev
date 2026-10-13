import { describe, expect, it, vi } from 'vitest';
import { changelogTargets, detectChangelog, withChangelogs } from './changelog-sync.js';
import type { ExtensionRecord, Snapshot } from '../types.js';

const rec = (id: string, extra: Partial<ExtensionRecord> = {}) =>
	({ id, version: '1.0.0', repository: `https://github.com/o/${id}`, ...extra }) as ExtensionRecord;
const snap = (records: ExtensionRecord[]): Snapshot => ({ generatedAt: '', extensions: records });

describe('changelogTargets', () => {
	it('checks repos never checked or whose version changed, up to a cap', () => {
		const previous = snap([
			rec('same', { changelog: 'file' }),
			rec('bumped', { changelog: null }),
			rec('unchecked')
		]);
		const records = [
			rec('same'),
			rec('bumped', { version: '1.1.0' }),
			rec('unchecked'),
			rec('new'),
			rec('monorepo', { repository: 'https://github.com/zed-industries/zed' }),
			rec('no-repo', { repository: null })
		];
		expect(changelogTargets(records, previous, 10).map((r) => r.id)).toEqual([
			'bumped',
			'unchecked',
			'new'
		]);
		expect(changelogTargets(records, previous, 1).map((r) => r.id)).toEqual(['bumped']);
	});
});

describe('withChangelogs', () => {
	it("uses this run's result, else carries the previous one forward", () => {
		const previous = snap([rec('a', { changelog: 'file' }), rec('b', { changelog: 'releases' })]);
		const found = new Map([['b', null]]);
		const out = withChangelogs([rec('a'), rec('b'), rec('c')], previous, found);
		expect(out.map((r) => r.changelog)).toEqual(['file', null, undefined]);
	});

	it('forgets a "none" whose re-check failed, so the next sync checks it again', () => {
		const previous = snap([rec('none', { changelog: null }), rec('has', { changelog: 'file' })]);
		const out = withChangelogs(
			[rec('none', { version: '1.1.0' }), rec('has', { version: '1.1.0' })],
			previous,
			new Map(),
			new Set(['none', 'has'])
		);
		expect('changelog' in out[0]).toBe(false);
		expect(out[1].changelog).toBe('file'); // a known changelog stays shown
		expect(changelogTargets(out, snap(out), 10).map((r) => r.id)).toEqual(['none']);
	});
});

describe('detectChangelog', () => {
	type Route = (url: string, init?: RequestInit) => Response;
	const deps = (route: Route) => ({
		fetch: vi.fn(async (input: string | URL | Request, init?: RequestInit) =>
			route(String(input), init)
		),
		sleep: async () => {}
	});
	const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
	const release = (body: string) => ({
		tag_name: 'v1',
		name: null,
		body,
		published_at: '2026-10-09T12:00:00Z',
		draft: false
	});

	it('finds a changelog file without using the GitHub API', async () => {
		const d = deps((url) =>
			url === 'https://raw.githubusercontent.com/o/r/HEAD/CHANGELOG.md'
				? new Response(null, { status: 200 })
				: new Response(null, { status: 404 })
		);
		expect(await detectChangelog('o', 'r', 'token', d)).toBe('file');
		expect(d.fetch.mock.calls.every(([u]) => !String(u).includes('api.github.com'))).toBe(true);
	});

	it('falls back to releases, counting only ones with real notes', async () => {
		const withNotes = deps((url) =>
			url.includes('api.github.com')
				? json([release('- Notes')])
				: new Response(null, { status: 404 })
		);
		expect(await detectChangelog('o', 'r', 'token', withNotes)).toBe('releases');
		const autoOnly = deps((url) =>
			url.includes('api.github.com')
				? json([release('**Full Changelog**: https://github.com/o/r/commits/v1')])
				: new Response(null, { status: 404 })
		);
		expect(await detectChangelog('o', 'r', 'token', autoOnly)).toBeNull();
	});

	it('gives every request a timeout, so a stalled connection cannot stall the sync', async () => {
		const d = deps((url) =>
			url.includes('api.github.com') ? json([]) : new Response(null, { status: 404 })
		);
		await detectChangelog('o', 'r', 'token', d);
		expect(d.fetch.mock.calls.length).toBe(3);
		for (const [, init] of d.fetch.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it('throws on a failure, so the repo is checked again next sync', async () => {
		const d = deps(() => new Response(null, { status: 503 }));
		await expect(detectChangelog('o', 'r', 'token', d)).rejects.toThrow();
	});
});
