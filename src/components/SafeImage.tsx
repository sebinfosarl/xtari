'use client';

import { useState, useEffect } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    fallbackSrc?: string;
}

export default function SafeImage({
    src,
    alt,
    fallbackSrc = '/default-product.jpg',
    className,
    ...props
}: SafeImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);

    useEffect(() => {
        setImgSrc(src || fallbackSrc);
    }, [src, fallbackSrc]);

    return (
        <img
            {...props}
            src={imgSrc}
            alt={alt || 'Product Image'}
            className={className}
            onError={() => setImgSrc(fallbackSrc)}
        />
    );
}
