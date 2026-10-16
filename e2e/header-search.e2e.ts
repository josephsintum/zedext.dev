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
