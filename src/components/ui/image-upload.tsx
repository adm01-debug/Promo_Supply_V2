/**
 * Image Upload Component with Automatic Compression
 */

import React, { useState, useCallback, useRef } from 'react';
import { useImageCompression } from '@/hooks/useImageCompression';
import { formatBytes } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';
import { Upload, X, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ImageUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToWebP?: boolean;
  accept?: string;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  showStats?: boolean;
}

interface PreviewImage {
  file: File;
  url: string;
  originalSize: number;
  compressedSize: number;
}

export function ImageUpload({
  onFilesChange,
  maxFiles = 10,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8,
  convertToWebP = true,
  accept = 'image/*',
  className,
  disabled = false,
  showPreview = true,
  showStats = true,
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isCompressing,
    progress,
    totalSaved,
    results,
    error,
    compressMultiple,
    reset,
  } = useImageCompression({
    maxWidth,
    maxHeight,
    quality,
    convertToWebP,
  });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).slice(0, maxFiles - previews.length);
      
      if (fileArray.length === 0) return;

      const compressedResults = await compressMultiple(fileArray);

      const newPreviews: PreviewImage[] = compressedResults.map((result) => ({
        file: result.file,
        url: URL.createObjectURL(result.blob),
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
      }));

      setPreviews((prev) => [...prev, ...newPreviews]);
      onFilesChange([...previews.map((p) => p.file), ...newPreviews.map((p) => p.file)]);
    },
    [compressMultiple, maxFiles, onFilesChange, previews]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const removePreview = useCallback(
    (index: number) => {
      setPreviews((prev) => {
        const newPreviews = [...prev];
        URL.revokeObjectURL(newPreviews[index].url);
        newPreviews.splice(index, 1);
        onFilesChange(newPreviews.map((p) => p.file));
        return newPreviews;
      });
    },
    [onFilesChange]
  );

  const clearAll = useCallback(() => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
    onFilesChange([]);
    reset();
  }, [onFilesChange, previews, reset]);

  const totalOriginalSize = previews.reduce((acc, p) => acc + p.originalSize, 0);
  const totalCompressedSize = previews.reduce((acc, p) => acc + p.compressedSize, 0);
  const savingsPercent = totalOriginalSize > 0 
    ? Math.round((1 - totalCompressedSize / totalOriginalSize) * 100) 
    : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed',
          isCompressing && 'pointer-events-none'
        )}
        onClick={() => !disabled && !isCompressing && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isCompressing}
        />

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          {isCompressing ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Comprimindo imagens... {progress}%
              </p>
              <Progress value={progress} className="w-full max-w-xs" />
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  Arraste imagens ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {convertToWebP ? 'Conversão automática para WebP' : 'Compressão automática'}
                  {maxFiles > 1 && ` • Máximo ${maxFiles} arquivos`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}

      {/* Stats */}
      {showStats && previews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="gap-1">
            <Image className="w-3 h-3" />
            {previews.length} {previews.length === 1 ? 'imagem' : 'imagens'}
          </Badge>
          <Badge variant="outline" className="gap-1">
            Original: {formatBytes(totalOriginalSize)}
          </Badge>
          <Badge variant="outline" className="gap-1 text-primary">
            <Check className="w-3 h-3" />
            Comprimido: {formatBytes(totalCompressedSize)}
          </Badge>
          {savingsPercent > 0 && (
            <Badge className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
              -{savingsPercent}% economia
            </Badge>
          )}
        </div>
      )}

      {/* Previews */}
      {showPreview && previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pré-visualização</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-muted-foreground hover:text-destructive"
            >
              Limpar tudo
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={preview.url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePreview(index);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">
                  {formatBytes(preview.compressedSize)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified image input wrapper with compression
 */
interface CompressedFileInputProps {
  onChange: (files: File[]) => void;
  multiple?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertToWebP?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CompressedFileInput({
  onChange,
  multiple = true,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8,
  convertToWebP = true,
  className,
  children,
}: CompressedFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { compressAndReplace, isCompressing } = useImageCompression({
    maxWidth,
    maxHeight,
    quality,
    convertToWebP,
  });

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const compressed = await compressAndReplace(files);
      onChange(compressed);
      
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [compressAndReplace, onChange]
  );

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isCompressing}
      />
      {children || (
        <Button variant="outline" disabled={isCompressing}>
          {isCompressing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Comprimindo...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload de Imagens
            </>
          )}
        </Button>
      )}
    </div>
  );
}
