import { useEffect, useState } from 'react'

/**
 * Returns true when the viewport is narrower than 768px.
 * Updates reactively on resize via matchMedia — no polling, no layout thrash.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent): void => { setIsMobile(e.matches) }
    mq.addEventListener('change', handler)
    return () => { mq.removeEventListener('change', handler) }
  }, [])

  return isMobile
}
