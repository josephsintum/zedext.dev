import { describe, expect, it } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { GET } from './+server.js';

describe('/extensions/<id>/alternatives', () => {
	it('permanently redirects to the extension page', async () => {
		const call = () => GET({ params: { id: 'java' } } as Parameters<typeof GET>[0]);
		try {
			await call();
			expect.unreachable('should redirect');
		} catch (err) {
			expect(isRedirect(err)).toBe(true);
			expect(err).toMatchObject({ status: 301, location: '/extensions/java' });
		}
	});
});
