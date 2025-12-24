'use client';

import { useState } from 'react';

interface SafeImageProps {
    src: string;
    alt: string;
    fallback?: string;
    style?: React.CSSProperties;
    className?: string;
}

export default function SafeImage({
    src,
    alt,
    fallback = '/default-product.jpg',
    style,
    className
}: SafeImageProps) {
    const [imgSrc, setImgSrc] = useState(src);

    return (
        <img
            src={imgSrc}
            alt={alt}
            style={style}
            className={className}
            onError={() => setImgSrc(fallback)}
        />
    );
}
