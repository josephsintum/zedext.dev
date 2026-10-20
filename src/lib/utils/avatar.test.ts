import { describe, expect, it } from 'vitest';
import { avatarSrcset, avatarUrl } from './avatar.js';

// GitHub serves avatars at 460 px (~24 KB) unless asked for a size; we show them at 24 and 80 px
describe('avatarUrl', () => {
	it('asks GitHub for the displayed size at 2× for sharp screens', () => {
		expect(avatarUrl('https://avatars.githubusercontent.com/u/45585937?v=4', 24)).toBe(
			'https://avatars.githubusercontent.com/u/45585937?v=4&s=48'
		);
	});

	it('replaces a size already in the URL', () => {
		expect(avatarUrl('https://avatars.githubusercontent.com/u/1?s=460&v=4', 80)).toBe(
			'https://avatars.githubusercontent.com/u/1?s=160&v=4'
		);
	});

	it('leaves other hosts alone', () => {
		expect(avatarUrl('https://example.com/me.png', 24)).toBe('https://example.com/me.png');
	});

	it('offers 2× and 3× versions, so 3× phones stay sharp', () => {
		expect(avatarSrcset('https://avatars.githubusercontent.com/u/1?v=4', 24)).toBe(
			'https://avatars.githubusercontent.com/u/1?v=4&s=48 2x, https://avatars.githubusercontent.com/u/1?v=4&s=72 3x'
		);
	});
});
