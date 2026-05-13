import { useState } from 'react'
import { downloadExport, type ExportFormat } from '../../api/export'
import { useAuthStore } from '../../stores/authStore'
import { useSessionsQuery } from '../../api/queries'

export default function ExportSection(): React.ReactElement {
  const sessionsQuery = useSessionsQuery()
  const sessionsCount: number = (sessionsQuery.data ?? []).length

  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const noSessions: boolean = sessionsCount === 0

  async function handleExport(format: ExportFormat): Promise<void> {
    const token: string | null = useAuthStore.getState().access_token
    if (token === null || token === '' || exportingFormat !== null || noSessions) return
    setExportingFormat(format)
    setExportError(null)
    try {
      await downloadExport(format, token)
    } catch {
      setExportError('No se pudo generar la exportación.')
    } finally {
      setExportingFormat(null)
    }
  }

  function buttonClass(): string {
    return 'lumen-btn-secondary sm text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber'
  }

  return (
    <section className="lumen-anim-5 lumen-section">
      <span className="lumen-overline mb-4">Exportar</span>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={buttonClass()}
          onClick={() => {
            void handleExport('markdown')
          }}
          disabled={noSessions || exportingFormat !== null}
          title={noSessions ? 'No tienes sesiones para exportar' : ''}
        >
          {exportingFormat === 'markdown' ? 'Generando…' : 'Exportar como Markdown'}
        </button>
        <button
          type="button"
          className={buttonClass()}
          onClick={() => {
            void handleExport('json')
          }}
          disabled={noSessions || exportingFormat !== null}
          title={noSessions ? 'No tienes sesiones para exportar' : ''}
        >
          {exportingFormat === 'json' ? 'Generando…' : 'Exportar como JSON'}
        </button>
      </div>
      <p className="font-mono text-[10px] text-gray-dark tracking-[0.05em] mt-3">
        {noSessions ? 'Sin sesiones disponibles' : 'Tu historial completo de análisis'}
      </p>
      {exportError !== null ? (
        <p className="text-warn text-[11px] mt-2">{exportError}</p>
      ) : null}
    </section>
  )
}
