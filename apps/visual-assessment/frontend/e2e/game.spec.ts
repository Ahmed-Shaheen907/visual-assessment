import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/game');
  // wait for map canvas to be present
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
});

test('page loads and shows 6 answer cards', async ({ page }) => {
  const btn = page.locator('[data-testid="done-button"]');
  await expect(btn).toBeVisible();

  // 6 draggable answer labels visible (dnd-kit renders them as role=button)
  await expect(page.getByRole('button', { name: 'Marsa Matrouh' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sidi Heneish' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ras Al Hekma' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'El Dabaa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sidi Abdel Rahman' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Alamein' })).toBeVisible();
});

test('map renders with Leaflet container', async ({ page }) => {
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
});

test('submit button is disabled on load (no pins filled)', async ({ page }) => {
  const btn = page.getByTestId('done-button');
  await expect(btn).toBeVisible();
  await expect(btn).toBeDisabled();
  // button text shows placed count before any placement
  await expect(btn).toHaveText('0/6 Placed');
});

test('placed count and progress start at 0', async ({ page }) => {
  // Progress percentage shows 0%
  await expect(page.getByText('0%')).toBeVisible();
  // Progress section label
  await expect(page.getByText('Progress')).toBeVisible();
});
