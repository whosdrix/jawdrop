import { test as base, expect } from '@playwright/test'
import { slugs } from '../unit/helpers.ts'

const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await use(errors)
  },
})

test('every effect has a live card in the gallery', async ({ page, errors }) => {
  await page.goto('/')
  for (const slug of slugs) {
    const card = page.locator(`[data-effect="${slug}"]`).first()
    await card.scrollIntoViewIfNeeded()
    await expect(card).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('there is no horizontal scroll', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

for (const slug of slugs) {
  test(`detail page for ${slug} mounts without errors`, async ({ page, errors }) => {
    await page.goto(`/#/${slug}`)
    const detail = page.locator('[data-detail]')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(`npx jawdrop add ${slug}`)
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })
}

test('the reduced motion toggle switches the page into reduced motion', async ({
  page,
  errors,
}) => {
  await page.goto('/')
  const toggle = page.locator('[data-motion-toggle]').first()
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', /reduce|full/)
  expect(errors).toEqual([])
})
