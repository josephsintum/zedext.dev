/**
 * Copy text, reporting whether it worked. The clipboard is missing over plain HTTP and
 * often blocked in in-app browsers; callers show "copied" only on true.
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
