import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseElementDirXml, formatMs } from './xmlParser'

// Usa o XML real como fixture de teste
const FIXTURE_PATH = join(__dirname, '../../../tests/fixtures/ElementDir.xml')
const xmlContent = readFileSync(FIXTURE_PATH, 'utf-8')

describe('parseElementDirXml — fixture real', () => {
  it('parseia o XML sem lançar erro', async () => {
    await expect(parseElementDirXml(xmlContent)).resolves.toBeDefined()
  })

  it('extrai o nome do job corretamente', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.jobName).toBe('30782 - joaoa - adesivos - vinil transparente.pdf')
  })

  it('extrai o código do pedido via regex', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.orderCode).toBe('30782')
  })

  it('quantityUnits é null quando não há "unid" no nome', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.quantityUnits).toBeNull()
  })

  it('converte inkUsed para cc corretamente (valor / 1000)', async () => {
    const result = await parseElementDirXml(xmlContent)
    // Valores brutos validados no XML real: C=133, M=214, Y=282, K=138
    expect(result.inkCyanCc).toBeCloseTo(0.133)
    expect(result.inkMagentaCc).toBeCloseTo(0.214)
    expect(result.inkYellowCc).toBeCloseTo(0.282)
    expect(result.inkBlackCc).toBeCloseTo(0.138)
  })

  it('branco e verniz são 0 cc no fixture real', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.inkWhite1Cc).toBe(0)
    expect(result.inkWhite2Cc).toBe(0)
    expect(result.inkVarnish1Cc).toBe(0)
    expect(result.inkVarnish2Cc).toBe(0)
  })

  it('calcula ink_total_cc como soma dos canais', async () => {
    const result = await parseElementDirXml(xmlContent)
    const expected = 0.133 + 0.214 + 0.282 + 0.138 + 0 + 0 + 0 + 0
    expect(result.inkTotalCc).toBeCloseTo(expected, 3)
  })

  it('converte timeCmdPrn em ms corretamente', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.printTimeMs).toBe(238084)
  })

  it('converte timeRIP em ms corretamente', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.ripTimeMs).toBe(10791)
  })

  it('parseia pages como length do array (não o valor interno)', async () => {
    const result = await parseElementDirXml(xmlContent)
    expect(result.pages).toBe(1)
  })

  it('converte paperPoints de pontos para mm', async () => {
    const result = await parseElementDirXml(xmlContent)
    // 2020.776 pts * 25.4/72 = 712.88
    expect(result.widthMm).toBeCloseTo(712.88, 0)
    // 579.429 pts * 25.4/72 = 204.41
    expect(result.heightMm).toBeCloseTo(204.41, 0)
  })

  it('converte spool date de epoch ms para ISO 8601', async () => {
    const result = await parseElementDirXml(xmlContent)
    // epoch 1785431426000
    expect(result.spoolDate).toBe(new Date(1785431426000).toISOString())
  })

  it('converte lastPrintDate de epoch ms para ISO 8601', async () => {
    const result = await parseElementDirXml(xmlContent)
    // epoch 1785431496351
    expect(result.lastPrintDate).toBe(new Date(1785431496351).toISOString())
  })

  it('não gera warnings críticos para o fixture válido', async () => {
    const result = await parseElementDirXml(xmlContent)
    // Sem erros de campo obrigatório ausente
    const critical = result.warnings.filter(
      (w) =>
        w.includes('jobBasisProperty') ||
        w.includes('ripProperty não encontrado') ||
        w.includes('spoolProperty não encontrado')
    )
    expect(critical).toHaveLength(0)
  })
})

describe('parseElementDirXml — XML inválido', () => {
  it('lança erro em XML malformado', async () => {
    await expect(parseElementDirXml('<invalid')).rejects.toThrow()
  })

  it('lança erro em XML sem root ElementDir', async () => {
    await expect(parseElementDirXml('<java><object class="other"/></java>')).rejects.toThrow()
  })

  it('campos ausentes geram warnings mas não travam o parse', async () => {
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<java version="1.8.0_121" class="java.beans.XMLDecoder">
 <object class="jp.mimaki.p2p.cmn.dir.ElementDir">
 </object>
</java>`
    const result = await parseElementDirXml(minimalXml)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.jobName).toBe('Sem nome')
    expect(result.inkCyanCc).toBeNull()
  })
})

describe('formatMs', () => {
  it('retorna "—" para null', () => {
    expect(formatMs(null)).toBe('—')
  })

  it('formata menos de 1 minuto', () => {
    expect(formatMs(45000)).toBe('45s')
  })

  it('formata com minutos e segundos', () => {
    expect(formatMs(238084)).toBe('3min 58s')
  })
})

describe('extração regex do jobName', () => {
  it('extrai quantidade quando há "unid" no nome', async () => {
    const xml = xmlContent.replace(
      '30782 - joaoa - adesivos - vinil transparente.pdf',
      '30782 - joaoa - adesivos - 50 unid - vinil transparente.pdf'
    )
    const result = await parseElementDirXml(xml)
    expect(result.quantityUnits).toBe(50)
  })
})
