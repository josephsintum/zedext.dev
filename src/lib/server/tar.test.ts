import { gzipSync } from 'node:zlib';
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

	it('rejects a corrupt negative size instead of looping forever', () => {
		const header = new Uint8Array(512);
		header.set(new TextEncoder().encode('evil.txt'), 0);
		header.set(new TextEncoder().encode('-0001000\0'), 124); // -512 would never advance
		header[156] = '0'.charCodeAt(0);
		const archive = gzipSync(Buffer.concat([header, new Uint8Array(1024)]));
		expect(() => readTarGz(archive)).toThrow(/corrupt/i);
	});

	it('refuses archives that decompress past the size limit', () => {
		const archive = tarGz({ 'big.txt': 'x'.repeat(4096) });
		expect(() => readTarGz(archive, { maxBytes: 2048 })).toThrow();
		expect(readTarGz(archive).has('big.txt')).toBe(true);
	});

	it('returns nothing for an empty archive', () => {
		expect(readTarGz(tarGz({})).size).toBe(0);
	});
});
