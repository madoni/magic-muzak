import { expect, test } from '@playwright/test';

test('keyboard and pointer drive the generator without errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`);
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  const body = page.locator('body');
  const hint = page.locator('#hint');
  await expect(body).toHaveAttribute('data-state', 'idle');
  await expect(hint).toHaveText('Press Space to begin');

  await page.keyboard.press('Space');
  await expect(body).toHaveAttribute('data-state', 'running');
  await expect(hint).toBeHidden();

  await page.mouse.move(50, 400);
  await page.mouse.move(900, 100, { steps: 30 });

  await page.keyboard.press('KeyM');
  await expect(body).toHaveAttribute('data-muted', 'true');
  await expect(hint).toHaveText('Muted');
  await page.keyboard.press('KeyM');
  await expect(body).toHaveAttribute('data-muted', 'false');

  await page.keyboard.press('ArrowUp');
  await expect(body).toHaveAttribute('data-tempo', '95');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(body).toHaveAttribute('data-tempo', '85');

  await page.keyboard.press('Digit2');
  await expect(hint).toHaveText(/not available yet/);
  await expect(body).toHaveAttribute('data-engine', '1');

  await page.keyboard.press('Space');
  await expect(body).toHaveAttribute('data-state', 'stopped');
  await page.keyboard.press('Space');
  await expect(body).toHaveAttribute('data-state', 'running');
  await expect(body).not.toHaveAttribute('data-trip', /.+/);

  expect(errors).toEqual([]);
});

test('Space and arrows do not scroll the page', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
