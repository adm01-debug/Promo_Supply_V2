/**
 * Hook for image compression with progress and status tracking
 */

import { useState, useCallback } from 'react';
import {
  compressImage,
  compressImages,
  CompressionOptions,
  CompressedImage,
  formatBytes,
} from '@/lib/imageCompression';

interface UseImageCompressionOptions extends CompressionOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (results: CompressedImage[]) => void;
  onError?: (error: Error) => void;
}

interface CompressionState {
  isCompressing: boolean;
  progress: number;
  results: CompressedImage[];
  error: Error | null;
  totalSaved: number;
}

export function useImageCompression(options: UseImageCompressionOptions = {}) {
  const [state, setState] = useState<CompressionState>({
    isCompressing: false,
    progress: 0,
    results: [],
    error: null,
    totalSaved: 0,
  });

  const compressSingle = useCallback(
    async (file: File): Promise<CompressedImage | null> => {
      if (!file.type.startsWith('image/')) {
        return null;
      }

      setState((prev) => ({
        ...prev,
        isCompressing: true,
        progress: 0,
        error: null,
      }));

      try {
        const result = await compressImage(file, options);

        setState((prev) => ({
          ...prev,
          isCompressing: false,
          progress: 100,
          results: [result],
          totalSaved: result.originalSize - result.compressedSize,
        }));

        options.onComplete?.([result]);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Compression failed');
        setState((prev) => ({
          ...prev,
          isCompressing: false,
          error: err,
        }));
        options.onError?.(err);
        return null;
      }
    },
    [options]
  );

  const compressMultiple = useCallback(
    async (files: File[]): Promise<CompressedImage[]> => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        return [];
      }

      setState((prev) => ({
        ...prev,
        isCompressing: true,
        progress: 0,
        results: [],
        error: null,
        totalSaved: 0,
      }));

      const results: CompressedImage[] = [];

      try {
        for (let i = 0; i < imageFiles.length; i++) {
          const result = await compressImage(imageFiles[i], options);
          results.push(result);

          const progress = Math.round(((i + 1) / imageFiles.length) * 100);
          setState((prev) => ({
            ...prev,
            progress,
            results: [...results],
          }));
          options.onProgress?.(progress);
        }

        const totalSaved = results.reduce(
          (acc, r) => acc + (r.originalSize - r.compressedSize),
          0
        );

        setState((prev) => ({
          ...prev,
          isCompressing: false,
          progress: 100,
          results,
          totalSaved,
        }));

        options.onComplete?.(results);
        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Compression failed');
        setState((prev) => ({
          ...prev,
          isCompressing: false,
          error: err,
        }));
        options.onError?.(err);
        return results;
      }
    },
    [options]
  );

  const compressAndReplace = useCallback(
    async (files: File[]): Promise<File[]> => {
      const results: File[] = [];
      
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(file, options);
            results.push(compressed.file);
          } catch {
            // Keep original if compression fails
            results.push(file);
          }
        } else {
          // Keep non-image files as is
          results.push(file);
        }
      }

      return results;
    },
    [options]
  );

  const reset = useCallback(() => {
    setState({
      isCompressing: false,
      progress: 0,
      results: [],
      error: null,
      totalSaved: 0,
    });
  }, []);

  return {
    ...state,
    compressSingle,
    compressMultiple,
    compressAndReplace,
    reset,
    formatBytes,
  };
}

/**
 * Simplified hook for automatic compression on file input change
 */
export function useAutoImageCompression(options: CompressionOptions = {}) {
  const { compressAndReplace } = useImageCompression(options);

  const handleFileChange = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      callback: (files: File[]) => void
    ) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      const processedFiles = await compressAndReplace(files);
      callback(processedFiles);
    },
    [compressAndReplace]
  );

  return { handleFileChange };
}
