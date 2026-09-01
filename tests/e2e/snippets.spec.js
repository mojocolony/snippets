import { test, expect } from '@playwright/test';

test('opens directly to a blank capture editor with a bottom control strip', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('editor-screen')).toBeVisible();
  await expect(page.getByTestId('editor-input')).toBeVisible();
  await expect(page.getByTestId('control-strip')).toBeVisible();
  await expect(page.getByTestId('editor-input')).toHaveText('');
});
