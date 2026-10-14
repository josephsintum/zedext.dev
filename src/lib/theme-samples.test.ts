import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SAMPLE,
	readSampleChoice,
	SAMPLES,
	STORAGE_KEY,
	writeSampleChoice,
	type Role
} from './theme-samples.js';

const ROLES: Role[] = [
	'comment',
	'keyword',
	'function',
	'type',
	'variable',
	'string',
	'number',
	'punct',
	'title',
	'emphasis',
	'strong',
	'linkText',
	'linkUri',
	'literal',
	'tag',
	'attribute',
	'property',
	'fg'
];

function fakeStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		data
	};
}

const throwing = {
	getItem: () => {
		throw new Error('SecurityError');
	},
	setItem: () => {
		throw new Error('QuotaExceededError');
	}
};

describe('SAMPLES', () => {
	it('covers code, markup and data files, Rust first', () => {
		expect(SAMPLES.map((s) => s.id)).toEqual([
			'rust',
			'ts',
			'python',
			'go',
			'react',
			'html',
			'json',
			'markdown'
		]);
		expect(DEFAULT_SAMPLE).toBe('rust');
	});

	it('uses only known roles and shows off at least 5 theme colors each', () => {
		for (const sample of SAMPLES) {
			const used = new Set(sample.lines.flat().map(([, role]) => role));
			for (const role of used) expect(ROLES).toContain(role);
			expect(used.size, sample.id).toBeGreaterThanOrEqual(5);
			expect(sample.lines.length, sample.id).toBeGreaterThanOrEqual(5);
		}
	});
});

describe('remembered sample choice', () => {
	it('round-trips a valid choice', () => {
		const storage = fakeStorage();
		writeSampleChoice(storage, 'python');
		expect(storage.data.get(STORAGE_KEY)).toBe('python');
		expect(readSampleChoice(storage)).toBe('python');
	});

	it('falls back to Rust for missing, unknown or unreadable values', () => {
		expect(readSampleChoice(fakeStorage())).toBe('rust');
		expect(readSampleChoice(fakeStorage({ [STORAGE_KEY]: 'cobol' }))).toBe('rust');
		expect(readSampleChoice(throwing)).toBe('rust');
		expect(readSampleChoice(null)).toBe('rust');
	});

	it('never throws when storage is blocked', () => {
		expect(() => writeSampleChoice(throwing, 'go')).not.toThrow();
		expect(() => writeSampleChoice(null, 'go')).not.toThrow();
	});
});

describe('markup samples', () => {
	const roles = (id: string) =>
		new Set(
			SAMPLES.find((s) => s.id === id)!
				.lines.flat()
				.map(([, role]) => role)
		);

	it('use the colors Zed gives each format', () => {
		expect([...roles('markdown')]).toEqual(
			expect.arrayContaining(['title', 'emphasis', 'strong', 'linkText', 'linkUri', 'literal'])
		);
		expect([...roles('html')]).toEqual(expect.arrayContaining(['tag', 'attribute', 'string']));
		expect([...roles('json')]).toEqual(expect.arrayContaining(['property', 'string', 'number']));
	});
});
