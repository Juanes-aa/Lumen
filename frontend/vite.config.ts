import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Sentry: sube source maps en build de producción.
    // Solo activo si SENTRY_AUTH_TOKEN está disponible (CI/CD).
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
              filesToDeleteAfterUpload: ['dist/**/*.map'],
            },
          }),
        ]
      : []),
  ],
  build: {
    // Source maps necesarios para que Sentry muestre stack traces legibles.
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
})
