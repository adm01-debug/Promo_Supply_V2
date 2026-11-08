import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';

export interface AllowedCountry {
  id: string;
  country_code: string;
  country_name: string;
  added_at: string;
  added_by: string | null;
  is_active: boolean;
}

export interface GeoSettings {
  id: string;
  geo_restriction_enabled: boolean;
  restriction_mode: 'whitelist' | 'blacklist';
  updated_at: string;
  updated_by: string | null;
}

// Common countries list for quick selection
export const COMMON_COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Espanha' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colômbia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Peru' },
  { code: 'UY', name: 'Uruguai' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'FR', name: 'França' },
  { code: 'IT', name: 'Itália' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CA', name: 'Canadá' },
  { code: 'JP', name: 'Japão' },
  { code: 'CN', name: 'China' },
  { code: 'AU', name: 'Austrália' },
  { code: 'NL', name: 'Holanda' },
  { code: 'BE', name: 'Bélgica' },
];

export const useGeoRestriction = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch geo settings
  const { data: geoSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['geo-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geo_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as GeoSettings;
    },
    enabled: !!user,
  });

  // Fetch allowed countries
  const { data: allowedCountries, isLoading: countriesLoading } = useQuery({
    queryKey: ['allowed-countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allowed_countries')
        .select('*')
        .order('country_name');
      
      if (error) throw error;
      return data as AllowedCountry[];
    },
    enabled: !!user,
  });

  // Toggle geo restriction
  const toggleRestriction = useMutation({
    mutationFn: async (enabled: boolean) => {
      // HIGH-C6: guard against updating with empty id when settings haven't loaded
      if (!geoSettings?.id) {
        throw new Error('Configurações de geo-restrição ainda não carregaram. Aguarde e tente novamente.');
      }
      const { error } = await supabase
        .from('geo_settings')
        .update({
          geo_restriction_enabled: enabled,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', geoSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geo-settings'] });
    },
  });

  // Add country to whitelist
  const addCountry = useMutation({
    mutationFn: async ({ country_code, country_name }: { country_code: string; country_name: string }) => {
      const { error } = await supabase
        .from('allowed_countries')
        .insert({
          country_code,
          country_name,
          added_by: user?.id,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-countries'] });
    },
  });

  // Remove country from whitelist
  const removeCountry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('allowed_countries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-countries'] });
    },
  });

  // Toggle country active status
  const toggleCountryActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('allowed_countries')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowed-countries'] });
    },
  });

  return {
    geoSettings,
    allowedCountries,
    isLoading: settingsLoading || countriesLoading,
    toggleRestriction,
    addCountry,
    removeCountry,
    toggleCountryActive,
    isAdmin,
  };
};
