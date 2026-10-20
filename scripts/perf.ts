/**
 * Page weight and timing check, on a phone-sized viewport with a 4× slower CPU.
 *
 * Usage: bun run perf <base-url> [--cold N] [--seed S]
 *
 * Loads each page in PAGES three times from a cold browser and prints the medians. Exits 1 when
 * any page ships more script or font bytes than the budgets below. --cold N also requests N
 * random extension pages once each and reports how many missed the CDN/ISR cache; the same seed
 * picks the same pages, so a second run shows whether the first one warmed them.
 */

import { chromium, type Browser } from '@playwright/test';

const PAGES = ['/', '/extensions', '/extensions/catppuccin', '/themes', '/guides/vim'];
const RUNS = 3;
/** KB transferred per page; lower these when a change makes the pages lighter */
const BUDGET = { Script: 85, Font: 160 };

interface Sample {
	ttfb: number;
	lcp: number;
	cls: number;
	/** Main-thread busy time in ms (CDP TaskDuration) */
	task: number;
	kb: Record<string, number>;
}

async function measure(browser: Browser, url: string): Promise<Sample> {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	await cdp.send('Performance.enable');
	await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

	const types = new Map<string, string>();
	const bytes: Record<string, number> = {};
	cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
	cdp.on('Network.loadingFinished', (e) => {
		const type = types.get(e.requestId) ?? 'Other';
		bytes[type] = (bytes[type] ?? 0) + e.encodedDataLength;
	});

	// Not 'networkidle': analytics keeps the network busy
	await page.goto(url, { waitUntil: 'load' });
	await page.waitForTimeout(1500);

	const vitals = await page.evaluate(async () => {
		// LCP and layout shifts aren't in the performance timeline; only buffered observers see them
		const observed = (type: string) =>
			new Promise<PerformanceEntryList>((resolve) => {
				new PerformanceObserver((list) => resolve(list.getEntries())).observe({
					type,
					buffered: true
				});
				setTimeout(() => resolve([]), 200);
			});
		const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		const lcp = (await observed('largest-contentful-paint')).at(-1)?.startTime ?? 0;
		const shifts = (await observed('layout-shift')) as unknown as {
			value: number;
			hadRecentInput: boolean;
		}[];
		const cls = shifts.reduce((sum, s) => sum + (s.hadRecentInput ? 0 : s.value), 0);
		return { ttfb: nav.responseStart, lcp, cls };
	});
	const { metrics } = await cdp.send('Performance.getMetrics');
	const task = (metrics.find((m) => m.name === 'TaskDuration')?.value ?? 0) * 1000;
	await context.close();

	const kb = Object.fromEntries(Object.entries(bytes).map(([type, b]) => [type, b / 1024]));
	return { ...vitals, task, kb };
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

async function pages(base: string): Promise<boolean> {
	const browser = await chromium.launch();
	let withinBudget = true;
	console.log('page                      ttfb    lcp    cls   task  script   font   html');
	for (const path of PAGES) {
		const samples: Sample[] = [];
		for (let i = 0; i < RUNS; i++) samples.push(await measure(browser, base + path));
		const of = (pick: (s: Sample) => number) => median(samples.map(pick));
		const kb = (type: string) => of((s) => s.kb[type] ?? 0);

		const over = Object.entries(BUDGET).filter(([type, max]) => kb(type) > max);
		if (over.length > 0) withinBudget = false;
		console.log(
			[
				path.padEnd(24),
				`${of((s) => s.ttfb).toFixed(0)}ms`.padStart(6),
				`${of((s) => s.lcp).toFixed(0)}ms`.padStart(6),
				of((s) => s.cls)
					.toFixed(3)
					.padStart(6),
				`${of((s) => s.task).toFixed(0)}ms`.padStart(6),
				`${kb('Script').toFixed(1)}KB`.padStart(7),
				`${kb('Font').toFixed(1)}KB`.padStart(7),
				`${kb('Document').toFixed(1)}KB`.padStart(7),
				over.map(([type, max]) => `OVER ${type} budget (${max}KB)`).join(', ')
			].join(' ')
		);
	}
	await browser.close();
	return withinBudget;
}

/** Small seeded PRNG (mulberry32), so a seed always picks the same pages */
function random(seed: number): () => number {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

async function cold(base: string, count: number, seed: number): Promise<void> {
	const snapshot = (await (await fetch(`${base}/extensions.json`)).json()) as {
		extensions: { id: string }[];
	};
	const ids = snapshot.extensions.map((e) => e.id);
	const next = random(seed);
	const picked = Array.from({ length: count }, () => ids[Math.floor(next() * ids.length)]);

	const ttfbs: number[] = [];
	let misses = 0;
	for (const id of picked) {
		const start = performance.now();
		const res = await fetch(`${base}/extensions/${id}`);
		const ttfb = performance.now() - start;
		await res.arrayBuffer();
		const cache = res.headers.get('x-vercel-cache') ?? '-';
		if (cache === 'MISS') misses++;
		ttfbs.push(ttfb);
		const age = res.headers.get('age') ?? '-';
		console.log(
			`${res.status} ${cache.padEnd(9)} age ${age.padStart(6)}  ${ttfb.toFixed(0)}ms  ${id}`
		);
	}
	console.log(`cold: ${misses}/${count} MISS, median TTFB ${median(ttfbs).toFixed(0)}ms`);
}

async function main() {
	const args = process.argv.slice(2);
	const flag = (name: string) => {
		const i = args.indexOf(name);
		return i === -1 ? undefined : Number(args[i + 1]);
	};
	const base = args.find((a) => a.startsWith('http'))?.replace(/\/$/, '');
	if (!base) throw new Error('Usage: bun run perf <base-url> [--cold N] [--seed S]');

	const withinBudget = await pages(base);
	const count = flag('--cold');
	if (count) await cold(base, count, flag('--seed') ?? Date.now());
	if (!withinBudget) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
