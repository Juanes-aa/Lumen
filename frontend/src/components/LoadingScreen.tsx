export default function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-sala"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
    </div>
  )
}
