import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache, getCached } from './cache.js';

const TTL = 1000;
const RETRY_AFTER_MS = 60 * 1000;

/** A fetcher whose calls can be counted and resolved by hand. */
function controlled<T>() {
	const calls: { resolve: (v: T) => void; reject: (e: unknown) => void }[] = [];
	const fetcher = vi.fn(() => new Promise<T>((resolve, reject) => calls.push({ resolve, reject })));
	return { fetcher, calls };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	clearCache();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('getCached', () => {
	it('fetches once and serves the value while fresh', async () => {
		const fetcher = vi.fn(async () => 'a');
		expect(await getCached('k', TTL, fetcher)).toBe('a');
		vi.advanceTimersByTime(TTL - 1);
		expect(await getCached('k', TTL, fetcher)).toBe('a');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('shares one request between callers that miss at the same time', async () => {
		const { fetcher, calls } = controlled<string>();
		const first = getCached('k', TTL, fetcher);
		const second = getCached('k', TTL, fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		calls[0].resolve('a');
		expect(await Promise.all([first, second])).toEqual(['a', 'a']);
	});

	it('refetches an expired value within the request', async () => {
		const fetcher = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
		await getCached('k', TTL, fetcher);
		vi.advanceTimersByTime(TTL);
		expect(await getCached('k', TTL, fetcher)).toBe('new');
	});

	it('does not cache a failure when there is nothing to fall back on', async () => {
		const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue('a');
		await expect(getCached('k', TTL, fetcher)).rejects.toThrow('down');
		expect(await getCached('k', TTL, fetcher)).toBe('a');
	});

	it('serves the last good value when a refetch fails, then retries after a minute', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce('old')
			.mockRejectedValueOnce(new Error('down'))
			.mockResolvedValueOnce('new');
		await getCached('k', TTL, fetcher);

		vi.advanceTimersByTime(TTL);
		expect(await getCached('k', TTL, fetcher)).toBe('old');
		expect(await getCached('k', TTL, fetcher)).toBe('old'); // backing off, no new request
		expect(fetcher).toHaveBeenCalledTimes(2);

		vi.advanceTimersByTime(RETRY_AFTER_MS);
		expect(await getCached('k', TTL, fetcher)).toBe('new');
	});

	it('caches null as a real answer', async () => {
		const fetcher = vi.fn(async () => null);
		expect(await getCached('k', TTL, fetcher)).toBeNull();
		expect(await getCached('k', TTL, fetcher)).toBeNull();
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
