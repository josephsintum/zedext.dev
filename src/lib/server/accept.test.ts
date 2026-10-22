import { describe, expect, it } from 'vitest';
import { preferredFormat } from './accept.js';

describe('preferredFormat', () => {
	it('serves HTML without an Accept header, or with only wildcards', () => {
		expect(preferredFormat(null)).toBe('html');
		expect(preferredFormat('')).toBe('html');
		expect(preferredFormat('*/*')).toBe('html');
		expect(preferredFormat('text/*')).toBe('html');
	});

	it('serves HTML to browsers', () => {
		const chrome =
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
		expect(preferredFormat(chrome)).toBe('html');
		expect(preferredFormat('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')).toBe(
			'html'
		);
	});

	it('serves Markdown when asked for it', () => {
		expect(preferredFormat('text/markdown')).toBe('markdown');
		expect(preferredFormat('text/markdown; charset=utf-8')).toBe('markdown');
		expect(preferredFormat('text/markdown, */*;q=0.1')).toBe('markdown');
	});

	it('honors q-values', () => {
		expect(preferredFormat('text/markdown, text/html;q=0.8')).toBe('markdown');
		expect(preferredFormat('text/markdown;q=0.5, text/html')).toBe('html');
		expect(preferredFormat('text/markdown;q=0, */*')).toBe('html');
		expect(preferredFormat('text/html;q=0, */*')).toBe('markdown');
	});

	it('prefers the more specific match at the same q', () => {
		expect(preferredFormat('text/markdown, */*')).toBe('markdown');
		expect(preferredFormat('text/html, text/*')).toBe('html');
	});

	it('gives Markdown a tie only when the client named it', () => {
		expect(preferredFormat('text/html, text/markdown')).toBe('markdown');
		expect(preferredFormat('text/markdown, text/html')).toBe('markdown');
	});

	it('is case-insensitive and tolerates spacing and odd parameters', () => {
		expect(preferredFormat(' Text/Markdown ;Q=0.9 , text/html ; q=0.2')).toBe('markdown');
		expect(preferredFormat('text/markdown;q=abc, text/html;q=0.5')).toBe('markdown');
	});

	it('returns null when neither format is acceptable', () => {
		expect(preferredFormat('application/json')).toBeNull();
		expect(preferredFormat('application/pdf, image/*')).toBeNull();
		expect(preferredFormat('text/markdown;q=0, text/html;q=0')).toBeNull();
		expect(preferredFormat('*/*;q=0')).toBeNull();
	});
});
