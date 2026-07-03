import { expect, test, type Page } from '@playwright/test';

const ownerEmail = process.env.PLAYWRIGHT_OWNER_EMAIL ?? 'owner@demo.com';
const ownerPassword = process.env.PLAYWRIGHT_OWNER_PASSWORD ?? 'Owner123!';
const superadminEmail = process.env.PLAYWRIGHT_SUPERADMIN_EMAIL ?? 'superadmin@demo.com';
const superadminPassword = process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD ?? 'Superadmin123!';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder(/correo|email/i).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /entrar|iniciar/i }).click();
  await page.waitForURL(/\/(dashboard|pos|platform)/, { timeout: 20_000 });
}

test.describe('smoke', () => {
  test('owner puede entrar a dashboard y TPV', async ({ page }) => {
    await login(page, ownerEmail, ownerPassword);
    await expect(page).toHaveURL(/dashboard|pos/);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    await page.goto('/pos');
    await expect(page.getByRole('heading', { name: /carrito/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /buscar producto/i })).toBeVisible();
  });

  test('owner no puede acceder a platform', async ({ page }) => {
    await login(page, ownerEmail, ownerPassword);
    await page.goto('/platform');

    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard saas/i })).toHaveCount(0);
  });

  test('superadmin puede cargar platform', async ({ page }) => {
    await login(page, superadminEmail, superadminPassword);
    await page.goto('/platform');

    await expect(page.getByRole('heading', { name: 'Panel SaaS' })).toBeVisible();
  });
});
