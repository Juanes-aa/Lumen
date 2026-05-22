import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAccount } from '../../api/profile'
import { useAuthStore } from '../../stores/authStore'
import { ApiError } from '../../api/client'

export default function DangerZoneSection(): React.ReactElement {
  const [showModal, setShowModal] = useState<boolean>(false)
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  function openModal(): void {
    setPassword('')
    setError(null)
    setShowModal(true)
    // Foco al input tras renderizar el modal
    setTimeout(() => { inputRef.current?.focus() }, 50)
  }

  function closeModal(): void {
    if (isLoading) return
    setShowModal(false)
    setPassword('')
    setError(null)
  }

  async function handleDelete(): Promise<void> {
    if (password === '') {
      setError('Introduce tu contraseña para confirmar')
      return
    }
    const token: string | null = useAuthStore.getState().access_token
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      await deleteAccount(password, token)
      clearAuth()
      void navigate('/', {
        state: { accountDeleted: true },
        replace: true,
      })
    } catch (err: unknown) {
      const detail = err instanceof ApiError ? err.detail : ''
      if (detail.toLowerCase().includes('incorrecta') || detail.toLowerCase().includes('wrong')) {
        setError('Contraseña incorrecta. Inténtalo de nuevo.')
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta. Inténtalo más tarde.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── Sección ── */}
      <section
        className="lumen-section"
        style={{
          borderColor: 'rgba(226,75,74,0.2)',
          borderWidth: '0.4px',
          borderStyle: 'solid',
          borderRadius: 10,
        }}
      >
        <span
          className="lumen-overline"
          style={{ display: 'block', marginBottom: 10, color: 'rgba(226,75,74,0.7)' }}
        >
          Zona de peligro
        </span>
        <p
          className="font-sans"
          style={{ fontSize: 13, color: 'rgba(250,249,246,0.5)', marginBottom: 14, lineHeight: 1.6 }}
        >
          Eliminar tu cuenta borra de forma permanente todos tus datos:
          análisis, biblioteca, perfil y memoria. Esta acción no se puede deshacer.
        </p>
        <button
          type="button"
          onClick={openModal}
          className="font-sans"
          style={{
            fontSize: 13,
            padding: '7px 16px',
            borderRadius: 6,
            border: '0.4px solid rgba(226,75,74,0.45)',
            background: 'rgba(226,75,74,0.06)',
            color: 'rgba(226,75,74,0.85)',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(226,75,74,0.12)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(226,75,74,0.06)' }}
        >
          Eliminar mi cuenta
        </button>
      </section>

      {/* ── Modal ── */}
      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(14,13,11,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            style={{
              background: '#1A1917',
              border: '0.4px solid rgba(46,45,43,0.8)',
              borderRadius: 12,
              padding: '28px 28px 24px',
              maxWidth: 420,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <h2
              id="delete-modal-title"
              className="font-serif text-celuloide"
              style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em' }}
            >
              Eliminar cuenta
            </h2>

            <p
              className="font-sans"
              style={{ fontSize: 13.5, color: 'rgba(250,249,246,0.6)', lineHeight: 1.65 }}
            >
              Esta acción es <strong style={{ color: 'rgba(250,249,246,0.8)' }}>permanente e irreversible</strong>.
              Todos tus datos serán eliminados. Introduce tu contraseña para confirmar.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                htmlFor="delete-password"
                className="lumen-overline"
              >
                Contraseña
              </label>
              <input
                ref={inputRef}
                id="delete-password"
                type="password"
                className="lumen-input-auth"
                value={password}
                onChange={(e) => { setPassword(e.target.value) }}
                placeholder="Tu contraseña actual"
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter') void handleDelete() }}
                disabled={isLoading}
              />
            </div>

            {error !== null ? (
              <p
                role="alert"
                className="font-sans text-warn"
                style={{
                  fontSize: 12.5,
                  background: 'rgba(226,75,74,0.08)',
                  border: '0.4px solid rgba(226,75,74,0.25)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={isLoading}
                className="lumen-btn-secondary"
                style={{ fontSize: 13, padding: '7px 16px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { void handleDelete() }}
                disabled={isLoading || password === ''}
                className="font-sans"
                style={{
                  fontSize: 13,
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: isLoading || password === '' ? 'rgba(226,75,74,0.3)' : 'rgba(226,75,74,0.85)',
                  color: '#FAF9F6',
                  cursor: isLoading || password === '' ? 'not-allowed' : 'pointer',
                  transition: 'background 150ms',
                }}
              >
                {isLoading ? 'Eliminando…' : 'Eliminar cuenta'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
