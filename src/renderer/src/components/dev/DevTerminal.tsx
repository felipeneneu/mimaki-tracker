import { useState, useEffect, useRef, useCallback } from 'react'

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'info'
  text: string
}

const COMMANDS = [
  { cmd: 'help', desc: 'Lista todos os comandos disponíveis' },
  { cmd: 'version', desc: 'Mostra versão do app' },
  { cmd: 'show-db-path', desc: 'Mostra caminho do banco de dados' },
  { cmd: 'reset-checkpoint', desc: 'Reseta checkpoint de sincronização' },
  { cmd: 're-sync', desc: 'Força re-sincronização completa' },
  { cmd: 'clear-db', desc: 'Limpa o banco de dados (requer confirmação)' },
  { cmd: 'export-db', desc: 'Exporta cópia do banco de dados' },
  { cmd: 'open-data-folder', desc: 'Abre a pasta de dados no explorador' },
]

export function DevTerminal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isFirstSetup, setIsFirstSetup] = useState(false)
  const [, setBlockedMinutes] = useState(0)
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'info', text: 'DPI Mimaki Tracker — Terminal de Desenvolvimento' },
    { type: 'info', text: 'Digite "help" para ver os comandos disponíveis.' },
    { type: 'info', text: '─────────────────────────────────────────────' },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Escuta toggle do Shift+T
  useEffect(() => {
    const unsubscribe = window.api.onDevToggleTerminal(async () => {
      if (isOpen) {
        setIsOpen(false)
        return
      }
      // Solicita acesso
      const result = await window.api.requestDevAccess()
      if (result.granted) {
        setIsOpen(true)
        setIsUnlocked(true)
      } else if (result.blocked) {
        setIsOpen(true)
        setIsUnlocked(false)
        setBlockedMinutes(result.remainingMinutes ?? 5)
        setPasswordError(`Bloqueado por ${result.remainingMinutes} minuto(s).`)
      } else if (result.needsPassword) {
        setIsOpen(true)
        setIsUnlocked(false)
        setIsFirstSetup(result.isFirstSetup ?? false)
      }
    })
    return () => unsubscribe()
  }, [isOpen])

  // Escuta Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setIsUnlocked(false)
        setPassword('')
        setPasswordError('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  // Focus no input correto
  useEffect(() => {
    if (isOpen) {
      if (isUnlocked) {
        inputRef.current?.focus()
      } else {
        passwordRef.current?.focus()
      }
    }
  }, [isOpen, isUnlocked])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines])

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { type, text }])
  }, [])

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return

    const result = await window.api.verifyDevPassword(password)
    if (result.granted) {
      setIsUnlocked(true)
      setPassword('')
      setPasswordError('')
      addLine('info', '✓ Acesso liberado.')
    } else if (result.blocked) {
      setBlockedMinutes(result.remainingMinutes ?? 5)
      setPasswordError(`Bloqueado por ${result.remainingMinutes} minuto(s).`)
    } else {
      setPasswordError(result.error || 'Senha incorreta.')
      setPassword('')
    }
  }

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    setHistory(prev => [...prev, trimmed])
    setHistoryIdx(-1)
    addLine('input', `> ${trimmed}`)

    if (trimmed === 'help') {
      addLine('output', '')
      COMMANDS.forEach(c => {
        addLine('output', `  ${c.cmd.padEnd(20)} ${c.desc}`)
      })
      addLine('output', '')
      return
    }

    setIsRunning(true)
    try {
      const result = await window.api.runDevCommand(trimmed)
      if (result.error) {
        addLine('error', `✗ ${result.error}`)
      } else if (result.output) {
        result.output.split('\n').forEach((line: string) => {
          addLine('output', line)
        })
      } else {
        addLine('info', '✓ Comando executado com sucesso.')
      }
    } catch (err: any) {
      addLine('error', `✗ Erro: ${err.message || err}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx
        setHistoryIdx(newIdx)
        setInput(history[history.length - 1 - newIdx])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx > 0) {
        const newIdx = historyIdx - 1
        setHistoryIdx(newIdx)
        setInput(history[history.length - 1 - newIdx])
      } else {
        setHistoryIdx(-1)
        setInput('')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 w-[550px] h-[320px] m-4">
      <div className="flex flex-col h-full bg-bg-base/95 backdrop-blur-xl border border-bg-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-bg-border bg-bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-error/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-success/80" />
            </div>
            <span className="text-[11px] text-text-muted font-mono ml-2">dev-terminal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-dim">Shift+T para fechar</span>
            <button
              onClick={() => { setIsOpen(false); setIsUnlocked(false); setPassword(''); setPasswordError('') }}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Password modal */}
        {!isUnlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="text-center mb-4">
              <svg className="w-10 h-10 text-warning mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-sm text-text-primary font-medium">
                {isFirstSetup ? 'Configurar Senha do Terminal' : 'Terminal Protegido'}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {isFirstSetup
                  ? 'Digite uma senha para proteger o terminal.'
                  : 'Digite a senha de desenvolvedor para acessar.'
                }
              </p>
            </div>
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError('') }}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Senha..."
              className="w-64 bg-bg-surface border border-bg-border rounded-md px-3 py-2 text-sm text-text-primary text-center font-mono focus:outline-none focus:border-brand-purple transition-colors"
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-error mt-2">{passwordError}</p>
            )}
            <button
              onClick={handlePasswordSubmit}
              className="mt-3 bg-brand-purple hover:bg-brand-purple/80 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors"
            >
              Desbloquear
            </button>
          </div>
        ) : (
          <>
            {/* Output */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
              {lines.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap ${
                  line.type === 'input' ? 'text-brand-pink font-semibold' :
                  line.type === 'error' ? 'text-error' :
                  line.type === 'info' ? 'text-text-dim' :
                  'text-text-muted'
                }`}>
                  {line.text}
                </div>
              ))}
              {isRunning && (
                <div className="text-text-dim animate-pulse">Executando...</div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-bg-border bg-bg-surface/30">
              <span className="text-brand-pink font-mono text-[12px]">$</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                placeholder="Digite um comando..."
                className="flex-1 bg-transparent text-text-primary font-mono text-[12px] outline-none placeholder:text-text-dim disabled:opacity-50"
                autoFocus
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
