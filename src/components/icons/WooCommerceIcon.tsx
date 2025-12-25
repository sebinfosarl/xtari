import React from 'react';

interface WooCommerceIconProps {
    size?: number;
    color?: string;
    className?: string;
}

export default function WooCommerceIcon({ size = 24, color = 'currentColor', className = '' }: WooCommerceIconProps) {
    return (
        <svg
            role="img"
            viewBox="0 0 256 153"
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            fill={color}
            className={className}
        >
            <title>WooCommerce</title>
            <path d="M232.137523,0 L23.7592719,0 C10.5720702,0 -0.103257595,10.7799647 0.000639559736,23.862498 L0.000639559736,103.404247 C0.000639559736,116.591115 10.6767385,127.266612 23.8639402,127.266612 L122.558181,127.266612 L167.667206,152.384995 L157.410382,127.266612 L232.137523,127.266612 C245.325059,127.266612 255.999888,116.591115 255.999888,103.404247 L255.999888,23.862498 C255.999888,10.6752964 245.325059,0 232.137523,0 Z" />
        </svg>
    );
}
