import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import LumenSymbol from '../components/LumenSymbol'

export default function RegisterPage(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  function validate(): string | null {
    if (email.trim() === '') return 'El email es requerido'
    if (username.trim().length < 3)
      return 'El nombre de usuario debe tener al menos 3 caracteres'
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    setError(null)
    const validationError: string | null = validate()
    if (validationError !== null) {
      setError(validationError)
      return
    }
    setIsLoading(true)
    try {
      const response = await registerUser({ email, username, password })
      setAuth(
        {
          user_id: response.user_id,
          email: response.email,
          username: response.username,
        },
        response.access_token,
      )
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Algo falló. El intento no se perdió — prueba de nuevo.')
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

        {/* ── Tagline ── */}
        <p className="font-serif italic text-[18px] text-center leading-[1.55] mb-7 px-1"
          style={{ color: 'rgba(250, 249, 246, 0.6)' }}>
          La primera película que analices<br />ya cambia el perfil.
        </p>

        {/* ── Divisor ── */}
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

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="lumen-overline">
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              className="lumen-input-auth"
              value={username}
              onChange={(e) => { setUsername(e.target.value) }}
              placeholder="usuario123"
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="lumen-overline">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="lumen-input-auth"
              value={password}
              onChange={(e) => { setPassword(e.target.value) }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
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
            {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        {/* ── Footer ── */}
        <div className="mt-7 pt-5 border-t border-[rgba(46,45,43,0.5)]">
          <p className="text-center font-sans text-[13px] text-gray-mid">
            ¿Ya tienes cuenta?{' '}
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
