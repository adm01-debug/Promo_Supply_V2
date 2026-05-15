import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  full_name: z.string().nullable(),
  email: z.string().email().nullable(),
  avatar_url: z.string().url().nullable().or(z.literal('')),
  department: z.string().nullable(),
  phone: z.string().nullable(),
  current_organization_id: z.string().uuid().nullable(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

export type Tenant = z.infer<typeof TenantSchema>;
