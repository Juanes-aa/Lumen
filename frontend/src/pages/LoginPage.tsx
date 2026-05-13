import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import { useAuthStore } from '../stores/authStore'
import LumenSymbol from '../components/LumenSymbol'

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  function validate(): string | null {
    if (email.trim() === '') return 'El email es requerido'
    if (password === '') return 'La contraseña es requerida'
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
      const response = await loginUser({ email, password })
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
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls: string =
    'lumen-input focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber'

  return (
    <div className="min-h-screen bg-sala flex items-center justify-center p-4">
      <div className="lumen-anim-1 w-full max-w-[420px] bg-pantalla border-[0.4px] border-borde rounded-xl px-8 py-9">
        <div className="flex items-center justify-center gap-[10px] mb-6">
          <LumenSymbol size={28} />
          <span className="font-serif text-[28px] font-medium text-celuloide tracking-[-0.02em]">
            Lumen
          </span>
        </div>

        <h1 className="font-serif italic text-lg font-normal text-gray-mid text-center leading-[1.4] mb-7">
          Cuando una película no se cierra, abrimos una sesión.
        </h1>

        <form
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="email" className="lumen-overline mb-[6px]">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="lumen-overline mb-[6px]">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error !== null ? (
            <p
              role="alert"
              className="font-sans text-[12.5px] text-warn bg-[rgba(226,75,74,0.08)] border-[0.4px] border-[rgba(226,75,74,0.25)] rounded-md px-3 py-2"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="lumen-btn-primary w-full text-center mt-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center font-sans text-[12.5px] text-gray-mid">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="text-amber no-underline hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
