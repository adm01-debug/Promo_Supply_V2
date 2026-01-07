import * as React from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholder?: 'blur' | 'skeleton' | 'none';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string;
}

export function LazyImage({
  src,
  alt,
  fallback = '/placeholder.svg',
  placeholder = 'skeleton',
  blurDataURL,
  onLoad,
  onError,
  aspectRatio,
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallback : (isInView ? src : undefined);

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      {/* Placeholder */}
      {placeholder === 'skeleton' && !isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <img
          src={blurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}

// Optimized avatar image
interface LazyAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function LazyAvatar({
  src,
  alt,
  fallback,
  size = 'md',
  className,
}: LazyAvatarProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const initials = alt
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium",
          sizeClasses[size],
          className
        )}
      >
        {fallback || initials}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-full overflow-hidden", sizeClasses[size], className)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

// Progressive image loading
interface ProgressiveImageProps {
  lowResSrc: string;
  highResSrc: string;
  alt: string;
  className?: string;
}

export function ProgressiveImage({
  lowResSrc,
  highResSrc,
  alt,
  className,
}: ProgressiveImageProps) {
  const [highResLoaded, setHighResLoaded] = React.useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Low res (always visible until high res loads) */}
      <img
        src={lowResSrc}
        alt={alt}
        className={cn(
          "w-full h-full object-cover blur-sm scale-105 transition-opacity duration-500",
          highResLoaded ? "opacity-0" : "opacity-100"
        )}
      />
      
      {/* High res */}
      <img
        src={highResSrc}
        alt={alt}
        onLoad={() => setHighResLoaded(true)}
        loading="lazy"
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
          highResLoaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
