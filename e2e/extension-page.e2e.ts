import { expect, test } from '@playwright/test';

// The theme preview (component + sample code, ~8 KB) loads only on theme and icon-theme pages.
// This comment is in the preview's sample code and survives minification as a string.
const SAMPLE = 'Load settings, retrying a few times';

test('extension pages without a preview load without its code', async ({ page }) => {
	const scripts: Promise<string>[] = [];
	page.on('response', (res) => {
		if (res.request().resourceType() === 'script') scripts.push(res.text().catch(() => ''));
	});
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	const bodies = await Promise.all(scripts);
	expect(bodies.some((body) => body.includes(SAMPLE))).toBe(false);
});

test('theme pages render the preview on the server', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/extensions/catppuccin');
	await expect(page.getByText(SAMPLE).first()).toBeVisible();
	await context.close();
});

test('icon theme pages render the icon preview on the server', async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/extensions/material-icon-theme');
	await expect(page.getByRole('region', { name: 'Icon theme preview' })).toBeVisible();
	await context.close();
});

test("a theme page's preview switches variants once loaded", async ({ page }) => {
	await page.goto('/extensions/catppuccin', { waitUntil: 'networkidle' });
	const latte = page.getByRole('button', { name: 'Catppuccin Latte', exact: true });
	await latte.click();
	await expect(latte).toHaveAttribute('aria-pressed', 'true');
});

test('client-side navigation to a theme page shows its preview', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.evaluate(() => {
		const link = document.createElement('a');
		link.href = '/extensions/catppuccin';
		link.textContent = 'go';
		link.id = 'go';
		document.body.append(link);
	});
	await page.click('#go');
	await expect(page).toHaveURL(/\/extensions\/catppuccin$/);
	await expect(page.getByText(SAMPLE).first()).toBeVisible();
});
