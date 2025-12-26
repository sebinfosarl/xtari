'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface SearchableCitySelectProps {
    cities: { id: string; name: string; sectors?: any[] }[];
    value: string;
    onChange: (cityName: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function SearchableCitySelect({
    cities,
    value,
    onChange,
    disabled = false,
    placeholder = "Select City..."
}: SearchableCitySelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (cityName: string) => {
        onChange(cityName);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={styles.inlineInput}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: disabled ? '#f8fafc' : 'white',
                    color: value ? '#0f172a' : '#94a3b8'
                }}
            >
                <span>{value || placeholder}</span>
                <ChevronDown
                    size={16}
                    style={{
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Search Input */}
                    <div style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Search size={16} style={{ color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search city..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            style={{
                                border: 'none',
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.875rem',
                                color: '#0f172a'
                            }}
                        />
                    </div>

                    {/* Cities List */}
                    <div style={{
                        overflowY: 'auto',
                        maxHeight: '240px'
                    }}>
                        {filteredCities.length > 0 ? (
                            filteredCities.map((city) => (
                                <button
                                    key={city.id}
                                    type="button"
                                    onClick={() => handleSelect(city.name)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        border: 'none',
                                        background: value === city.name ? '#eff6ff' : 'white',
                                        color: value === city.name ? '#2563eb' : '#0f172a',
                                        fontWeight: value === city.name ? 600 : 400,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        fontSize: '0.875rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== city.name) {
                                            e.currentTarget.style.background = '#f8fafc';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== city.name) {
                                            e.currentTarget.style.background = 'white';
                                        }
                                    }}
                                >
                                    {city.name}
                                </button>
                            ))
                        ) : (
                            <div style={{
                                padding: '1.5rem',
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                                fontStyle: 'italic'
                            }}>
                                No cities found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
