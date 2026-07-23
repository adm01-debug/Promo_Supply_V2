import { describe, it, expect } from 'vitest';
import {
  adaptToLegacy,
  getTipoLabel,
  getTipoBadgeColor,
  getProdutoLabel,
  type LegacyFornecedor,
} from '../fornecedorHelpers';
import type { Fornecedor } from '@/hooks/useFornecedores';

const makeFornecedor = (overrides: Partial<Fornecedor> = {}): Fornecedor => (({
  id: 'f1',
  codigo: 'FORN001',
  razao_social: 'Empresa ABC Ltda',
  nome_fantasia: 'ABC',
  cnpj: '12.345.678/0001-99',
  tipo: 'fabricante',
  status: 'ativo',
  segmento: 'Brindes',
  email: 'contato@abc.com',
  telefone: '11999998888',
  integrado_api: false,
  avaliacao: 4.5,
  tenant_id: 'tenant-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  cep: null,
  cidade: null,
  condicoes_pagamento: null,
  created_by: null,
  endereco: null,
  estado: null,
  limite_credito: null,
  observacoes: null,
  organization_id: null,
  prazo_medio_entrega: null,
  saldo_comprometido: null,
  website: null,
  ...overrides,
});

describe('fornecedorHelpers', () => {
  describe('adaptToLegacy', () => {
    it('maps id correctly', () => {
      const result = adaptToLegacy(makeFornecedor({ id: 'test-id' }));
      expect(result.id).toBe('test-id');
    });

    it('uses nome_fantasia when present', () => {
      const result = adaptToLegacy(makeFornecedor({ nome_fantasia: 'FantasyName' }));
      expect(result.nomeFantasia).toBe('FantasyName');
      expect(result.nome_fantasia).toBe('FantasyName');
    });

    it('falls back to razao_social when nome_fantasia is null', () => {
      const result = adaptToLegacy(makeFornecedor({ nome_fantasia: null }));
      expect(result.nomeFantasia).toBe('Empresa ABC Ltda');
      expect(result.nome_fantasia).toBe('Empresa ABC Ltda');
    });

    it('maps razao_social to both fields', () => {
      const result = adaptToLegacy(makeFornecedor({ razao_social: 'ACME Corp' }));
      expect(result.razao_social).toBe('ACME Corp');
      expect(result.razaoSocial).toBe('ACME Corp');
    });

    it('maps cnpj (with nullish fallback)', () => {
      const result = adaptToLegacy(makeFornecedor({ cnpj: '00.000.000/0001-00' }));
      expect(result.cnpj).toBe('00.000.000/0001-00');
    });

    it('returns empty string when cnpj is null', () => {
      const result = adaptToLegacy(makeFornecedor({ cnpj: null }));
      expect(result.cnpj).toBe('');
    });

    it('maps tipo internacional to IMPORTADORA', () => {
      const result = adaptToLegacy(makeFornecedor({ tipo: 'internacional' }));
      expect(result.tipo).toBe('IMPORTADORA');
    });

    it('maps tipo local to DISTRIBUIDORA', () => {
      const result = adaptToLegacy(makeFornecedor({ tipo: 'local' }));
      expect(result.tipo).toBe('DISTRIBUIDORA');
    });

    it('maps tipo fabricante to FABRICANTE', () => {
      const result = adaptToLegacy(makeFornecedor({ tipo: 'fabricante' }));
      expect(result.tipo).toBe('FABRICANTE');
    });

    it('puts segmento in ramos array', () => {
      const result = adaptToLegacy(makeFornecedor({ segmento: 'Eletrônicos' }));
      expect(result.ramos).toEqual(['Eletrônicos']);
    });

    it('returns empty ramos when segmento is null', () => {
      const result = adaptToLegacy(makeFornecedor({ segmento: null }));
      expect(result.ramos).toEqual([]);
    });

    it('always sets vendeProduto to AMBOS', () => {
      expect(adaptToLegacy(makeFornecedor()).vendeProduto).toBe('AMBOS');
    });

    it('maps email correctly', () => {
      const result = adaptToLegacy(makeFornecedor({ email: 'test@test.com' }));
      expect(result.email).toBe('test@test.com');
    });

    it('returns empty string when email is null', () => {
      const result = adaptToLegacy(makeFornecedor({ email: null }));
      expect(result.email).toBe('');
    });

    it('maps telefone to both telefone and whatsapp', () => {
      const result = adaptToLegacy(makeFornecedor({ telefone: '11988887777' }));
      expect(result.telefone).toBe('11988887777');
      expect(result.whatsapp).toBe('11988887777');
    });

    it('sets apiIntegrada true when integrado_api is true', () => {
      const result = adaptToLegacy(makeFornecedor({ integrado_api: true }));
      expect(result.apiIntegrada).toBe(true);
    });

    it('sets apiIntegrada false when integrado_api is null', () => {
      const result = adaptToLegacy(makeFornecedor({ integrado_api: null }));
      expect(result.apiIntegrada).toBe(false);
    });

    it('rounds avaliacao to integer for rating', () => {
      const result = adaptToLegacy(makeFornecedor({ avaliacao: 3.7 }));
      expect(result.rating).toBe(4);
    });

    it('defaults rating to 0 when avaliacao is null', () => {
      const result = adaptToLegacy(makeFornecedor({ avaliacao: null }));
      expect(result.rating).toBe(0);
    });

    it('sets totalMes to 0', () => {
      expect(adaptToLegacy(makeFornecedor()).totalMes).toBe(0);
    });

    it('sets ultimaCompra to dash', () => {
      expect(adaptToLegacy(makeFornecedor()).ultimaCompra).toBe('-');
    });
  });

  describe('getTipoLabel', () => {
    it('returns Importadora for IMPORTADORA', () => {
      expect(getTipoLabel('IMPORTADORA')).toBe('Importadora');
    });

    it('returns Fabricante for FABRICANTE', () => {
      expect(getTipoLabel('FABRICANTE')).toBe('Fabricante');
    });

    it('returns Distribuidora for DISTRIBUIDORA', () => {
      expect(getTipoLabel('DISTRIBUIDORA')).toBe('Distribuidora');
    });
  });

  describe('getTipoBadgeColor', () => {
    it('returns a CSS class string for IMPORTADORA', () => {
      const color = getTipoBadgeColor('IMPORTADORA');
      expect(typeof color).toBe('string');
      expect(color).toContain('bg-');
    });

    it('returns a CSS class string for FABRICANTE', () => {
      const color = getTipoBadgeColor('FABRICANTE');
      expect(typeof color).toBe('string');
      expect(color).toContain('bg-purple');
    });

    it('returns a CSS class string for DISTRIBUIDORA', () => {
      const color = getTipoBadgeColor('DISTRIBUIDORA');
      expect(typeof color).toBe('string');
      expect(color).toContain('bg-cyan');
    });

    it('returns different colors for each tipo', () => {
      const importadora = getTipoBadgeColor('IMPORTADORA');
      const fabricante = getTipoBadgeColor('FABRICANTE');
      const distribuidora = getTipoBadgeColor('DISTRIBUIDORA');
      expect(importadora).not.toBe(fabricante);
      expect(fabricante).not.toBe(distribuidora);
      expect(importadora).not.toBe(distribuidora);
    });
  });

  describe('getProdutoLabel', () => {
    it('returns Liso for LISO', () => {
      expect(getProdutoLabel('LISO')).toBe('Liso');
    });

    it('returns Personalizado for PERSONALIZADO', () => {
      expect(getProdutoLabel('PERSONALIZADO')).toBe('Personalizado');
    });

    it('returns Liso + Personalizado for AMBOS', () => {
      expect(getProdutoLabel('AMBOS')).toBe('Liso + Personalizado');
    });
  });
});
