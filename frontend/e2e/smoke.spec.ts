/**
 * Smoke tests — verifican que las páginas críticas renderizan correctamente
 * y que las rutas protegidas redirigen a /login cuando no hay sesión activa.
 *
 * No requieren backend real: el cliente intenta el refresh del token, falla
 * en silencio (sin credenciales), y React Router redirige al login.
 */

import { test, expect } from '@playwright/test'

// ── Páginas públicas ──────────────────────────────────────────────────────────

test('login: renderiza el formulario de inicio de sesión', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: /iniciar sesión|lumen/i })).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /iniciar|entrar|login/i })).toBeVisible()
})

test('register: renderiza el formulario de registro', async ({ page }) => {
  await page.goto('/register')
  await expect(page).toHaveURL(/\/register/)
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /registrar|crear|sign up/i })).toBeVisible()
})

// ── Rutas protegidas (sin sesión → redirigen a /login) ───────────────────────

test('dashboard (/): redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/')
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})

test('library: redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/library')
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})

test('search: redirige a /login sin sesión', async ({ page }) => {
  await page.goto('/search')
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})
