import { getCached } from './cache.js';
import type { ZedExtension, ZedExtensionResponse } from '$lib/types.js';

const ZED_API = 'https://api.zed.dev';
const ONE_HOUR = 60 * 60 * 1000;

export async function getExtensionWithVersions(id: string): Promise<{
	extension: ZedExtension;
	versions: ZedExtension[];
} | null> {
	return getCached(`zed:ext:${id}`, ONE_HOUR, async () => {
		const res = await fetch(`${ZED_API}/extensions/${id}`);
		if (!res.ok) return null;

		const data: ZedExtensionResponse = await res.json();
		if (!data.data || data.data.length === 0) return null;

		// Versions are returned newest first
		const versions = data.data;
		const extension = versions[0];

		return { extension, versions };
	});
}
