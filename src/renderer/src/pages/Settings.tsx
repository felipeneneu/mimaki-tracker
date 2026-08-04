import { useState, useEffect } from 'react'
import { TopBar } from '../components/layout/TopBar'

export function Settings() {
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

  useEffect(() => {
    window.api.settingsGet().then(data => {
      // Se tiver vazio na primeira vez, preenche default do mock para facilitar o teste inicial
      if (Object.keys(data).length === 0 || !data.rasterlink_data_path) {
        data.rasterlink_data_path = 'd:\\www\\2026\\felipe-neneu-portfolio\\dpi-tinta-mimaki\\mock_rasterlink_data\\MijSuite\\Jobs\\RL01\\Mf\\Elm'
      }
      setSettings(prev => ({ ...prev, ...data }))
    })
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSelectFolder = async () => {
    const path = await window.api.openFolderDialog()
    if (path) handleChange('rasterlink_data_path', path)
  }

  const handleSave = async () => {
    setSaving(true)
    await window.api.settingsSave(settings)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleApiTest = async () => {
    if (!settings.next_api_url) {
      alert('Preencha a URL da API primeiro.')
      return
    }
    const res = await window.api.exportApi()
    if (res.error) alert(`Erro no teste: ${res.error}`)
    else alert(`API respondeu OK. Enviados: ${res.count}`)
  }

  const handleBackup = async () => {
    const res = await window.api.backupDatabase()
    if (res.success) {
      alert(`Backup salvo em:\n${res.path}`)
    } else if (res.error !== 'Cancelado pelo usuário') {
      alert(`Erro ao fazer backup: ${res.error}`)
    }
  }

  return (
    <>
      <TopBar title="Configurações" />
      <div className="p-8 max-w-4xl space-y-8 pb-20">
        
        {/* Diretório */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Diretório do RasterLink</h3>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={settings.rasterlink_data_path}
              onChange={e => handleChange('rasterlink_data_path', e.target.value)}
              className="flex-1 bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors font-mono"
              placeholder="Ex: C:\MijSuite\Jobs\RL01\Mf\Elm"
            />
            <button 
              onClick={handleSelectFolder}
              className="bg-bg-elevated hover:bg-bg-border border border-bg-border px-4 rounded-md text-sm font-medium transition-colors"
            >
              Procurar
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">Aponte para a pasta <code className="text-brand-pink">Mf\Elm</code> onde ficam os jobs.</p>
        </section>

        {/* Custos */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6">
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
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Branco</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={settings.ink_price_per_cc_white}
                  onChange={e => handleChange('ink_price_per_cc_white', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Verniz</label>
                <input 
                  type="number" step="0.01" min="0"
                  value={settings.ink_price_per_cc_varnish}
                  onChange={e => handleChange('ink_price_per_cc_varnish', e.target.value)}
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
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
                  className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* API Next.js */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Integração ERP / API Next.js</h3>
            <button 
              onClick={handleApiTest}
              className="text-xs text-brand-pink hover:text-brand-pink/80 font-medium"
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
                className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Chave de API (Bearer Token)</label>
              <input 
                type="password" 
                value={settings.next_api_key}
                onChange={e => handleChange('next_api_key', e.target.value)}
                placeholder="Sua chave secreta..."
                className="w-full bg-bg-base border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:border-brand-purple outline-none"
              />
            </div>
          </div>
        </section>

        {/* Backup do Banco */}
        <section className="bg-bg-surface border border-bg-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-2">Backup do Banco de Dados</h3>
          <p className="text-xs text-text-muted mb-4">
            Salva uma cópia do arquivo <code className="text-brand-pink">mimaki.db</code> com todos os jobs e configurações.
          </p>
          <button 
            onClick={handleBackup}
            className="bg-brand-pink hover:bg-brand-pink/80 text-white font-medium px-5 py-2 rounded-md shadow-sm transition-all text-sm"
          >
            Fazer Backup
          </button>
        </section>

        {/* Footer actions */}
        <div className="flex justify-end items-center gap-4 pt-4 border-t border-bg-border">
          {saved && <span className="text-success text-sm font-medium">Salvo com sucesso!</span>}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-purple hover:bg-brand-purple/80 text-white font-medium px-6 py-2.5 rounded-md shadow-sm transition-all"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

      </div>
    </>
  )
}
