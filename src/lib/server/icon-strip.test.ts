import { describe, expect, it } from 'vitest';
import { iconStripSvg } from './icon-strip.js';

describe('iconStripSvg', () => {
	it('lays icons out in a row as embedded images', () => {
		const out = iconStripSvg(['<svg id="a"/>', '<svg id="b"/>']);
		expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="38" height="16"')).toBe(
			true
		);
		expect(out.match(/<image /g)).toHaveLength(2);
		expect(out).toContain(
			`href="data:image/svg+xml;base64,${Buffer.from('<svg id="a"/>').toString('base64')}"`
		);
	});

	it('never puts icon markup (e.g. scripts) into the strip itself', () => {
		const out = iconStripSvg(['<svg><script>alert(1)</script></svg>']);
		expect(out).not.toContain('<script');
	});
});
