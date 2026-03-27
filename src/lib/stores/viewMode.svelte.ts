import { browser } from '$app/environment';

export type ViewMode = 'grid' | 'list';

function getInitialViewMode(): ViewMode {
	if (!browser) return 'grid';
	const stored = localStorage.getItem('viewMode');
	if (stored === 'grid' || stored === 'list') return stored;
	return 'grid';
}

let viewMode = $state<ViewMode>(getInitialViewMode());

export function setViewMode(mode: ViewMode) {
	viewMode = mode;
	if (browser) localStorage.setItem('viewMode', mode);
}

export function getViewMode(): ViewMode {
	return viewMode;
}
