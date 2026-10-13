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
import {
	parseIconThemeFile,
	parseThemeFile,
	swatchOf,
	type PreviewBundle
} from '../theme-preview.js';
import type { ExtensionRecord } from '../types.js';

export const PREVIEWS_PATH = 'theme-previews.json';
const ZED_API = 'https://api.zed.dev';
const USER_AGENT = 'zedext-sync (+https://zedext.dev)';
const DOWNLOAD_CONCURRENCY = 8;

const isTheme = (r: ExtensionRecord) => r.provides.includes('themes');
const isIconTheme = (r: ExtensionRecord) => r.provides.includes('icon-themes');

async function download(id: string, deps: NetDeps): Promise<Map<string, Uint8Array>> {
	return withRetry(async () => {
		const res = await deps.fetch(`${ZED_API}/extensions/${id}/download`, {
			headers: { 'User-Agent': USER_AGENT }
		});
		if (isTransient(res.status)) throw new Error(`download ${res.status}`);
		// 404 etc. won't fix themselves within this run: don't retry them
		if (!res.ok) throw new FatalError(`download ${res.status}`);
		return readTarGz(new Uint8Array(await res.arrayBuffer()));
	}, deps);
}

export async function buildPreviews(
	records: ExtensionRecord[],
	previous: PreviewBundle | null,
	{ limit, log, deps = defaultDeps }: { limit: number; log: (m: string) => void; deps?: NetDeps }
): Promise<{ bundle: PreviewBundle; downloaded: number; failed: number; pending: number }> {
	const bundle: PreviewBundle = { generatedAt: new Date().toISOString(), themes: {}, icons: {} };
	const stale: ExtensionRecord[] = [];

	for (const r of records.filter((r) => isTheme(r) || isIconTheme(r))) {
		const prevTheme = previous?.themes[r.id];
		const prevIcons = previous?.icons[r.id];
		if (prevTheme) bundle.themes[r.id] = prevTheme;
		if (prevIcons) bundle.icons[r.id] = prevIcons;
		const current =
			(!isTheme(r) || prevTheme?.version === r.version) &&
			(!isIconTheme(r) || prevIcons?.version === r.version);
		if (!current) stale.push(r);
	}

	const batch = stale.slice(0, limit);
	let failed = 0;
	await mapConcurrent(batch, DOWNLOAD_CONCURRENCY, async (r) => {
		try {
			const files = await download(r.id, deps);
			const text = (path: string) => new TextDecoder().decode(files.get(path));
			const jsonIn = (dir: string) =>
				[...files.keys()].filter((p) => p.startsWith(`${dir}/`) && p.endsWith('.json'));

			if (isTheme(r)) {
				const variants = jsonIn('themes').flatMap((p) => parseThemeFile(text(p)));
				if (variants.length > 0) bundle.themes[r.id] = { version: r.version, variants };
				else delete bundle.themes[r.id];
			}
			if (isIconTheme(r)) {
				const variants = jsonIn('icon_themes').flatMap((p) => parseIconThemeFile(text(p), files));
				if (variants.length > 0) bundle.icons[r.id] = { version: r.version, variants };
				else delete bundle.icons[r.id];
			}
		} catch (err) {
			failed++;
			log(`Preview download failed for ${r.id}, keeping previous: ${(err as Error).message}`);
		}
	});

	const pending = stale.length - batch.length;
	log(
		`Previews: ${batch.length - failed} downloaded, ${failed} failed, ${pending} left for later runs`
	);
	return { bundle, downloaded: batch.length - failed, failed, pending };
}

export function applyPreviews(records: ExtensionRecord[], bundle: PreviewBundle): void {
	for (const r of records) {
		const swatch = bundle.themes[r.id] && swatchOf(bundle.themes[r.id].variants);
		if (swatch) r.swatch = swatch;
		if (bundle.icons[r.id]?.variants.some((v) => v.folder || v.files.some((f) => f.svg))) {
			r.iconPreview = true;
		}
	}
}
