import { expect, test, type Page } from '@playwright/test';

const pageSearchBox = (page: Page) => page.getByRole('searchbox', { name: 'Search extensions' });

// Pages with their own search box: the shortcuts focus it (the window never opens there)
for (const path of ['/', '/extensions']) {
	test(`⌘K and / focus the search box on ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await page.keyboard.press('ControlOrMeta+k');
		await expect(pageSearchBox(page)).toBeFocused();
		await pageSearchBox(page).blur();
		await page.keyboard.press('/');
		await expect(pageSearchBox(page)).toBeFocused();
		await expect(pageSearchBox(page)).toHaveValue(''); // the "/" wasn't typed into it
	});
}

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search extensions' });
const field = (page: Page) => dialog(page).getByRole('combobox', { name: 'Search extensions' });
const headerButton = (page: Page) => page.getByRole('button', { name: /^Search extensions/ });
const scrollLocked = (page: Page) =>
	page.evaluate(() => document.documentElement.style.overflow === 'hidden');

test('⌘K opens the window, and Enter opens the top match', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeVisible();
	expect(await scrollLocked(page)).toBe(true);
	await field(page).fill('catppuccin');
	const first = dialog(page).getByRole('option').first();
	await expect(first).toHaveAttribute('aria-selected', 'true');
	await expect(first).toContainText('Catppuccin');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\/catppuccin$/);
	await expect(dialog(page)).toBeHidden();
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('the last row hands off to the full results page', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await headerButton(page).click();
	await field(page).fill('python');
	await expect(dialog(page).getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('ArrowUp'); // wraps from the first row to the last
	const seeAll = dialog(page).getByRole('option', { name: /^See all \d+ results for “python”/ });
	await expect(seeAll).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\?q=python$/);
});

test('Esc closes the window and focus goes back to the header button', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await headerButton(page).click();
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();
	await expect(headerButton(page)).toBeFocused();
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('⌘K again closes the window', async ({ page }) => {
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page)).toBeHidden();
});

test('the empty window lists recently viewed extensions, newest first', async ({ page }) => {
	await page.goto('/extensions/oxc', { waitUntil: 'networkidle' });
	await page.goto('/extensions/java', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await expect(dialog(page).getByText('Recently viewed')).toBeVisible();
	const options = dialog(page).getByRole('option');
	await expect(options).toHaveCount(2);
	await expect(options.nth(0)).toContainText('Java');
	await expect(options.nth(1)).toContainText('Oxc');
	await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
});

test('choosing the extension you are on just closes the window', async ({ page }) => {
	await page.goto('/extensions/catppuccin', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('catppuccin');
	await expect(dialog(page).getByRole('option').first()).toContainText('Catppuccin');
	await page.keyboard.press('Enter');
	await expect(dialog(page)).toBeHidden();
	await expect(page).toHaveURL(/\/extensions\/catppuccin$/);
	// The dialog fires `close` (which unlocks) a moment after it hides
	await expect.poll(() => scrollLocked(page)).toBe(false);
});

test('pages with their own search box have no header button', async ({ page }) => {
	for (const path of ['/', '/extensions', '/languages']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(headerButton(page)).toHaveCount(0);
	}
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await expect(headerButton(page)).toHaveCount(1);
});

test('/ typed into another field stays text', async ({ page }) => {
	await page.goto('/themes', { waitUntil: 'networkidle' });
	const filter = page.getByLabel('Filter themes');
	await filter.click();
	await page.keyboard.type('a/b');
	await expect(filter).toHaveValue('a/b');
	await expect(dialog(page)).toBeHidden();
	await filter.blur();
	await page.keyboard.press('/');
	await expect(dialog(page)).toBeVisible();
});

test('when the search index fails, the window links to the full results page', async ({ page }) => {
	await page.route('**/extensions.json*', (route) => route.fulfill({ status: 500, body: 'down' }));
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).getByText("Search couldn't load.")).toBeVisible();
	const link = dialog(page).getByRole('link', { name: 'See all results for “rust”' });
	await expect(link).toHaveAttribute('href', '/extensions?q=rust');
});

test('Enter before the index loads goes to the full results page', async ({ page }) => {
	await page.route('**/extensions.json*', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 10_000));
		await route.continue().catch(() => {}); // the page has moved on by then
	});
	await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
	await page.keyboard.press('ControlOrMeta+k');
	await field(page).fill('rust');
	await expect(dialog(page).getByText('Searching…')).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/extensions\?q=rust$/);
});

test.describe('on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the magnifier opens a full-screen window that Cancel closes', async ({ page }) => {
		await page.goto('/extensions/git-firefly', { waitUntil: 'networkidle' });
		await page.getByRole('button', { name: 'Search extensions', exact: true }).click();
		const box = await dialog(page).boundingBox();
		expect(box && Math.round(box.width)).toBe(390);
		expect(box && Math.round(box.height)).toBe(844);
		await dialog(page).getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog(page)).toBeHidden();
	});
});
