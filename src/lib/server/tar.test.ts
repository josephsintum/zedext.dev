import { describe, expect, it } from 'vitest';
import { readTarGz } from './tar.js';
import { tarGz } from './testing/tar.js';

const text = (b: Uint8Array | undefined) => (b ? new TextDecoder().decode(b) : undefined);

describe('readTarGz', () => {
	it('reads regular files, strips ./ and skips directories', () => {
		const files = readTarGz(
			tarGz({ './themes/a.json': '{"a":1}', './extension.toml': 'id = "x"' })
		);
		expect([...files.keys()].sort()).toEqual(['extension.toml', 'themes/a.json']);
		expect(text(files.get('themes/a.json'))).toBe('{"a":1}');
	});

	it('reads files spanning several 512-byte blocks', () => {
		const big = 'x'.repeat(1300);
		expect(text(readTarGz(tarGz({ 'big.txt': big })).get('big.txt'))).toBe(big);
	});

	it('supports GNU long names', () => {
		const name = `icons/${'deep/'.repeat(25)}rust.svg`;
		expect(readTarGz(tarGz({ [name]: '<svg/>' }, { longNames: true })).has(name)).toBe(true);
	});

	it('returns nothing for an empty archive', () => {
		expect(readTarGz(tarGz({})).size).toBe(0);
	});
});
