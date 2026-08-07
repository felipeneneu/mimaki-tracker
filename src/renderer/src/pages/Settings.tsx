import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({
    rasterlink_data_path: '',
    ink_price_per_cc_cmyk: '',
    ink_price_per_cc_white: '',
    ink_price_per_cc_varnish: '',
    machine_cost_per_hour: '',
    next_api_url: '',
    next_api_key: ''
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [folderStatus, setFolderStatus] = useState<{ valid: boolean; missing: string[] } | null>(null)

  useEffect(() => {
    window.api.settingsGet()
      .then(data => {
        if (Object.keys(data).length === 0 || !data.rasterlink_data_path) {
          data.rasterlink_data_path = 'd:\\www\\2026\\felipe-neneu-portfolio\\dpi-tinta-mimaki\\mock_rasterlink_data\\MijSuite\\Jobs\\RL01\\Mf'
        }
        setSettings(prev => ({ ...prev, ...data }))
        if (data.rasterlink_data_path) {
          window.api.validateMfFolder(data.rasterlink_data_path).then(setFolderStatus).catch(() => {})
        }
      })
      .catch(err => {
        toast.error('Erro ao carregar configurações', { description: err.message })
      })
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    if (key === 'rasterlink_data_path') {
      setFolderStatus(null)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const path = await window.api.openFolderDialog()
      if (path) {
        handleChange('rasterlink_data_path', path)
        const status = await window.api.validateMfFolder(path)
        setFolderStatus(status)
      }
    } catch (err: any) {
      toast.error('Erro ao selecionar pasta', { description: err.message })
    }
  }

  const handleValidate = async () => {
    if (!settings.rasterlink_data_path) return
    try {
      const status = await window.api.validateMfFolder(settings.rasterlink_data_path)
      setFolderStatus(status)
    } catch (err: any) {
      toast.error('Erro ao validar pasta', { description: err.message })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await window.api.settingsSave(settings)
      if (result) {
        setSaved(true)
        toast.success('Configurações salvas!')
        setTimeout(() => setSaved(false), 3000)
      } else {
        toast.error('Erro ao salvar configurações')
      }
    } catch (err: any) {
      toast.error('Erro ao salvar configurações', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleApiTest = async () => {
    if (!settings.next_api_url) {
      toast.warning('Preencha a URL da API primeiro.')
      return
    }
    try {
      const res = await window.api.exportApi()
      if (res.error) toast.error(`Erro no teste: ${res.error}`)
      else toast.success(`API respondeu OK. Enviados: ${res.count}`)
    } catch (err: any) {
      toast.error('Erro ao testar API', { description: err.message })
    }
  }

  const handleBackup = async () => {
    try {
      const res = await window.api.backupDatabase()
      if (res.success) {
        toast.success('Backup salvo!', { description: res.path })
      } else if (res.error !== 'Cancelado pelo usuário') {
        toast.error(`Erro ao fazer backup: ${res.error}`)
      }
    } catch (err: any) {
      toast.error('Erro ao fazer backup', { description: err.message })
    }
  }

  const handleImport = async () => {
    try {
      const res = await window.api.importDatabase()
      if (res.success && res.needsRestart) {
        toast.success('Banco importado! Reiniciando o app...', { duration: 2000 })
        setTimeout(() => {
          window.api.restartApp()
        }, 1500)
      } else if (res.error && res.error !== 'Cancelado pelo usuário') {
        toast.error(`Erro ao importar: ${res.error}`)
      }
    } catch (err: any) {
      toast.error('Erro ao importar banco', { description: err.message })
    }
  }

  return (
    <>
      <div className="p-8 max-w-4xl space-y-8 pb-20">

        {/* Diretório */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Diretório do RasterLink</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={settings.rasterlink_data_path}
              onChange={e => handleChange('rasterlink_data_path', e.target.value)}
              className="flex-1 bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200 font-mono"
              placeholder="Ex: C:\MijSuite\Jobs\RL01\Mf"
            />
            <button
              onClick={handleSelectFolder}
              className="bg-bg-elevated hover:bg-bg-border border border-bg-border px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Procurar
            </button>
            <button
              onClick={handleValidate}
              className="bg-bg-elevated hover:bg-bg-border border border-bg-border px-4 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Validar
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">Aponte para a pasta <code className="text-brand-pink">Mf</code> (mãe) onde ficam as subpastas <code className="text-brand-pink">Elm</code>, <code className="text-brand-pink">Cmp</code> e <code className="text-brand-pink">Lay</code>.</p>

          {folderStatus && (
            <div className={`mt-3 p-3 rounded-md text-sm transition-colors duration-200 ${folderStatus.valid ? 'bg-success/10 text-success border border-success/20' : 'bg-error/10 text-error border border-error/20'}`}>
              {folderStatus.valid
                ? '✓ Pasta válida — Elm, Cmp e Lay encontradas.'
                : `✗ Pastas faltando: ${folderStatus.missing.join(', ')}`
              }
            </div>
          )}
        </section>

        {/* Custos */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Custos de Produção</h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Preço da Tinta (R$ por cc)</h4>
              <div>
                <label className="block text-xs text-text-muted mb-1">CMYK (Ciano, Magenta, Amarelo, Preto)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={settings.ink_price_per_cc_cmyk}
                  onChange={e => handleChange('ink_price_per_cc_cmyk', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Branco</label>
                <input
                  type="number" step="0.01" min="0"
                  value={settings.ink_price_per_cc_white}
                  onChange={e => handleChange('ink_price_per_cc_white', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Verniz</label>
                <input
                  type="number" step="0.01" min="0"
                  value={settings.ink_price_per_cc_varnish}
                  onChange={e => handleChange('ink_price_per_cc_varnish', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Custo de Máquina</h4>
              <div>
                <label className="block text-xs text-text-muted mb-1">Custo por Hora de Impressão (R$)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={settings.machine_cost_per_hour}
                  onChange={e => handleChange('machine_cost_per_hour', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
                />
              </div>
            </div>
          </div>
        </section>

        {/* API Next.js */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Integração ERP / API Next.js</h3>
            <button
              onClick={handleApiTest}
              className="text-xs text-brand-pink hover:text-brand-pink/80 font-medium transition-colors duration-200"
            >
              Testar Conexão
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1">Endpoint URL</label>
              <input
                type="text"
                value={settings.next_api_url}
                onChange={e => handleChange('next_api_url', e.target.value)}
                placeholder="https://meu-erp.com/api/mimaki-sync"
                className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Chave de API (Bearer Token)</label>
              <input
                type="password"
                value={settings.next_api_key}
                onChange={e => handleChange('next_api_key', e.target.value)}
                placeholder="Sua chave secreta..."
                className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none transition-colors duration-200"
              />
            </div>
          </div>
        </section>

        {/* Backup/Import do Banco */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Banco de Dados</h3>
          <p className="text-xs text-text-muted mb-4">
            Backup salva uma cópia do arquivo <code className="text-brand-pink">mimaki.db</code>. Importar restaura um backup anterior (reinicia o app).
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleBackup}
              className="bg-brand-pink hover:bg-brand-pink/80 text-white font-medium px-5 py-2 rounded-md shadow-sm transition-all duration-200 text-sm"
            >
              Fazer Backup
            </button>
            <button
              onClick={handleImport}
              className="bg-bg-elevated hover:bg-bg-border border border-bg-border text-text-primary font-medium px-5 py-2 rounded-md shadow-sm transition-all duration-200 text-sm"
            >
              Importar Backup
            </button>
          </div>
        </section>

        {/* Footer actions */}
        <div className="flex justify-end items-center gap-4 pt-4 border-t border-bg-border">
          {saved && <span className="text-success text-sm font-medium">Salvo com sucesso!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-purple hover:bg-brand-purple/80 text-white font-medium px-6 py-2.5 rounded-md shadow-sm transition-all duration-200"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

      </div>
    </>
  )
}
