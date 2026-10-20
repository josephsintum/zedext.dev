import { beforeEach, describe, expect, it, vi } from 'vitest';

// Author pages are cached by ISR for a day, and ISR never caches a 5xx: a render missing
// GitHub data must fail so the last good copy is kept, instead of caching the gap
let lookup: () => Promise<unknown>;
let degraded = false;

vi.mock('$lib/server/github-api.js', () => ({ getGitHubUser: () => lookup() }));
vi.mock('$lib/server/snapshot.js', () => ({
	requireSnapshot: async () => ({
		snapshot: {
			extensions: [{ id: 'mocha', repository: 'https://github.com/catppuccin/zed' }]
		},
		degraded
	})
}));

const { load } = await import('./+page.server.js');
const call = (username: string) =>
	load({ params: { username } } as unknown as Parameters<typeof load>[0]);

describe('/authors/<username> load', () => {
	beforeEach(() => {
		lookup = async () => ({ login: 'catppuccin', avatar_url: 'https://avatars/c' });
		degraded = false;
	});

	it('renders the GitHub profile and the author’s extensions', async () => {
		const data = (await call('catppuccin')) as { user: { login: string }; extensions: unknown[] };
		expect(data.user.login).toBe('catppuccin');
		expect(data.extensions).toHaveLength(1);
	});

	it('falls back to the username when GitHub has no such user', async () => {
		lookup = async () => null;
		const data = (await call('catppuccin')) as { user: { login: string; name: null } };
		expect(data.user).toMatchObject({ login: 'catppuccin', name: null });
	});

	it('fails with 503 when the GitHub lookup fails', async () => {
		lookup = async () => {
			throw new Error('GitHub 403');
		};
		await expect(call('catppuccin')).rejects.toMatchObject({ status: 503 });
	});

	it('fails with 503 while the snapshot is degraded', async () => {
		degraded = true;
		await expect(call('catppuccin')).rejects.toMatchObject({ status: 503 });
	});

	it('redirects other spellings to the lowercase URL, so each author is cached once', async () => {
		await expect(call('CatPpuccin')).rejects.toMatchObject({
			status: 308,
			location: '/authors/catppuccin'
		});
	});
});
