export function TitleBar() {
  return (
    <div className="window-controls">
      <button className="btn-close" onClick={() => window.api.windowClose()} title="Fechar">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3L9 9M9 3L3 9" />
        </svg>
      </button>
      <button className="btn-minimize" onClick={() => window.api.windowMinimize()} title="Minimizar">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6H10" />
        </svg>
      </button>
      <button className="btn-maximize" onClick={() => window.api.windowMaximize()} title="Maximizar">
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3H9V9H3V3Z" />
        </svg>
      </button>
    </div>
  )
}
