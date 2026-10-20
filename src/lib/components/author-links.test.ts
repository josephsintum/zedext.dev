import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ExtensionGridCard from './ExtensionGridCard.svelte';
import Sidebar from './Sidebar.svelte';
import type { ExtensionRecord, ZedExtension } from '$lib/types.js';

// Author pages redirect other spellings to the lowercase URL (one ISR cache entry per author),
// so links go straight there instead of through the redirect
const extension: ZedExtension = {
	id: 'catppuccin',
	name: 'Catppuccin',
	version: '1.0.0',
	description: null,
	authors: ['Catppuccin'],
	repository: 'https://github.com/Catppuccin/zed',
	schema_version: 1,
	wasm_api_version: null,
	provides: ['themes'],
	published_at: '2026-10-01T00:00:00Z',
	download_count: 1000
};

describe('author links', () => {
	it('grid cards link to the lowercase author URL', () => {
		const hit = { ...extension, github_stars: 5 } as unknown as ExtensionRecord;
		const { body } = render(ExtensionGridCard, { props: { hit } });
		expect(body).toContain('href="/authors/catppuccin"');
	});

	it('the sidebar links to the lowercase author URL and shows the owner as written', () => {
		const { body } = render(Sidebar, {
			props: { extension, versions: [extension], github: null, repoOwner: 'Catppuccin' }
		});
		expect(body).toContain('href="/authors/catppuccin"');
		expect(body).not.toContain('href="/authors/Catppuccin"');
		expect(body).toContain('More from Catppuccin');
	});
});
