# Lumen

Plataforma de análisis cinematográfico con IA. Los usuarios agregan películas a su biblioteca, inician sesiones de análisis con un LLM experto (Groq/LLaMA 3.3), y el sistema construye un perfil semántico del espectador a lo largo del tiempo.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Estado | Zustand + React Query v5 |
| Router | React Router v7 (lazy loading) |
| Backend | FastAPI (Python 3.11+) |
| Auth | Supabase Auth (JWT ES256 + HttpOnly cookie) |
| Base de datos | Supabase PostgreSQL (RLS habilitado en todas las tablas) |
| LLM | Groq API (LLaMA 3.3) |
| Datos de películas | TMDB (proxy por backend) |
| Deploy frontend | Vercel |
| Deploy backend | Render |

## Arquitectura

```
Browser (React SPA)
    │
    │  HTTPS + Bearer JWT
    ▼
Render — FastAPI
    ├── /auth/*          Auth (registro, login, refresh, logout)
    ├── /movies/*        Biblioteca de películas
    ├── /analysis/*      Sesiones de análisis (SSE streaming)
    ├── /profile/*       Perfil semántico y preferencias
    ├── /recommendations Recomendaciones IA
    ├── /tmdb/*          Proxy TMDB (API key server-side)
    └── /export/*        Exportación de datos de usuario
    │
    │  RLS + JWT
    ▼
Supabase (PostgreSQL + Auth)
    │
    ▼
Groq API (LLM) + TMDB API
```

## URLs de producción

| Servicio | URL |
|---|---|
| Frontend | https://cinethink.vercel.app |
| Backend | https://cinethink.onrender.com |

> Los slugs de deploy en Vercel y Render conservan el nombre `cinethink` hasta que sean renombrados en sus respectivos dashboards. El nombre del producto y todos los identificadores internos son `Lumen`.

## Requisitos locales

- Node.js 20+
- Python 3.11+
- Cuenta en Supabase (proyecto con tablas migradas)
- API key de Groq
- API key de TMDB

## Setup local

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Editar .env con tus credenciales reales
```

Variables requeridas en `backend/.env`:

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key (pública, respeta RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo para Auth Admin) |
| `GROQ_API_KEY` | API key de Groq |
| `TMDB_API_KEY` | API key de TMDB |
| `CORS_ORIGINS` | Orígenes permitidos (comma-separated) |
| `COOKIE_SECURE` | `false` en dev, `true` en producción |
| `COOKIE_SAMESITE` | `lax` en dev, `none` en producción cross-domain |

```bash
uvicorn main:app --reload
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env
# Editar VITE_API_URL si el backend no corre en el puerto 8000
```

Variable requerida en `frontend/.env`:

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL del backend (ej. `http://localhost:8000`) |

```bash
npm run dev
# App disponible en http://localhost:5173
```

## Comandos útiles

### Frontend

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # ESLint
npm run format       # Prettier (escribe cambios)
npm run format:check # Prettier (solo verifica, sin escribir)
```

### Backend

```bash
uvicorn main:app --reload   # Servidor de desarrollo
pytest                      # Suite de tests (80+ tests)
ruff check .                # Linter
ruff format .               # Formatter
```

## Tests

El backend tiene cobertura de tests para todos los flujos críticos:

```bash
cd backend
pytest -v
```

Módulos cubiertos: auth, analysis, messages, movies, profile, export, error handling, JWT/config.

El frontend no tiene tests automatizados actualmente (deuda técnica priorizada).

## Base de datos

Las migraciones viven en `backend/migrations/`. Para aplicar en un proyecto Supabase nuevo:

1. Ejecutar `000_current_schema_snapshot.sql` para la estructura base.
2. Aplicar migraciones `001` → `009` en orden.

Todas las tablas tienen RLS habilitado. Los datos de un usuario nunca son accesibles por otro usuario, incluso con acceso directo a la base de datos.

## Notas de producción

Ver `progress.txt` para el detalle de decisiones de hardening, TODOs pendientes y variables que configurar en Render para producción.
