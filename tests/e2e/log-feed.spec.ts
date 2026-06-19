import { test, expect } from '@playwright/test'

// Requires a seeded user in env: E2E_EMAIL, E2E_PASSWORD.
test('log a breast feed end-to-end', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type=email]', process.env.E2E_EMAIL!)
  await page.fill('input[type=password]', process.env.E2E_PASSWORD!)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('/')

  await page.click('button:has-text("Feed")')
  await page.click('button:has-text("Breast")')
  await page.click('button:has-text("Left")')

  await expect(page.locator('text=Feed — left breast')).toBeVisible()
})
