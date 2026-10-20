import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from './+page.svelte';

// /authors/<Mixed> redirects to lowercase, so the canonical URL must be the lowercase one
describe('author page head', () => {
	it('declares the lowercase URL as canonical, whatever GitHub’s spelling', () => {
		const user = {
			login: 'Catppuccin',
			name: null,
			avatar_url: null,
			html_url: 'https://github.com/Catppuccin',
			bio: null,
			company: null,
			location: null
		};
		const { head } = render(Page, { props: { data: { user, extensions: [] } } as never });
		expect(head).toContain('<link rel="canonical" href="https://zedext.dev/authors/catppuccin"');
		expect(head).toContain('content="https://zedext.dev/authors/catppuccin"');
		expect(head).not.toContain('/authors/Catppuccin');
	});
});
