import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { runAlgoliaSync } from '$lib/server/algolia-sync.js';

export const config = {
	maxDuration: 300
};

export const GET: RequestHandler = async ({ request }) => {
	const cronSecret = env.CRON_SECRET;

	if (!cronSecret) {
		return json({ ok: false, error: 'CRON_SECRET is not configured' }, { status: 500 });
	}

	if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
		return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await runAlgoliaSync();
		return json({ ok: true, result });
	} catch (error) {
		console.error('Vercel cron sync failed:', error);
		return json(
			{ ok: false, error: error instanceof Error ? error.message : 'Unknown sync error' },
			{ status: 500 }
		);
	}
};
