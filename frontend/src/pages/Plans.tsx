import { Link } from 'react-router-dom'
import { PlanCard } from '../components/plans/PlanCard'
import { ComparisonTable } from '../components/plans/ComparisonTable'
import { FAQItem } from '../components/plans/FAQItem'
import LumenSymbol from '../components/LumenSymbol'

// ── Datos de planes ──────────────────────────────────────────────────────────

const FREE_FEATURES = [
  { text: '5 análisis al mes' },
  { text: 'Historial de tus últimas 10 sesiones' },
  { text: 'Top 5 temas en tu perfil' },
  { text: '3 recomendaciones al mes' },
]

const PRO_FEATURES = [
  { text: 'Análisis ilimitados' },
  { text: 'Historial completo' },
  { text: 'Perfil semántico completo' },
  { text: 'Recomendaciones ilimitadas con razonamiento' },
  { text: 'Exportación en Markdown y JSON' },
]

const STUDIO_FEATURES = [
  { text: 'Todo lo de Pro' },
  { text: 'Acceso por API' },
  { text: 'Exportación a Notion y Obsidian' },
  { text: 'Múltiples perfiles semánticos' },
  { text: 'Análisis colaborativo' },
]

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: '¿Qué pasa con mis análisis si bajo de plan?',
    answer:
      'Tus sesiones y análisis anteriores se conservan. Lo que cambia es lo que puedes hacer desde ese momento: en Free, el historial visible se limita a las 10 últimas sesiones. Nada se borra.',
  },
  {
    question: '¿Puedo cancelar cuando quiera?',
    answer:
      'Sí. Sin períodos mínimos ni penalizaciones. Cancelas y el acceso Pro sigue activo hasta el final del período pagado.',
  },
  {
    question: '¿Por qué hay un límite en el plan gratis?',
    answer:
      'Cada análisis cuesta computación real. El límite de 5 al mes nos permite mantener el servicio sin degradar la calidad para nadie. No es un truco de conversión: es honestidad sobre los costos.',
  },
  {
    question: '¿Los análisis son privados?',
    answer:
      'Sí. Tus sesiones son privadas por defecto y no se usan para entrenar modelos. Lo que analizas queda entre tú y Lumen.',
  },
  {
    question: '¿Qué modelo de IA usa Lumen?',
    answer:
      'Claude de Anthropic. Elegimos modelos que razonan bien sobre texto complejo y mantienen coherencia a lo largo de una conversación extendida.',
  },
  {
    question: '¿Cómo se diferencia esto de Letterboxd?',
    answer:
      'Letterboxd es un registro social: qué viste, qué puntuación le das, qué le pareció a la comunidad. Lumen es una herramienta de pensamiento: qué te quedó de una película, qué patrones aparecen en lo que ves, qué conexiones se forman. Son cosas distintas.',
  },
]

// ── Constantes de estilo ─────────────────────────────────────────────────────

const ABYSS = '#0F0E0D'
const SALA  = '#1A1917'

// ── Componente ───────────────────────────────────────────────────────────────

export default function PlansPage(): React.ReactElement {
  return (
    /* El body tiene overflow:hidden — este contenedor habilita el scroll */
    <div style={{ height: '100vh', overflowY: 'auto', background: SALA }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: ABYSS, padding: '36px 24px 56px', textAlign: 'center' }}>

        {/* Logo mínimo para orientar al usuario */}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2.5 no-underline"
          style={{ marginBottom: 40, opacity: 0.85 }}
        >
          <LumenSymbol size={30} />
          <span
            className="font-serif text-celuloide"
            style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Lumen
          </span>
        </Link>

        <h1
          className="font-serif text-celuloide lumen-anim-1"
          style={{
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 400,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: 24,
          }}
        >
          Elige cómo quieres pensar.
        </h1>

        <p
          className="font-sans text-gray-mid lumen-anim-2"
          style={{ fontSize: 15, lineHeight: 1.75, maxWidth: 520, margin: '0 auto' }}
        >
          Tres niveles de profundidad. La película siempre es la misma — lo que cambia es qué tan lejos puedes llegar con ella.
        </p>
      </section>

      {/* ── TARJETAS DE PLANES ────────────────────────────────────────────── */}
      <section
        aria-label="Planes disponibles"
        style={{ background: SALA, padding: '100px 48px 72px' }}
      >
        <div
          style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'stretch' }}
        >
          <PlanCard
            name="Free"
            tagline="Empezar"
            price="$0"
            sublabel="Para ver si esto es para ti."
            features={FREE_FEATURES}
            ctaText="Empezar gratis"
            ctaHref="/signup"
            ctaVariant="secondary"
          />
          <PlanCard
            name="Pro"
            tagline="Pensar"
            price="$7"
            priceUnit="/mes"
            sublabel="Para quien ya sabe que el cine le importa."
            features={PRO_FEATURES}
            ctaText="Empezar a pensar"
            ctaHref="/signup?plan=pro"
            ctaVariant="primary"
            isRecommended
          />
          <PlanCard
            name="Studio"
            tagline="Profundizar"
            price="$12"
            priceUnit="/mes"
            sublabel="Para quien usa el cine como herramienta de trabajo."
            features={STUDIO_FEATURES}
            ctaText="Hablemos"
            ctaHref="/signup?plan=studio"
            ctaVariant="secondary"
          />
        </div>
      </section>

      {/* ── TABLA COMPARATIVA ─────────────────────────────────────────────── */}
      <section
        aria-label="Comparativa de planes"
        style={{ background: SALA, padding: '0 24px 80px' }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p
            className="lumen-overline"
            style={{ marginBottom: 24, textAlign: 'center' }}
          >
            Comparativa detallada
          </p>
          <div
            style={{
              border: '0.4px solid #2E2D2B',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section
        aria-label="Preguntas frecuentes"
        style={{ background: SALA, padding: '0 24px 80px' }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p
            className="lumen-overline"
            style={{ marginBottom: 32, textAlign: 'center' }}
          >
            Preguntas frecuentes
          </p>
          <div
            style={{
              border: '0.4px solid #2E2D2B',
              borderRadius: 10,
              padding: '0 36px',
              background: '#252421',
            }}
          >
            {FAQ_ITEMS.map((item) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section
        style={{ background: ABYSS, padding: '96px 24px', textAlign: 'center' }}
      >
        <h2
          className="font-serif text-celuloide"
          style={{
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 400,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            marginBottom: 36,
          }}
        >
          Una película termina.<br />El pensamiento, no.
        </h2>

        <Link
          to="/signup"
          className="lumen-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          style={{
            display: 'inline-block',
            textDecoration: 'none',
            borderRadius: 10,
            padding: '13px 36px',
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          Empezar gratis
        </Link>
      </section>

    </div>
  )
}
