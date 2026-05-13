import { useState } from 'react'
import {
  useCreateMemoryNoteMutation,
  useDeleteMemoryNoteMutation,
  useMemoryNotesQuery,
} from '../../api/queries'
import type { MemoryNote } from '../../types/profile'

const MAX_NOTES: number = 10
const MAX_LEN: number = 200

interface MemorySectionProps {
  onToast: (msg: string) => void
}

export default function MemorySection({ onToast }: MemorySectionProps): React.ReactElement {
  const notesQuery = useMemoryNotesQuery()
  const createMutation = useCreateMemoryNoteMutation()
  const deleteMutation = useDeleteMemoryNoteMutation()

  const memoryNotes: MemoryNote[] = notesQuery.data ?? []
  const [newNoteContent, setNewNoteContent] = useState<string>('')
  const atMax: boolean = memoryNotes.length >= MAX_NOTES

  function handleAdd(): void {
    const content: string = newNoteContent.trim()
    if (content === '' || atMax) return
    createMutation.mutate(content, {
      onSuccess: () => {
        setNewNoteContent('')
      },
      onError: () => {
        onToast('No se pudo agregar la nota')
      },
    })
  }

  function handleDelete(id: string): void {
    deleteMutation.mutate(id, {
      onError: () => {
        onToast('No se pudo eliminar')
      },
    })
  }

  return (
    <section className="lumen-anim-4 lumen-section">
      <div className="flex justify-between items-start mb-4">
        <span className="lumen-overline">Lo que Lumen siempre considera</span>
        <span className={`font-mono text-[10px] ${atMax ? 'text-warn' : 'text-gray-mid'}`}>
          {memoryNotes.length}/{MAX_NOTES}
        </span>
      </div>
      {memoryNotes.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-[14px]">
          {memoryNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-center gap-[7px] bg-pantalla-soft border-[0.4px] border-borde rounded-[4px] text-gray-mid font-sans text-[11.5px] px-[10px] py-[5px]"
            >
              <span>{note.content}</span>
              <button
                type="button"
                onClick={() => {
                  handleDelete(note.id)
                }}
                aria-label={`Eliminar nota: ${note.content}`}
                className="bg-transparent border-none text-gray-dark cursor-pointer p-0 flex items-center hover:text-warn focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber rounded-sm"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          id="profile-new-memory-note"
          aria-label="Nueva nota de memoria"
          className="lumen-input flex-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          placeholder="Agregar una nota de contexto…"
          value={newNoteContent}
          onChange={(e) => {
            setNewNoteContent(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          disabled={atMax}
          maxLength={MAX_LEN}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={createMutation.isPending || newNoteContent.trim() === '' || atMax}
          className="lumen-btn-secondary sm whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          + Agregar
        </button>
      </div>
      <p className="font-mono text-[10px] text-gray-dark tracking-[0.05em] mt-[10px]">
        Máximo {MAX_NOTES} notas activas · {MAX_LEN} caracteres por nota
      </p>
    </section>
  )
}
