import type { ReactElement } from 'react'

interface TableRow {
  feature: string
  free: string | boolean
  pro: string | boolean
  studio: string | boolean
}

const TABLE_ROWS: TableRow[] = [
  { feature: 'Análisis IA por mes',            free: '5',            pro: 'Ilimitados',  studio: 'Ilimitados'  },
  { feature: 'Historial de sesiones',           free: '10 últimas',   pro: 'Completo',    studio: 'Completo'    },
  { feature: 'Perfil semántico',                free: 'Top 5 temas',  pro: 'Completo',    studio: 'Completo'    },
  { feature: 'Recomendaciones por mes',         free: '3',            pro: 'Ilimitadas',  studio: 'Ilimitadas'  },
  { feature: 'Exportación Markdown / JSON',     free: false,          pro: true,          studio: true          },
  { feature: 'Exportación a Notion / Obsidian', free: false,          pro: false,         studio: true          },
  { feature: 'Perfiles semánticos múltiples',   free: false,          pro: false,         studio: true          },
  { feature: 'Análisis colaborativo',           free: false,          pro: false,         studio: true          },
  { feature: 'Acceso por API',                  free: false,          pro: false,         studio: true          },
]

const PLAN_HEADERS = ['Free', 'Pro', 'Studio'] as const

function TealCheck(): ReactElement {
  return (
    <span className="flex justify-center items-center">
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        role="img"
        aria-label="Incluido"
      >
        <path
          d="M4 9.5L7 12.5L14 5.5"
          stroke="#1D9E75"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function Dash(): ReactElement {
  return (
    <span
      className="flex justify-center items-center text-gray-mid"
      style={{ fontSize: 16 }}
      aria-label="No incluido"
    >
      —
    </span>
  )
}

function renderCell(value: string | boolean): ReactElement {
  if (value === true)  return <TealCheck />
  if (value === false) return <Dash />
  return (
    <span
      className="font-sans text-celuloide"
      style={{ fontSize: 13, display: 'block', textAlign: 'center' }}
    >
      {value}
    </span>
  )
}

export function ComparisonTable(): ReactElement {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full border-collapse"
        style={{ minWidth: 460, background: '#252421' }}
      >
        <thead>
          <tr style={{ borderBottom: '0.4px solid #2E2D2B' }}>
            <th
              scope="col"
              className="font-sans text-left text-gray-mid"
              style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: '0.08em', padding: '16px 20px', width: '42%' }}
            >
              Feature
            </th>
            {PLAN_HEADERS.map((plan) => (
              <th
                key={plan}
                scope="col"
                className="font-serif text-center text-celuloide"
                style={{ fontSize: 19, fontWeight: 500, padding: '14px 12px' }}
              >
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, i) => (
            <tr
              key={row.feature}
              style={{
                borderTop: i === 0 ? 'none' : '0.4px solid #2E2D2B',
                background: i % 2 === 1 ? 'rgba(30, 29, 27, 0.6)' : '#252421',
              }}
            >
              <td
                className="font-sans text-celuloide"
                style={{ fontSize: 13, padding: '14px 20px', lineHeight: 1.5 }}
              >
                {row.feature}
              </td>
              <td style={{ padding: '14px 12px' }}>{renderCell(row.free)}</td>
              <td style={{ padding: '14px 12px' }}>{renderCell(row.pro)}</td>
              <td style={{ padding: '14px 12px' }}>{renderCell(row.studio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ComparisonTable
