import { describe, expect, it } from 'vitest';
import { jsonLdScriptTag, serializeJsonLd, siteJsonLd } from './json-ld.js';

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

describe('siteJsonLd', () => {
	const data = siteJsonLd('Find Zed extensions') as { '@graph': Record<string, unknown>[] };
	const byType = (type: string) => data['@graph'].find((n) => n['@type'] === type)!;

	it('describes the site, with a search box that points at the search page', () => {
		expect(byType('WebSite')).toMatchObject({
			name: 'ZedExt',
			url: 'https://zedext.dev/',
			description: 'Find Zed extensions',
			publisher: { '@id': 'https://zedext.dev/#organization' },
			potentialAction: {
				'@type': 'SearchAction',
				target: { urlTemplate: 'https://zedext.dev/extensions?q={search_term_string}' },
				'query-input': 'required name=search_term_string'
			}
		});
	});

	it('names the project behind it and where to reach it', () => {
		expect(byType('Organization')).toMatchObject({
			'@id': 'https://zedext.dev/#organization',
			sameAs: ['https://github.com/josephsintum/zedext.dev'],
			contactPoint: { url: 'https://github.com/josephsintum/zedext.dev/issues' }
		});
	});

	it('survives the script tag', () => {
		expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
	});
});
