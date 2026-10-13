import { gunzipSync } from 'node:zlib';

const decoder = new TextDecoder();
/** Real archives decompress to under ~10 MB (the largest icon themes); this caps a malicious one. */
const MAX_TAR_BYTES = 64 * 1024 * 1024;

/**
 * Regular files in a .tar.gz, keyed by path without a leading "./". Handles ustar names
 * (with prefix) and GNU long names, which is all Zed's extension archives use.
 */
export function readTarGz(
	data: Uint8Array,
	{ maxBytes = MAX_TAR_BYTES }: { maxBytes?: number } = {}
): Map<string, Uint8Array> {
	// Throws past maxBytes instead of inflating an archive bomb into memory
	const tar = gunzipSync(data, { maxOutputLength: maxBytes });
	const files = new Map<string, Uint8Array>();
	let offset = 0;
	let longName: string | null = null;

	while (offset + 512 <= tar.length) {
		const header = tar.subarray(offset, offset + 512);
		if (header.every((b) => b === 0)) break; // end-of-archive marker
		const field = (start: number, length: number) => {
			const raw = header.subarray(start, start + length);
			const end = raw.indexOf(0);
			return decoder.decode(end === -1 ? raw : raw.subarray(0, end));
		};

		const size = parseInt(field(124, 12).trim() || '0', 8);
		// A negative or garbage size would stop the offset advancing and loop forever
		if (!Number.isFinite(size) || size < 0) throw new Error('Corrupt tar header');
		const type = field(156, 1);
		const body = tar.subarray(offset + 512, offset + 512 + size);
		offset += 512 + Math.ceil(size / 512) * 512;

		if (type === 'L') {
			longName = decoder.decode(body).replace(/\0+$/, '');
			continue;
		}
		const prefix = field(345, 155);
		const name = longName ?? (prefix ? `${prefix}/${field(0, 100)}` : field(0, 100));
		longName = null;
		// '0' and '\0' (read as '') are regular files; directories, links etc. are skipped
		if (type === '0' || type === '') files.set(name.replace(/^\.\//, ''), body);
	}
	return files;
}
