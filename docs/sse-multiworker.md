# SSE Streaming con Múltiples Workers

## El problema

Lumen usa **Server-Sent Events (SSE)** para streaming de respuestas LLM en tiempo real.
Con múltiples workers (horizontal scaling), una reconexión SSE del cliente podría ser
enrutada a un worker diferente al que originó el stream, resultando en un stream perdido.

## Solución implementada: Event IDs + Retry

Cada evento SSE incluye:
- `id:` — identificador secuencial del evento (permite al browser trackear el último recibido)
- `retry: 3000` — sugerencia al browser de cuándo reconectar (3s)
- `Last-Event-ID` header — en reconexión, el browser envía el último ID recibido

El backend recibe `Last-Event-ID` pero **no reproduce** eventos anteriores (los tokens ya
fueron enviados y están en el buffer del browser). Solo registra el reconecto para
observabilidad.

```
# Formato del stream SSE
retry: 3000

id: 0
data: {"token": "El"}

id: 1
data: {"token": " protagonista"}

id: 42
data: {"done": true, "message_id": "uuid-..."}
```

## Sticky Sessions en Render

Para multi-worker con SSE, lo correcto es habilitar **sticky sessions** (session affinity)
en el load balancer. Esto garantiza que todas las requests de un mismo cliente vayan al
mismo worker durante la duración de la conexión SSE.

### Cómo activarlo en Render

1. Dashboard → tu servicio web → **Settings**
2. En la sección "Advanced": activar **Session Affinity**
3. Render usará una cookie `render-affinity` para mantener la afinidad

> Nota: Session affinity en Render está disponible en el plan **Standard** y superiores.

### Alternativa: Redis Pub/Sub

Si sticky sessions no es viable (multi-región, provider sin soporte), la arquitectura
correcta es:

```
Client → Any Worker → Redis Channel → Stream to Client
```

Cada worker publica tokens al canal Redis de la sesión. El worker que tiene la conexión
SSE del cliente se suscribe y retransmite. Requiere:
- `redis-py[asyncio]` o `anyio-redis`
- Canal por sesión: `sse:session:{session_id}`
- TTL de 5 minutos en el canal

Esta implementación está marcada como roadmap post-v1.

## Observabilidad

El stream endpoint loguea `session_id` en errores. Para monitorear reconexiones:

```python
# En send_message_stream
last_event_id = request.headers.get("Last-Event-ID")
if last_event_id:
    logger.info("sse_reconnect session_id=%s last_event_id=%s", session_id, last_event_id)
```

## Configuración actual

- Workers en Render: 1 (no hay problema de multi-worker aún)
- Cuando escales a 2+ workers: activar sticky sessions antes de hacerlo
- Alternativa sin sticky: implementar Redis Pub/Sub (ver arriba)
