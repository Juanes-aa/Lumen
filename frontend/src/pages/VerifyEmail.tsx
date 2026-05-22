import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendVerification } from '../api/auth'
import LumenSymbol from '../components/LumenSymbol'

export default function VerifyEmail(): React.ReactElement {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [resent, setResent] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  // Cooldown de 60 s entre reenvíos para evitar spam
  const [cooldown, setCooldown] = useState<number>(0)

  async function handleResend(): Promise<void> {
    if (cooldown > 0 || isLoading) return
    setError(null)
    setResent(false)
    setIsLoading(true)
    try {
      await resendVerification(email)
      setResent(true)
      setCooldown(60)
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError('No se pudo reenviar el email. Intenta de nuevo en unos momentos.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="lumen-auth-bg">
      <div className="lumen-auth-card lumen-anim-1">

        {/* ── Marca ── */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <LumenSymbol size={30} />
          <span className="font-serif text-[32px] font-medium text-celuloide tracking-[-0.02em] leading-none">
            Lumen
          </span>
        </div>

        {/* ── Mensaje principal ── */}
        <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
          style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
          Revisa tu email —<br />te enviamos un enlace de verificación.
        </p>

        <div className="lumen-auth-divider mb-7" />

        <div className="flex flex-col gap-4">
          {email !== '' ? (
            <p className="font-sans text-[13.5px] text-center leading-[1.65]"
              style={{ color: 'rgba(250, 249, 246, 0.65)' }}>
              Enviamos el enlace a{' '}
              <span className="text-celuloide">{email}</span>.
              Ábrelo para activar tu cuenta.
            </p>
          ) : null}

          <p className="font-sans text-[12.5px] text-center"
            style={{ color: 'rgba(250, 249, 246, 0.4)' }}>
            Si no ves el email, revisa la carpeta de spam.
          </p>

          {resent ? (
            <p className="font-sans text-[12.5px] text-center"
              style={{ color: 'rgba(212, 163, 72, 0.85)' }}>
              Email reenviado correctamente.
            </p>
          ) : null}

          {error !== null ? (
            <p
              role="alert"
              className="font-sans text-[12.5px] text-warn bg-[rgba(226,75,74,0.08)] border-[0.4px] border-[rgba(226,75,74,0.25)] rounded-md px-3 py-2.5 leading-[1.5] text-center"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => { void handleResend() }}
            disabled={isLoading || cooldown > 0}
            className="lumen-btn-auth mt-1"
          >
            {isLoading
              ? 'Enviando…'
              : cooldown > 0
                ? `Reenviar en ${cooldown.toString()}s`
                : 'Reenviar email'}
          </button>
        </div>

        {/* ── Footer ── */}
        <div className="mt-9 pt-6 border-t border-[rgba(46,45,43,0.5)]">
          <p className="text-center font-sans text-[13px] text-gray-mid">
            ¿Ya verificaste tu cuenta?{' '}
            <Link
              to="/login"
              className="text-amber no-underline hover:opacity-75 transition-opacity duration-150"
            >
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
