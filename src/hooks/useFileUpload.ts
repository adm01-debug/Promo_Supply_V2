import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  path: string;
  url: string;
  fileName: string;
  fileSize: number;
}

export function useFileUpload(options: UploadOptions = {}) {
  const {
    bucket = 'documents',
    folder = '',
    maxSizeMB = 10,
    allowedTypes,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
      return null;
    }

    // Validate type
    if (allowedTypes && !allowedTypes.some(t => file.type.startsWith(t))) {
      toast.error(`Tipo de arquivo não permitido: ${file.type}`);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = folder 
        ? `${folder}/${timestamp}_${safeName}`
        : `${timestamp}_${safeName}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      setProgress(80);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      toast.success('Arquivo enviado com sucesso!');

      return {
        path: data.path,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
      };
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Erro no upload: ${err.message}`);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  }, [bucket, folder, maxSizeMB, allowedTypes]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await upload(file);
      if (result) results.push(result);
    }
    return results;
  }, [upload]);

  const deleteFile = useCallback(async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      if (error) throw error;
      toast.success('Arquivo removido');
      return true;
    } catch (err: any) {
      toast.error(`Erro ao remover: ${err.message}`);
      return false;
    }
  }, [bucket]);

  return { upload, uploadMultiple, deleteFile, uploading, progress };
}
