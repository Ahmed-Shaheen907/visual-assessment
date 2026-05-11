import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/game');
  // wait for map canvas to be present
  await page.waitForSelector('.leaflet-container', { timeout: 10000 });
});

test('page loads and shows 6 answer cards', async ({ page }) => {
  const cards = page.locator('[data-testid="done-button"]');
  await expect(cards).toBeVisible();

  // 6 draggable answer labels visible
  await expect(page.getByText('Marsa Matrouh')).toBeVisible();
  await expect(page.getByText('Sidi Heneish')).toBeVisible();
  await expect(page.getByText('Ras Al Hekma')).toBeVisible();
  await expect(page.getByText('El Dabaa')).toBeVisible();
  await expect(page.getByText('Sidi Abdel Rahman')).toBeVisible();
  await expect(page.getByText('New Alamein')).toBeVisible();
});

test('map renders with Leaflet container', async ({ page }) => {
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
});

test('done button is disabled on load', async ({ page }) => {
  const btn = page.getByTestId('done-button');
  await expect(btn).toBeVisible();
  await expect(btn).toBeDisabled();
});

test('score shows 0/6 on load', async ({ page }) => {
  await expect(page.getByText('0')).toBeVisible();
  // Progress label shows 0%
  await expect(page.getByText('0%')).toBeVisible();
});
