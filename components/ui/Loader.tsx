import { forwardRef, HTMLAttributes } from 'react';

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
}

export const Loader = forwardRef<HTMLDivElement, LoaderProps>(
  (
    {
      size = 'md',
      variant = 'spinner',
      text,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
      xl: 'w-16 h-16',
    };

    const textSizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    };

    const renderLoader = () => {
      switch (variant) {
        case 'spinner':
          return (
            <div
              className={`${sizes[size]} border-4 border-muted-foreground/20 border-t-primary rounded-full animate-spin`}
            />
          );

        case 'dots':
          return (
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`${
                    size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-5 h-5'
                  } bg-primary rounded-full animate-pulse`}
                  style={{
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          );

        case 'pulse':
          return (
            <div
              className={`${sizes[size]} bg-primary rounded-full animate-pulse`}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div
        ref={ref}
        className={`flex flex-col items-center justify-center gap-3 ${className}`}
        {...props}
      >
        {renderLoader()}
        {text && (
          <p className={`text-muted-foreground ${textSizes[size]}`}>
            {text}
          </p>
        )}
      </div>
    );
  }
);

Loader.displayName = 'Loader';

// Fullscreen Loader
export function FullscreenLoader({
  text,
  size = 'lg',
}: {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader size={size} text={text} />
    </div>
  );
}
