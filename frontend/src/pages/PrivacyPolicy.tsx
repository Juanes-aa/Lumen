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

export default function PrivacyPolicy(): React.ReactElement {
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
          Política de privacidad
        </h1>
        <p
          className="font-mono"
          style={{ fontSize: 11, color: 'rgba(250,249,246,0.35)', letterSpacing: '0.06em', marginBottom: 40 }}
        >
          ÚLTIMA ACTUALIZACIÓN: MAYO 2025
        </p>

        <Section title="1. Quiénes somos">
          <p>
            Lumen es un servicio de análisis cinematográfico asistido por inteligencia artificial.
            Operamos como un SaaS independiente. Para cualquier consulta relacionada con privacidad,
            puedes contactarnos en <span className="text-celuloide">privacidad@lumen.app</span>.
          </p>
        </Section>

        <Section title="2. Datos que recopilamos">
          <p style={{ marginBottom: 8 }}>Recopilamos únicamente los datos necesarios para el funcionamiento del servicio:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Cuenta:</strong> dirección de email y nombre de usuario para la autenticación.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Contenido:</strong> los mensajes de tus sesiones de análisis, notas de memoria, preferencias de géneros y directores.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Uso:</strong> contadores de mensajes diarios para gestionar los límites del plan.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Técnicos:</strong> logs de errores y métricas de rendimiento de forma anónima.</li>
          </ul>
          <p style={{ marginTop: 8 }}>No recopilamos datos de pago directamente — los pagos son gestionados por procesadores de terceros.</p>
        </Section>

        <Section title="3. Cómo usamos tus datos">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Proporcionar el servicio de análisis cinematográfico con IA.</li>
            <li>Construir tu perfil de gustos (local a tu cuenta, no compartido).</li>
            <li>Enviarte emails transaccionales (verificación, recuperación de contraseña).</li>
            <li>Detectar y corregir errores técnicos.</li>
          </ul>
          <p style={{ marginTop: 8 }}>No usamos tus datos para publicidad ni los vendemos a terceros.</p>
        </Section>

        <Section title="4. Procesadores de datos">
          <p style={{ marginBottom: 8 }}>
            Para operar el servicio utilizamos los siguientes subprocesadores:
          </p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: 'rgba(250,249,246,0.85)' }}>Supabase</strong> — almacenamiento de base de datos y autenticación (UE/EEA).
            </li>
            <li>
              <strong style={{ color: 'rgba(250,249,246,0.85)' }}>Groq</strong> — procesamiento de las conversaciones de análisis por el modelo de IA. Los mensajes se envían a Groq para generar respuestas y no se almacenan por Groq más allá de la inferencia.
            </li>
            <li>
              <strong style={{ color: 'rgba(250,249,246,0.85)' }}>Render</strong> — hospedaje del backend.
            </li>
            <li>
              <strong style={{ color: 'rgba(250,249,246,0.85)' }}>Vercel</strong> — hospedaje del frontend.
            </li>
            <li>
              <strong style={{ color: 'rgba(250,249,246,0.85)' }}>Sentry</strong> — recopilación de errores técnicos, sin datos personales identificables.
            </li>
          </ul>
        </Section>

        <Section title="5. Retención de datos">
          <p>
            Tus datos se conservan mientras tu cuenta esté activa. Si eliminas tu cuenta, todos los
            datos asociados se borran de forma permanente e inmediata. Las copias de seguridad
            automáticas de Supabase pueden retener datos hasta 7 días adicionales tras el borrado.
          </p>
        </Section>

        <Section title="6. Tus derechos">
          <p style={{ marginBottom: 8 }}>Tienes derecho a:</p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Acceso:</strong> exportar todos tus datos desde la sección Perfil → Exportar.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Rectificación:</strong> modificar tu información desde la configuración del perfil.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Supresión:</strong> eliminar tu cuenta y todos los datos desde Perfil → Zona de peligro.</li>
            <li><strong style={{ color: 'rgba(250,249,246,0.85)' }}>Portabilidad:</strong> exportar tus datos en formato JSON o Markdown en cualquier momento.</li>
          </ul>
        </Section>

        <Section title="7. Seguridad">
          <p>
            Las contraseñas se almacenan con hashing seguro a cargo de Supabase Auth.
            Las comunicaciones entre el navegador y el backend se realizan siempre sobre HTTPS.
            Los tokens de sesión son cookies HttpOnly para prevenir acceso desde JavaScript.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Usamos una única cookie técnica (<code style={{ color: 'rgba(250,249,246,0.7)', fontSize: 13 }}>refresh_token</code>)
            estrictamente necesaria para mantener la sesión iniciada. No usamos cookies de rastreo ni
            analíticas de terceros.
          </p>
        </Section>

        <Section title="9. Contacto">
          <p>
            Para ejercer tus derechos o realizar cualquier consulta sobre privacidad, escríbenos a{' '}
            <span className="text-celuloide">privacidad@lumen.app</span>.
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '0.4px solid #2E2D2B', display: 'flex', gap: 24 }}>
          <Link
            to="/terms"
            className="font-sans"
            style={{ fontSize: 13, color: 'rgba(250,249,246,0.4)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.65)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(250,249,246,0.4)' }}
          >
            Términos de servicio →
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
