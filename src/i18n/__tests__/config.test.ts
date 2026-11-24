import { afterAll, describe, expect, it } from 'vitest';
import i18n, { sincronizarIdiomaDoDocumento } from '@/i18n/config';

const LANG_AO_CARREGAR = document.documentElement.lang;
const langDoDocumento = () => document.documentElement.lang;

const tagEsperada = (lng: string | undefined): string => {
  const base = (lng ?? '').split('-')[0].toLowerCase();
  return base === 'en' || base === 'es' ? base : 'pt-BR';
};

describe('i18n mantem o atributo lang do documento igual ao idioma ativo', () => {
  afterAll(async () => {
    await i18n.changeLanguage('pt');
  });

  it('o atributo nao fica no pt-BR fixo do index.html: ele segue o idioma resolvido', () => {
    expect(LANG_AO_CARREGAR).not.toBe('');
    expect(LANG_AO_CARREGAR).toBe(tagEsperada(i18n.resolvedLanguage ?? i18n.language));
  });

  it('cada idioma suportado vira a tag BCP-47 correspondente no documento', () => {
    sincronizarIdiomaDoDocumento('pt');
    expect(langDoDocumento()).toBe('pt-BR');
    sincronizarIdiomaDoDocumento('pt-BR');
    expect(langDoDocumento()).toBe('pt-BR');
    sincronizarIdiomaDoDocumento('en');
    expect(langDoDocumento()).toBe('en');
    sincronizarIdiomaDoDocumento('en-US');
    expect(langDoDocumento()).toBe('en');
    sincronizarIdiomaDoDocumento('es');
    expect(langDoDocumento()).toBe('es');
  });

  it('idioma fora da lista ou ausente cai no pt-BR, nunca em tag invalida', () => {
    sincronizarIdiomaDoDocumento('fr');
    expect(langDoDocumento()).toBe('pt-BR');
    sincronizarIdiomaDoDocumento(undefined);
    expect(langDoDocumento()).toBe('pt-BR');
  });

  it('trocar o idioma pelo i18n atualiza o documento na hora (WCAG 3.1.2)', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.language).toBe('es');
    expect(langDoDocumento()).toBe('es');

    await i18n.changeLanguage('pt');
    expect(langDoDocumento()).toBe('pt-BR');

    await i18n.changeLanguage('en');
    expect(langDoDocumento()).toBe('en');
  });
});
