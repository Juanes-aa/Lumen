# Lumen — Runbook de incidentes

> Referencia operativa para el equipo. Cada sección describe síntomas, diagnóstico y pasos de resolución.
> Actualizar tras cada incidente real.

---

## Índice

1. [Render caído](#1-render-caído)
2. [Supabase inaccesible](#2-supabase-inaccesible)
3. [Groq API down](#3-groq-api-down)
4. [Job stuck en background_jobs](#4-job-stuck-en-background_jobs)
5. [Usuario reporta que no puede acceder](#5-usuario-reporta-que-no-puede-acceder)
6. [Rollback de deploy](#6-rollback-de-deploy)
7. [Recuperar sesión borrada por soft delete](#7-recuperar-sesión-borrada-por-soft-delete)

---

## 1. Render caído

### Síntomas
- El frontend muestra errores de red en todas las llamadas al backend.
- `GET /health` no responde o devuelve 5xx.
- Sentry recibe múltiples alertas de tipo `NetworkError` o `fetch failed`.

### Verificar status
1. Ir a **https://status.render.com** — comprobar si hay incidente activo.
2. En el dashboard de Render → **lumen-backend** → pestaña **Logs**: buscar el último error.
3. En la pestaña **Events**: ver si hubo deploy reciente o restart inesperado.

### Forzar redeploy
```bash
# Desde la CLI de Render (o desde el dashboard: botón "Manual Deploy")
render deploys create --service-id <SERVICE_ID> --clear-cache
```
O desde el dashboard: **Settings → Deploy → Manual Deploy → Deploy latest commit**.

### Escalar (si el proceso se cuelga bajo carga)
- En Render Free/Starter: el proceso hiberna tras inactividad. Actualizar a plan **Standard** para evitar cold starts.
- Si el problema es de memoria: revisar en **Metrics** el uso de RAM. El servicio corre con 1 worker (Uvicorn); si supera ~450 MB en Free tier, Render lo mata.

### Escalación
- Si el incidente es de Render: abrir ticket en **https://render.com/support**.
- Tiempo de resolución típico para incidentes de plataforma: 15–60 min.

---

## 2. Supabase inaccesible

### Síntomas
- El backend devuelve 500 en endpoints que tocan DB.
- Logs muestran `ConnectionError` o timeouts hacia `*.supabase.co`.
- El endpoint `/health` responde 200 (no toca DB), pero `/auth/refresh` falla.

### Verificar status
1. **https://status.supabase.com** — verificar si hay incidente activo en la región del proyecto.
2. En Supabase Dashboard → **Settings → Database** → comprobar que el proyecto no esté pausado (proyectos en Free tier se pausan tras 1 semana de inactividad).

### Verificar conexión manualmente
```bash
# Desde cualquier terminal con curl
curl -s "https://<PROJECT_REF>.supabase.co/rest/v1/" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
# Respuesta esperada: {} o lista de tablas
```

### Endpoints que fallan vs. los que aguantan
| Endpoint | Depende de Supabase | Comportamiento si cae |
|---|---|---|
| `GET /health` | No | Sigue respondiendo 200 |
| `POST /auth/login` | Sí (GoTrue) | 500 |
| `POST /auth/refresh` | Sí (GoTrue) | 500 → frontend pierde sesión |
| `GET /analysis/sessions` | Sí (PostgREST) | 500 |
| Streaming SSE | Sí (PostgREST al persistir) | El stream falla al guardar |

### Reactivar proyecto pausado
En Supabase Dashboard → **Settings → General → Restore project**.  
El proceso tarda ~2 minutos. Tras restaurar, el primer request puede tardar 5–10 s (cold start de PostgreSQL).

### Si el incidente es de Supabase
- Abrir ticket en **https://supabase.com/support**.
- Monitorear **https://status.supabase.com** para actualizaciones.

---

## 3. Groq API down

### Síntomas
- Los usuarios reciben el mensaje "El modelo tardó demasiado en responder" o "Error generando respuesta".
- En Sentry: múltiples errores `HTTPException 502` originados en `llm.py → complete()` o `stream()`.
- El resto del app funciona (login, biblioteca, historial).

### Detectar en Sentry
Buscar en Sentry:
- `send_message_stream_timeout` — timeout de 60 s en streaming.
- `HTTPException` con `status_code=502` y `detail` que contenga "modelo".
- Errores en `groq._base_client` o `httpx`.

### Verificar Groq status
**https://status.groq.com** — comprobar incidentes activos.

### Mensaje que ven los usuarios
En el endpoint de streaming, el frontend recibirá:
```json
{"error": "El modelo tardó demasiado en responder"}
```
o
```json
{"error": "Error generando respuesta"}
```
Los usuarios no ven un crash, sino un mensaje de error inline en el chat.

### Deshabilitar el feature temporalmente
Si el incidente se prolonga, se puede devolver un error claro a todos los usuarios:

```python
# backend/app/providers/llm.py — añadir al inicio de complete() y stream()
raise HTTPException(
    status_code=503,
    detail="El análisis con IA no está disponible temporalmente. Inténtalo en unos minutos.",
)
```

Hacer deploy de este cambio y revertirlo cuando Groq se recupere.

### Escalación
- Abrir ticket en Groq si el incidente supera 30 min sin comunicado en su status page.

---

## 4. Job stuck en background_jobs

### Síntomas
- Un job lleva más tiempo del esperado en estado `running`.
- El usuario cerró una sesión pero los tags semánticos no aparecieron.
- En Sentry: no hay error reciente asociado al `session_id`.

### Consultar jobs stuck
```sql
-- Jobs en estado 'running' hace más de 10 minutos
SELECT id, job_type, payload, status, started_at,
       EXTRACT(EPOCH FROM (now() - started_at)) / 60 AS minutes_running
FROM background_jobs
WHERE status = 'running'
  AND started_at < now() - INTERVAL '10 minutes'
ORDER BY started_at ASC;
```

### Consultar jobs fallidos recientes
```sql
SELECT id, job_type, payload->>'session_id' AS session_id,
       status, error, retry_count, completed_at
FROM background_jobs
WHERE status = 'failed'
ORDER BY completed_at DESC
LIMIT 20;
```

### Limpiar jobs stuck manualmente
```sql
-- Marcar como failed para auditoría (el startup handler ya hace esto automáticamente)
UPDATE background_jobs
SET status = 'failed',
    completed_at = now(),
    error = 'manually_reclaimed',
    retry_count = retry_count + 1
WHERE status = 'running'
  AND started_at < now() - INTERVAL '10 minutes';
```

### Reintentar un job fallido
Los jobs de `extract_semantic_tags` no se reintentan automáticamente.
Para forzar el reintento: cerrar la sesión de nuevo desde el dashboard del usuario
(si la sesión ya está cerrada, esto no es posible directamente).

Alternativa: ejecutar el script de extracción manualmente con el `session_id` del payload.

---

## 5. Usuario reporta que no puede acceder

### Checklist de diagnóstico

**Paso 1 — ¿El servicio está en pie?**
- `GET https://api.lumen.app/health` → debe devolver `{"status": "ok"}`.
- Si no responde: ver sección [Render caído](#1-render-caído).

**Paso 2 — ¿El usuario puede llegar al login?**
- Pedir al usuario que abra `https://lumen.app/login`.
- Si no carga el frontend: ver estado de Vercel en **https://www.vercel-status.com**.

**Paso 3 — ¿El login devuelve error?**

| Error que ve el usuario | Causa probable | Acción |
|---|---|---|
| "Credenciales incorrectas" | Password mal / email incorrecto | Usar recuperación de contraseña |
| "Debes verificar tu email" | Email no confirmado | Reenviar verificación desde `/verify-email` |
| "Algo falló" genérico | Backend/Supabase caído | Ver logs en Render |
| Pantalla en blanco | Error JS en frontend | Ver consola del navegador |

**Paso 4 — ¿El usuario está en la app pero ve errores?**
- Pedir al usuario que abra DevTools → Network y comparta el código de respuesta del endpoint que falla.
- Buscar el `request_id` del header de respuesta para correlacionar con los logs de Render.

**Paso 5 — Verificar usuario en Supabase**
```sql
-- Buscar usuario por email
SELECT id, email, email_confirmed_at, last_sign_in_at, banned_until
FROM auth.users
WHERE email = 'usuario@ejemplo.com';
```
- `email_confirmed_at IS NULL` → no ha verificado el email.
- `banned_until IS NOT NULL` → cuenta suspendida.

---

## 6. Rollback de deploy

### Cuándo hacer rollback
- El deploy nuevo introduce regresiones detectadas en las primeras horas.
- Las métricas de error en Sentry aumentan drásticamente tras el deploy.
- Un endpoint crítico (login, mensajes) empieza a devolver 5xx de forma sistemática.

### Pasos en Render
1. Render Dashboard → **lumen-backend** → pestaña **Deploys**.
2. Localizar el deploy anterior (estado `Live` antes del problemático).
3. Click en los tres puntos → **Rollback to this deploy**.
4. Confirmar. El proceso tarda ~2 minutos.

### Verificar tras el rollback
```bash
curl https://api.lumen.app/health
# Esperado: {"status": "ok"}

# Comprobar la versión desplegada (si hay endpoint de versión)
curl https://api.lumen.app/version
```

### Rollback del frontend (Vercel)
1. Vercel Dashboard → **lumen** → pestaña **Deployments**.
2. Localizar el deployment anterior.
3. Click en los tres puntos → **Promote to Production**.

### Nota sobre migraciones de base de datos
Si el deploy problemático incluía una migración de DB, el rollback del código
**no revierte la migración**. Evaluar si es necesario revertir la migración manualmente
antes de hacer rollback del código.

---

## 7. Recuperar sesión borrada por soft delete

Las sesiones eliminadas por el usuario se marcan con `deleted_at` (soft delete).
Los datos siguen en la base de datos y pueden recuperarse.

### Identificar la sesión
```sql
-- Sesiones soft-deleted del usuario (las últimas 10)
SELECT id, movie_id, status, started_at, closed_at, deleted_at
FROM analysis_sessions
WHERE user_id = '<USER_ID>'
  AND deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;
```

### Restaurar la sesión
```sql
-- Revertir el soft delete (restaurar la sesión)
UPDATE analysis_sessions
SET deleted_at = NULL
WHERE id = '<SESSION_ID>'
  AND user_id = '<USER_ID>';
```

### Verificar que los datos están intactos
```sql
-- Mensajes de la sesión
SELECT role, LEFT(content, 100) AS preview, created_at
FROM analysis_messages
WHERE session_id = '<SESSION_ID>'
ORDER BY created_at ASC;

-- Tags semánticos
SELECT tag_type, tag_value
FROM semantic_tags
WHERE session_id = '<SESSION_ID>';
```

### Nota
Los mensajes y tags no tienen soft delete propio — solo se borran si la sesión
es eliminada con un hard delete (que actualmente no existe en el código).
Una vez restaurado `deleted_at = NULL`, la sesión vuelve a aparecer en la app.

---

*Última revisión: Mayo 2025. Actualizar tras cada incidente con las lecciones aprendidas.*
