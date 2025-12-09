import React, { useState, useEffect } from 'react';

/**
 * Componente de imagen optimizada con placeholder y lazy loading
 */
const OptimizedImage = ({ src, alt, className, loading = 'eager', onError, style }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Precargar imagen
    const img = new Image();
    img.src = src;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      setHasError(true);
      if (onError) onError({ target: img });
    };
  }, [src, onError]);

  return (
    <div 
      className={`optimized-image-wrapper ${className || ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style
      }}
    >
      {!imageLoaded && !hasError && (
        <div 
          className="image-placeholder"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            borderRadius: '10px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        style={{
          ...style,
          opacity: imageLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        onLoad={() => setImageLoaded(true)}
        onError={(e) => {
          setHasError(true);
          if (onError) onError(e);
        }}
      />
    </div>
  );
};

export default OptimizedImage;
