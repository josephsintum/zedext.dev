export function formatNumber(num: number): string {
	if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
	if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
	return num.toString();
}

export function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function timeAgo(dateStr: string): string {
	const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
	const intervals = [
		{ label: 'year', seconds: 31_536_000 },
		{ label: 'month', seconds: 2_592_000 },
		{ label: 'week', seconds: 604_800 },
		{ label: 'day', seconds: 86_400 },
		{ label: 'hour', seconds: 3_600 },
		{ label: 'minute', seconds: 60 }
	];
	for (const { label, seconds: s } of intervals) {
		const count = Math.floor(seconds / s);
		if (count >= 1) return `${count} ${label}${count > 1 ? 's' : ''} ago`;
	}
	return 'just now';
}
