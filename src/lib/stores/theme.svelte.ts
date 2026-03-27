import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
	if (!browser) return 'light';
	const stored = localStorage.getItem('theme');
	if (stored === 'dark' || stored === 'light') return stored;
	return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let theme = $state<Theme>(getInitialTheme());

function applyTheme(t: Theme) {
	if (!browser) return;
	const root = document.documentElement;
	if (t === 'dark') {
		root.classList.add('dark');
		root.style.colorScheme = 'dark';
	} else {
		root.classList.remove('dark');
		root.style.colorScheme = 'light';
	}
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute('content', t === 'dark' ? '#111216' : '#fafaf9');
	localStorage.setItem('theme', t);
}

export function toggleTheme() {
	theme = theme === 'dark' ? 'light' : 'dark';
	applyTheme(theme);
}

export function getTheme(): Theme {
	return theme;
}
