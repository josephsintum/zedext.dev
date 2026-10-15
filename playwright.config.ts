import { defineConfig, devices } from '@playwright/test';

/**
 * Browser checks for layout and interaction bugs that unit tests can't see (sideways scroll,
 * squashed circles, carousel clicks). They run against the dev server, which reads the
 * production snapshot (SNAPSHOT_URL in .env), so they need the network.
 */
export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4319' },
	webServer: {
		command: 'bunx vite dev --port 4319 --strictPort',
		url: 'http://localhost:4319',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
