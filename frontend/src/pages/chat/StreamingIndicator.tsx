export default function StreamingIndicator(): React.ReactElement {
  return (
    <div className="flex gap-1 items-center h-5 pl-[2px]" aria-label="Lumen está escribiendo">
      <span className="lumen-streaming-dot" />
      <span className="lumen-streaming-dot" />
      <span className="lumen-streaming-dot" />
    </div>
  )
}
