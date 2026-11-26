import { describe, it, expect, vi, beforeEach } from 'vitest';

const createSignedUrl = vi.fn();
const maybeSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) })),
  },
}));

import {
  getStorageTenantId,
  privateStoragePath,
  resolveStoredFileUrl,
  storagePathFromStoredValue,
} from '../storageFiles';

const T = '39838251-a1d7-4437-b47a-7329efe8f68f';
const U = 'a1111111-1111-1111-1111-111111111111';

describe('storageFiles', () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    maybeSingle.mockReset();
  });

  it('monta o caminho {tenant}/{usuário}/... exigido pelas policies', () => {
    expect(privateStoragePath(T, U, 'solicitacoes', 's1', 'a.pdf')).toBe(`${T}/${U}/solicitacoes/s1/a.pdf`);
  });

  it('aceita o caminho salvo (formato atual)', () => {
    expect(storagePathFromStoredValue('comprovantes', `${T}/${U}/p1/1.png`)).toBe(`${T}/${U}/p1/1.png`);
  });

  it('extrai o caminho da URL pública antiga do mesmo bucket', () => {
    const url = `https://lmypcdfsrgfftzhxawao.supabase.co/storage/v1/object/public/comprovantes/${T}/${U}/p1/nota%20fiscal.png`;
    expect(storagePathFromStoredValue('comprovantes', url)).toBe(`${T}/${U}/p1/nota fiscal.png`);
  });

  it('não confunde bucket nem URL externa', () => {
    const outroBucket = `https://x.supabase.co/storage/v1/object/public/documentos/${T}/a.pdf`;
    expect(storagePathFromStoredValue('comprovantes', outroBucket)).toBeNull();
    expect(storagePathFromStoredValue('comprovantes', 'https://exemplo.com/a.pdf')).toBeNull();
    expect(storagePathFromStoredValue('comprovantes', '  ')).toBeNull();
  });

  it('abre caminho e URL antiga por URL assinada; URL externa volta igual', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://assinada' }, error: null });
    await expect(resolveStoredFileUrl('comprovantes', `${T}/${U}/p1/1.png`)).resolves.toBe('https://assinada');
    await expect(
      resolveStoredFileUrl('comprovantes', `https://x.supabase.co/storage/v1/object/public/comprovantes/${T}/${U}/1.png`),
    ).resolves.toBe('https://assinada');
    expect(createSignedUrl).toHaveBeenNthCalledWith(2, `${T}/${U}/1.png`, 3600);
    await expect(resolveStoredFileUrl('comprovantes', 'https://exemplo.com/a.pdf')).resolves.toBe('https://exemplo.com/a.pdf');
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('tenant: usa o do contexto; sem ele, lê profiles.tenant_id', async () => {
    await expect(getStorageTenantId(U, T)).resolves.toBe(T);
    expect(maybeSingle).not.toHaveBeenCalled();
    maybeSingle.mockResolvedValue({ data: { tenant_id: T }, error: null });
    await expect(getStorageTenantId(U, null)).resolves.toBe(T);
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getStorageTenantId(U, null)).resolves.toBeNull();
  });
});
