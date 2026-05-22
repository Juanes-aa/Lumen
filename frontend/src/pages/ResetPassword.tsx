import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import LumenSymbol from '../components/LumenSymbol'

function parseHashToken(): string | null {
  const hash = window.location.hash.slice(1) // quitar '#'
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  const type = params.get('type')
  if (token && type === 'recovery') return token
  return null
}

export default function ResetPassword(): React.ReactElement {
  const [password, setPassword] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [done, setDone] = useState<boolean>(false)
  const [token, setToken] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = parseHashToken()
    if (!t) {
      setError('Enlace de recuperación inválido o expirado. Solicita uno nuevo.')
    } else {
      setToken(t)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!token) {
      setError('Enlace de recuperación inválido o expirado. Solicita uno nuevo.')
      return
    }
    setIsLoading(true)
    try {
      await resetPassword(password, token)
      setDone(true)
      setTimeout(() => { void navigate('/login') }, 2500)
    } catch {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
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

        {done ? (
          <>
            <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
              style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
              Contraseña actualizada.
            </p>
            <div className="lumen-auth-divider mb-7" />
            <p className="font-sans text-[14px] text-center leading-[1.65]"
              style={{ color: 'rgba(250, 249, 246, 0.7)' }}>
              Tu contraseña fue cambiada correctamente.<br />
              Redirigiendo al inicio de sesión…
            </p>
          </>
        ) : (
          <>
            <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
              style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
              Elige una nueva contraseña<br />para tu cuenta.
            </p>

            <div className="lumen-auth-divider mb-7" />

            <form
              onSubmit={(e) => { void handleSubmit(e) }}
              className="flex flex-col gap-[18px]"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="lumen-overline">
                  Nueva contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  className="lumen-input-auth"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value) }}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirm" className="lumen-overline">
                  Confirmar contraseña
                </label>
                <input
                  id="confirm"
                  type="password"
                  className="lumen-input-auth"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value) }}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  disabled={!token}
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
                disabled={isLoading || !token}
              >
                {isLoading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}

        {/* ── Footer ── */}
        <div className="mt-9 pt-6 border-t border-[rgba(46,45,43,0.5)]">
          <p className="text-center font-sans text-[13px] text-gray-mid">
            <Link
              to="/forgot-password"
              className="text-amber no-underline hover:opacity-75 transition-opacity duration-150"
            >
              Solicitar nuevo enlace
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
