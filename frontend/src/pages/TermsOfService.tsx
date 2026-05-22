import { Link } from 'react-router-dom'
import LumenSymbol from '../components/LumenSymbol'

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        className="font-serif text-celuloide"
        style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 10 }}
      >
        {title}
      </h2>
      <div
        className="font-sans"
        style={{ fontSize: 14, color: 'rgba(250,249,246,0.65)', lineHeight: 1.75 }}
      >
        {children}
      </div>
    </section>
  )
}

export default function TermsOfService(): React.ReactElement {
  return (
    <div style={{ minHeight: '100dvh', background: '#1A1917' }}>
      {/* ── Header ── */}
      <header style={{ borderBottom: '0.4px solid #2E2D2B', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <LumenSymbol size={22} />
          <span
            className="font-serif text-celuloide"
            style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            Lumen
          </span>
        </Link>
      </header>

      {/* ── Contenido ── */}
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1
          className="font-serif text-celuloide"
          style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}
        >
          Términos de servicio
        </h1>
        <p
          className="font-mono"
          style={{ fontSize: 11, color: 'rgba(250,249,246,0.35)', letterSpacing: '0.06em', marginBottom: 40 }}
        >
          ÚLTIMA ACTUALIZACIÓN: MAYO 2025
        </p>

        <Section title="1. Descripción del servicio">
          <p>
            Lumen es una plataforma de análisis cinematográfico asistida por inteligencia artificial.
            El servicio permite a los usuarios mantener conversaciones profundas sobre películas,
            construir un historial de análisis personal y recibir sugerencias personalizadas.
          </p>
          <p style={{ marginTop: 8 }}>
            Las respuestas del asistente de IA son generadas por modelos de lenguaje de terceros
            (actualmente Groq / LLaMA) y tienen carácter orientativo. Lumen no garantiza la
            exactitud, completitud ni neutralidad de las respuestas generadas.
          </p>
        </Section>

        <Section title="2. Cuenta de usuario">
          <p>
            Para usar Lumen debes crear una cuenta con un email válido. Eres responsable de mantener
            la confidencialidad de tus credenciales y de todas las actividades que ocurran bajo tu cuenta.
            Debes notificarnos inmediatamente si sospechas de acceso no autorizado.
          </p>
          <p style={{ marginTop: 8 }}>
            Debes tener al menos 16 años para usar Lumen.
          </p>
        </Section>

        <Section title="3. Uso aceptable">
          <p style={{ marginBottom: 8 }}>Al usar Lumen te comprometes a no:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Intentar acceder a cuentas de otros usuarios o manipular el sistema de autenticación.</li>
            <li>Usar el servicio para generar contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
            <li>Realizar solicitudes automatizadas masivas que puedan degradar el servicio para otros usuarios.</li>
            <li>Intentar extraer, copiar o redistribuir el contenido generado por la IA de forma masiva.</li>
            <li>Usar el servicio con fines comerciales sin autorización expresa.</li>
          </ul>
        </Section>

        <Section title="4. Propiedad intelectual">
          <p>
            El código, diseño, marca y materiales originales de Lumen son propiedad de sus creadores y
            están protegidos por las leyes de propiedad intelectual aplicables.
          </p>
          <p style={{ marginTop: 8 }}>
            El contenido que tú generas (tus análisis, mensajes y notas) permanece bajo tu propiedad.
            Al usar el servicio, nos concedes una licencia limitada para procesar dicho contenido con el
            único fin de prestarte el servicio.
          </p>
        </Section>

        <Section title="5. Limitación de responsabilidad">
          <p>
            Lumen se proporciona «tal como está» sin garantías de ningún tipo. No garantizamos
            disponibilidad continua, exactitud de las respuestas de la IA ni que el servicio
            satisfaga tus expectativas específicas.
          </p>
          <p style={{ marginTop: 8 }}>
            En la máxima medida permitida por la ley, nuestra responsabilidad total frente a ti
            por cualquier reclamación derivada del uso del servicio no superará el importe que hayas
            pagado durante los 3 meses previos al incidente, o 10 €, lo que sea mayor.
          </p>
        </Section>

        <Section title="6. Planes y pagos">
          <p>
            Lumen ofrece un plan gratuito con límite diario de mensajes y planes de pago con
            límites ampliados. Los precios y condiciones de cada plan se muestran en la página de
            Planes. Los pagos son procesados por terceros seguros; no almacenamos datos de tarjeta.
          </p>
          <p style={{ marginTop: 8 }}>
            Las suscripciones de pago se renuevan automáticamente hasta que sean canceladas.
            Puedes cancelar en cualquier momento desde la configuración de tu cuenta.
          </p>
        </Section>

        <Section title="7. Cancelación y eliminación de cuenta">
          <p>
            Puedes eliminar tu cuenta en cualquier momento desde Perfil → Zona de peligro.
            La eliminación es permanente e inmediata: todos tus datos son borrados sin posibilidad
            de recuperación.
          </p>
          <p style={{ marginTop: 8 }}>
            Nos reservamos el derecho de suspender o eliminar cuentas que violen estos términos,
            con notificación previa excepto en casos de abuso grave.
          </p>
        </Section>

        <Section title="8. Modificaciones del servicio">
          <p>
            Podemos modificar, suspender o discontinuar el servicio con un aviso de al menos 30 días,
            excepto en situaciones de fuerza mayor o requerimientos legales que exijan acción inmediata.
            Los cambios en estos términos se notificarán por email con al menos 15 días de antelación.
          </p>
        </Section>

        <Section title="9. Ley aplicable">
          <p>
            Estos términos se rigen por la legislación española y de la Unión Europea.
            Cualquier controversia se someterá a los juzgados y tribunales de Madrid, España.
          </p>
        </Section>

        <Section title="10. Contacto">
          <p>
            Para consultas sobre estos términos, escríbenos a{' '}
            <span className="text-celuloide">legal@lumen.app</span>.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '0.4px solid #2E2D2B', display: 'flex', gap: 24 }}>
          <Link
            to="/privacy"
            className="font-sans"
            style={{ fontSize: 13, color: 'rgba(250,249,246,0.4)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.65)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.4)' }}
          >
            Política de privacidad →
          </Link>
          <Link
            to="/"
            className="font-sans"
            style={{ fontSize: 13, color: 'rgba(250,249,246,0.4)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.65)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.4)' }}
          >
            ← Volver a Lumen
          </Link>
        </div>
      </main>
    </div>
  )
}
