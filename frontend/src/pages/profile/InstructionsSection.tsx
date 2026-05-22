import { useEffect, useRef, useState } from 'react'
import Button from '../../components/ui/Button'
import {
  useInstructionsQuery,
  useUpdateInstructionsMutation,
} from '../../api/queries'

const DEFAULT_INSTRUCTIONS: string =
  'Respóndeme como si estuvieras pensando en voz alta, no dándome una clase.\n' +
  'Hazme preguntas que no puedo responder fácilmente.\n' +
  'No resumas la película — asume que la vi. Trabaja sobre lo que digo, no sobre lo que "debería" decir.'

interface InstructionsSectionProps {
  onToast: (msg: string) => void
}

export default function InstructionsSection({ onToast }: InstructionsSectionProps): React.ReactElement {
  const instructionsQuery = useInstructionsQuery()
  const updateMutation = useUpdateInstructionsMutation()

  const [instructions, setInstructions] = useState<string>('')
  const initializedRef = useRef<boolean>(false)

  useEffect(() => {
    if (!initializedRef.current && !instructionsQuery.isPending) {
      const fromServer: string | undefined = instructionsQuery.data?.instructions
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstructions(
        fromServer !== undefined && fromServer !== '' ? fromServer : DEFAULT_INSTRUCTIONS,
      )
      initializedRef.current = true
    }
  }, [instructionsQuery.isPending, instructionsQuery.data])

  function handleSave(): void {
    updateMutation.mutate(
      { instructions },
      {
        onSuccess: () => {
          onToast('Instrucciones guardadas')
        },
        onError: () => {
          onToast('Error al guardar')
        },
      },
    )
  }

  return (
    <section className="lumen-anim-3 lumen-section">
      <label
        htmlFor="profile-instructions"
        className="lumen-overline cursor-default"
        style={{ display: 'block', marginBottom: 20 }}
      >
        Cómo quieres que te responda Lumen
      </label>
      <textarea
        id="profile-instructions"
        className="lumen-textarea focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        rows={6}
        value={instructions}
        onChange={(e) => {
          setInstructions(e.target.value)
        }}
        maxLength={1000}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <p className="font-mono text-gray-dark" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
          Los cambios aplican a tu próxima sesión · {instructions.length}/1000
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </section>
  )
}
