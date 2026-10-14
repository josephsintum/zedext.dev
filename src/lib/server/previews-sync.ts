/**
 * Theme previews for the sync: download each theme's published archive from Zed (only when
 * its version changed), extract colors/icons, and keep everything else from the previous
 * bundle. Never throws: previews are a nice-to-have on top of the snapshot.
 */

import { readTarGz } from './tar.js';
import {
	defaultDeps,
	FatalError,
	isTransient,
	mapConcurrent,
	withRetry,
	type NetDeps
} from './net.js';
import { parseIconThemeFile, parseThemeFile, type PreviewBundle } from '../theme-preview.js';
import type { ExtensionRecord } from '../types.js';

export const PREVIEWS_PATH = 'theme-previews.json';
const ZED_API = 'https://api.zed.dev';
const USER_AGENT = 'zedext-sync (+https://zedext.dev)';
const DOWNLOAD_CONCURRENCY = 8;
/** A 1 MB archive takes ~1.4 s; a stalled connection must not eat the whole cron. */
const DOWNLOAD_TIMEOUT_MS = 15_000;
/**
 * Bump when theme parsing changes, or when themeColors() fallbacks change (stored colors are
 * compacted against them). Each entry records its format, so old ones keep migrating, at
 * the download limit per run, until all are current.
 */
export const PREVIEW_FORMAT = 4;
/** Icon-theme parsing has its own format, so theme changes don't re-download icon themes */
export const ICON_FORMAT = 3;
/** Refuse to publish a bundle that lost more than this share of the previous themes. */
const MIN_RETAINED_RATIO = 0.9;

const isTheme = (r: ExtensionRecord) => r.provides.includes('themes');
const isIconTheme = (r: ExtensionRecord) => r.provides.includes('icon-themes');

async function download(
	id: string,
	deps: NetDeps,
	timeoutMs: number
): Promise<Map<string, Uint8Array>> {
	return withRetry(async () => {
		const res = await deps.fetch(`${ZED_API}/extensions/${id}/download`, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(timeoutMs)
		});
		if (isTransient(res.status)) throw new Error(`download ${res.status}`);
		// 404 etc. won't fix themselves within this run: don't retry them
		if (!res.ok) throw new FatalError(`download ${res.status}`);
		return readTarGz(new Uint8Array(await res.arrayBuffer()));
	}, deps);
}

/**
 * The previous bundle, if any. `ok: false` means it exists but couldn't be read, and the
 * sync must skip previews rather than rebuild from scratch and overwrite a good bundle.
 */
export async function loadPreviousPreviews(
	url: string | URL,
	fetchImpl: (url: string | URL) => Promise<Response> = (u) => fetch(u)
): Promise<{ ok: boolean; bundle: PreviewBundle | null }> {
	try {
		const res = await fetchImpl(url);
		if (res.status === 404) return { ok: true, bundle: null };
		if (!res.ok) return { ok: false, bundle: null };
		const bundle = (await res.json()) as PreviewBundle;
		const isObject = (v: unknown) => typeof v === 'object' && v !== null;
		return isObject(bundle?.themes) && isObject(bundle?.icons)
			? { ok: true, bundle }
			: { ok: false, bundle: null };
	} catch {
		return { ok: false, bundle: null };
	}
}

export function previewsShrank(next: PreviewBundle, previous: PreviewBundle | null): boolean {
	const before = previous ? Object.keys(previous.themes).length : 0;
	return before > 0 && Object.keys(next.themes).length < before * MIN_RETAINED_RATIO;
}

export async function buildPreviews(
	records: ExtensionRecord[],
	previous: PreviewBundle | null,
	{
		limit,
		log,
		deps = defaultDeps,
		timeoutMs = DOWNLOAD_TIMEOUT_MS,
		deadline
	}: {
		limit: number;
		log: (m: string) => void;
		deps?: NetDeps;
		timeoutMs?: number;
		/** Epoch ms after which no new downloads start (the rest wait for the next run) */
		deadline?: number;
	}
): Promise<{ bundle: PreviewBundle; downloaded: number; failed: number; pending: number }> {
	const bundle: PreviewBundle = {
		format: PREVIEW_FORMAT,
		generatedAt: new Date().toISOString(),
		themes: {},
		icons: {}
	};
	const stale: ExtensionRecord[] = [];
	// Entries written before formats were stored per entry carry the bundle's format
	const formatOf = (entry: { format?: number }) => entry.format ?? previous?.format ?? 0;

	for (const r of records.filter((r) => isTheme(r) || isIconTheme(r))) {
		const prevTheme = previous?.themes[r.id];
		const prevIcons = previous?.icons[r.id];
		// Kept even when stale, until a fresh download replaces them
		if (prevTheme) bundle.themes[r.id] = { ...prevTheme, format: formatOf(prevTheme) };
		if (prevIcons) bundle.icons[r.id] = { ...prevIcons, format: formatOf(prevIcons) };
		const current =
			(!isTheme(r) ||
				(prevTheme?.version === r.version && formatOf(prevTheme) === PREVIEW_FORMAT)) &&
			(!isIconTheme(r) ||
				(prevIcons?.version === r.version && formatOf(prevIcons) === ICON_FORMAT));
		if (!current) stale.push(r);
	}

	const batch = stale.slice(0, Math.max(0, limit));
	let downloaded = 0;
	let failed = 0;
	let skipped = 0;
	await mapConcurrent(batch, DOWNLOAD_CONCURRENCY, async (r) => {
		if (deadline !== undefined && Date.now() > deadline) {
			skipped++;
			return;
		}
		try {
			const files = await download(r.id, deps, timeoutMs);
			const text = (path: string) => new TextDecoder().decode(files.get(path));
			const jsonIn = (dir: string) =>
				[...files.keys()].filter((p) => p.startsWith(`${dir}/`) && p.endsWith('.json'));

			if (isTheme(r)) {
				const variants = jsonIn('themes').flatMap((p) => parseThemeFile(text(p)));
				if (variants.length > 0)
					bundle.themes[r.id] = { version: r.version, format: PREVIEW_FORMAT, variants };
				else delete bundle.themes[r.id];
			}
			if (isIconTheme(r)) {
				const variants = jsonIn('icon_themes').flatMap((p) => parseIconThemeFile(text(p), files));
				if (variants.length > 0)
					bundle.icons[r.id] = { version: r.version, format: ICON_FORMAT, variants };
				else delete bundle.icons[r.id];
			}
			downloaded++;
		} catch (err) {
			failed++;
			log(`Preview download failed for ${r.id}, keeping previous: ${(err as Error).message}`);
		}
	});

	const pending = stale.length - batch.length + skipped;
	log(`Previews: ${downloaded} downloaded, ${failed} failed, ${pending} left for later runs`);
	return { bundle, downloaded, failed, pending };
}
