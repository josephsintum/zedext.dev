/** Shared network helpers for the sync steps: injectable fetch/sleep, retries, concurrency. */

/** Network access, injectable so the retry and failure handling can be tested. */
export interface NetDeps {
	fetch: typeof fetch;
	sleep: (ms: number) => Promise<void>;
}

export const defaultDeps: NetDeps = {
	fetch: (input, init) => fetch(input, init),
	sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
};

/** Not worth retrying (e.g. a rejected token): fail the sync straight away. */
export class FatalError extends Error {}

export const isTransient = (status: number) => status === 429 || status >= 500;

/** Up to 3 attempts with 0.5s / 1s backoff. */
export async function withRetry<T>(fn: () => Promise<T>, deps: NetDeps): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await fn();
		} catch (err) {
			if (err instanceof FatalError || attempt >= 3) throw err;
			await deps.sleep(500 * 2 ** (attempt - 1));
		}
	}
}

export async function mapConcurrent<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = [];
	let next = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i]);
		}
	});
	await Promise.all(workers);
	return results;
}
