import { getCached } from './cache.js';
import type { ZedExtension, ZedExtensionResponse } from '$lib/types.js';

const ZED_API = 'https://api.zed.dev';
const ONE_HOUR = 60 * 60 * 1000;

export async function getAllExtensions(): Promise<ZedExtension[]> {
	return getCached('zed:all-extensions', ONE_HOUR, async () => {
		const res = await fetch(`${ZED_API}/extensions?max_schema_version=1`);
		if (!res.ok) return [];
		const data: ZedExtensionResponse = await res.json();
		return data.data ?? [];
	});
}

export async function getExtensionWithVersions(id: string): Promise<{
	extension: ZedExtension;
	versions: ZedExtension[];
} | null> {
	return getCached(`zed:ext:${id}`, ONE_HOUR, async () => {
		const res = await fetch(`${ZED_API}/extensions/${id}`);
		if (!res.ok) return null;

		const data: ZedExtensionResponse = await res.json();
		if (!data.data || data.data.length === 0) return null;

		// Sort by semver descending (newest first)
		const versions = data.data.sort((a, b) => {
			const pa = a.version.split('.').map(Number);
			const pb = b.version.split('.').map(Number);
			for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
				const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
				if (diff !== 0) return diff;
			}
			return 0;
		});
		const extension = versions[0];

		return { extension, versions };
	});
}
