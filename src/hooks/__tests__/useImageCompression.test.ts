import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoImageCompression } from '@/hooks/useImageCompression';

// Mock lib/imageCompression
vi.mock('@/lib/imageCompression', () => ({
  compressImage: vi.fn((file) => Promise.resolve({
    file: new File([''], 'compressed.jpg', { type: 'image/jpeg' }),
    originalSize: 100,
    compressedSize: 50,
    format: 'jpeg',
    width: 800,
    height: 600,
  })),
  formatBytes: vi.fn((bytes) => `${bytes} B`),
}));

describe('useAutoImageCompression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process image files when input changes', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useAutoImageCompression());

    const file = new File(['image content'], 'test.png', { type: 'image/png' });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event, callback);
    });

    expect(callback).toHaveBeenCalled();
    const processedFiles = callback.mock.calls[0][0];
    expect(processedFiles[0].name).toBe('compressed.jpg');
  });

  it('should ignore non-image files', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useAutoImageCompression());

    const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
    const event = {
      target: {
        files: [file],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event, callback);
    });

    expect(callback).toHaveBeenCalled();
    const processedFiles = callback.mock.calls[0][0];
    expect(processedFiles[0].name).toBe('test.txt');
  });
});
