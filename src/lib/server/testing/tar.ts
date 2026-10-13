import { gzipSync } from 'node:zlib';

/** Test-only: build a .tar.gz in memory (ustar headers; checksum not needed by our reader). */
export function tarGz(
	files: Record<string, string | Uint8Array>,
	{ longNames = false }: { longNames?: boolean } = {}
): Uint8Array<ArrayBuffer> {
	const enc = new TextEncoder();
	const blocks: Uint8Array[] = [];
	const header = (name: string, size: number, type: string) => {
		const h = new Uint8Array(512);
		h.set(enc.encode(name.slice(0, 100)), 0);
		h.set(enc.encode(size.toString(8).padStart(11, '0') + '\0'), 124);
		h[156] = type.charCodeAt(0);
		h.set(enc.encode('ustar\0'), 257);
		return h;
	};
	const pad = (n: number) => new Uint8Array((512 - (n % 512)) % 512);

	blocks.push(header('./', 0, '5')); // a directory entry, which readers must skip
	for (const [name, content] of Object.entries(files)) {
		const body = typeof content === 'string' ? enc.encode(content) : content;
		if (longNames && name.length > 100) {
			const longName = enc.encode(name + '\0');
			blocks.push(header('././@LongLink', longName.length, 'L'), longName, pad(longName.length));
		}
		blocks.push(header(name, body.length, '0'), body, pad(body.length));
	}
	blocks.push(new Uint8Array(1024)); // end-of-archive marker
	return gzipSync(Buffer.concat(blocks));
}
