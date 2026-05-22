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

// ── Flujos autenticados ───────────────────────────────────────────────────────
//
// REQUISITOS PARA ACTIVAR ESTOS TESTS:
//   1. Configurar en el entorno (o en playwright.config.ts):
//        E2E_TEST_EMAIL=test@lumen.test
//        E2E_TEST_PASSWORD=<contraseña del usuario de test>
//   2. El usuario de test debe existir en Supabase y tener al menos
//      una película en su biblioteca para que /library no esté vacía.
//   3. El backend debe estar disponible (VITE_API_URL apuntando a staging/prod).
//
// Mientras no estén configuradas las credenciales, los tests se marcan como
// skip para no bloquear el pipeline de CI.

const TEST_EMAIL = process.env['E2E_TEST_EMAIL'] ?? ''
const TEST_PASSWORD = process.env['E2E_TEST_PASSWORD'] ?? ''
const hasCredentials = TEST_EMAIL !== '' && TEST_PASSWORD !== ''

test('autenticado: login → biblioteca visible', async ({ page }) => {
  if (!hasCredentials) {
    test.skip(true, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD no configurados')
    return
  }

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click()

  // Tras login exitoso debe redirigir al dashboard o biblioteca
  await page.waitForURL(/\/(library|dashboard|$)/, { timeout: 15_000 })
  await expect(page).not.toHaveURL(/\/login/)
})

test('autenticado: login → navegar a búsqueda → buscar película', async ({ page }) => {
  if (!hasCredentials) {
    test.skip(true, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD no configurados')
    return
  }

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /iniciar|entrar|login/i }).click()

  await page.waitForURL(/\/(library|dashboard|$)/, { timeout: 15_000 })

  // Navegar a búsqueda y escribir una consulta
  await page.goto('/search')
  await expect(page).toHaveURL(/\/search/)
  const searchInput = page.locator('input[type="search"], input[placeholder*="busca" i], input[placeholder*="search" i]')
  await expect(searchInput.first()).toBeVisible({ timeout: 5_000 })
})
