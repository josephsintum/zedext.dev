import { describe, expect, it } from 'vitest';
import { jsonLdScriptTag, serializeJsonLd } from './json-ld.js';

describe('serializeJsonLd', () => {
	it('cannot be broken out of with a closing script tag', () => {
		const out = serializeJsonLd({ name: 'evil</script><script>alert(1)</script>' });
		expect(out).not.toContain('</script>');
		expect(out).not.toContain('<');
		expect(JSON.parse(out)).toEqual({ name: 'evil</script><script>alert(1)</script>' });
	});

	it('wraps the data in exactly one ld+json script tag', () => {
		const tag = jsonLdScriptTag({ name: 'a</script>b' });
		expect(tag.startsWith('<script type="application/ld+json">')).toBe(true);
		expect(tag.endsWith('</script>')).toBe(true);
		expect(tag.match(/<\/script>/g)).toHaveLength(1);
	});
});
