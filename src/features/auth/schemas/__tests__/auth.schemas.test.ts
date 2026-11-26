import { describe, it, expect } from 'vitest';
import {
  UserProfileSchema,
  RegimeTributarioSchema,
  TenantSchema,
} from '../auth.schemas';

// ─── auth.schemas ─────────────────────────────────────────────────────────────

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

// ── RegimeTributarioSchema ────────────────────────────────────────────────────

describe('RegimeTributarioSchema', () => {
  it('accepts simples_nacional', () => {
    expect(RegimeTributarioSchema.safeParse('simples_nacional').success).toBe(true);
  });

  it('accepts lucro_presumido', () => {
    expect(RegimeTributarioSchema.safeParse('lucro_presumido').success).toBe(true);
  });

  it('accepts lucro_real', () => {
    expect(RegimeTributarioSchema.safeParse('lucro_real').success).toBe(true);
  });

  it('accepts mei', () => {
    expect(RegimeTributarioSchema.safeParse('mei').success).toBe(true);
  });

  it('rejects unknown regime', () => {
    expect(RegimeTributarioSchema.safeParse('unknown_regime').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(RegimeTributarioSchema.safeParse('').success).toBe(false);
  });

  it('rejects null', () => {
    expect(RegimeTributarioSchema.safeParse(null).success).toBe(false);
  });
});

// ── UserProfileSchema ─────────────────────────────────────────────────────────

describe('UserProfileSchema', () => {
  const validProfile = {
    id: VALID_UUID,
    user_id: VALID_UUID,
    full_name: 'Alice Souza',
    email: 'alice@example.com',
    avatar_url: null,
    department: 'TI',
    phone: null,
    current_organization_id: null,
  };

  it('accepts valid full profile', () => {
    expect(UserProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('accepts profile with all nullable fields as null', () => {
    const profile = {
      ...validProfile,
      full_name: null,
      email: null,
      avatar_url: null,
      department: null,
      phone: null,
      current_organization_id: null,
    };
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('accepts empty string for avatar_url', () => {
    const profile = { ...validProfile, avatar_url: '' };
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('accepts valid URL for avatar_url', () => {
    const profile = { ...validProfile, avatar_url: 'https://cdn.example.com/avatar.png' };
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('rejects invalid UUID for id', () => {
    expect(UserProfileSchema.safeParse({ ...validProfile, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects invalid UUID for user_id', () => {
    expect(UserProfileSchema.safeParse({ ...validProfile, user_id: 'bad' }).success).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(UserProfileSchema.safeParse({ ...validProfile, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects invalid URL for avatar_url (non-empty string that is not URL)', () => {
    expect(UserProfileSchema.safeParse({ ...validProfile, avatar_url: 'not-a-url' }).success).toBe(false);
  });

  it('accepts optional empresa_default_id as undefined', () => {
    const profile = { ...validProfile };
    delete (profile as Record<string, unknown>)['empresa_default_id'];
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('accepts empresa_default_id as valid UUID', () => {
    const profile = { ...validProfile, empresa_default_id: VALID_UUID };
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });

  it('accepts empresa_default_id as null', () => {
    const profile = { ...validProfile, empresa_default_id: null };
    expect(UserProfileSchema.safeParse(profile).success).toBe(true);
  });
});

// ── TenantSchema ──────────────────────────────────────────────────────────────

describe('TenantSchema', () => {
  const validTenant = {
    id: VALID_UUID,
    name: 'Acme Corp',
    slug: 'acme-corp',
  };

  it('accepts minimal tenant (only required fields)', () => {
    expect(TenantSchema.safeParse(validTenant).success).toBe(true);
  });

  it('accepts full tenant with all optional fields', () => {
    const tenant = {
      ...validTenant,
      cnpj: '12.345.678/0001-99',
      razao_social: 'Acme Corporation LTDA',
      nome_fantasia: 'Acme',
      uf: 'SP',
      regime_tributario: 'simples_nacional' as const,
      cor_identificacao: '#FF5733',
      empresa_codigo: 'EMP001',
      organization_id: VALID_UUID,
    };
    expect(TenantSchema.safeParse(tenant).success).toBe(true);
  });

  it('rejects tenant missing required id', () => {
    const { id: _, ...rest } = validTenant;
    expect(TenantSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects tenant missing required name', () => {
    const { name: _, ...rest } = validTenant;
    expect(TenantSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects tenant missing required slug', () => {
    const { slug: _, ...rest } = validTenant;
    expect(TenantSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid UUID for id', () => {
    expect(TenantSchema.safeParse({ ...validTenant, id: 'bad-id' }).success).toBe(false);
  });

  it('accepts regime_tributario as null', () => {
    const tenant = { ...validTenant, regime_tributario: null };
    expect(TenantSchema.safeParse(tenant).success).toBe(true);
  });

  it('accepts regime_tributario as valid enum value', () => {
    const tenant = { ...validTenant, regime_tributario: 'mei' };
    expect(TenantSchema.safeParse(tenant).success).toBe(true);
  });

  it('rejects invalid regime_tributario value', () => {
    const tenant = { ...validTenant, regime_tributario: 'invalid_regime' };
    expect(TenantSchema.safeParse(tenant).success).toBe(false);
  });

  it('accepts organization_id as null', () => {
    const tenant = { ...validTenant, organization_id: null };
    expect(TenantSchema.safeParse(tenant).success).toBe(true);
  });

  it('rejects invalid UUID for organization_id', () => {
    const tenant = { ...validTenant, organization_id: 'not-a-uuid' };
    expect(TenantSchema.safeParse(tenant).success).toBe(false);
  });
});
