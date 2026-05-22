import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import LumenSymbol from '../components/LumenSymbol'

export default function ForgotPassword(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [sent, setSent] = useState<boolean>(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    if (email.trim() === '') {
      setError('El email es requerido')
      return
    }
    setIsLoading(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError('Algo falló. Intenta de nuevo en unos momentos.')
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

        {sent ? (
          <>
            {/* ── Estado enviado ── */}
            <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
              style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
              Revisa tu bandeja de entrada.
            </p>
            <div className="lumen-auth-divider mb-7" />
            <p className="font-sans text-[14px] text-center leading-[1.65]"
              style={{ color: 'rgba(250, 249, 246, 0.7)' }}>
              Si <span className="text-celuloide">{email}</span> está registrado,
              recibirás un enlace para restablecer tu contraseña.
              El enlace expira en 1 hora.
            </p>
            <p className="font-sans text-[13px] text-center mt-3"
              style={{ color: 'rgba(250, 249, 246, 0.45)' }}>
              Si no ves el email, revisa la carpeta de spam.
            </p>
          </>
        ) : (
          <>
            {/* ── Tagline ── */}
            <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
              style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
              Te enviamos un enlace<br />para recuperar el acceso.
            </p>

            <div className="lumen-auth-divider mb-7" />

            {/* ── Formulario ── */}
            <form
              onSubmit={(e) => { void handleSubmit(e) }}
              className="flex flex-col gap-[18px]"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="lumen-overline">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="lumen-input-auth"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value) }}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />
              </div>

              {error !== null ? (
                <p
                  role="alert"
                  className="font-sans text-[12.5px] text-warn bg-[rgba(226,75,74,0.08)] border-[0.4px] border-[rgba(226,75,74,0.25)] rounded-md px-3 py-2.5 leading-[1.5]"
                >
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                className="lumen-btn-auth mt-1"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-9 pt-6 border-t border-[rgba(46,45,43,0.5)]">
          <p className="text-center font-sans text-[13px] text-gray-mid">
            <Link
              to="/login"
              className="text-amber no-underline hover:opacity-75 transition-opacity duration-150"
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
