'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import styles from '../app/(admin)/admin/Admin.module.css';

interface SearchableSelectProps {
    options: { id: string; name: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    disabled = false,
    placeholder = "Select..."
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchQuery.toLowerCase())
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

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
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
                            placeholder={`Search ${placeholder.toLowerCase()}...`}
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

                    {/* Options List */}
                    <div style={{
                        overflowY: 'auto',
                        maxHeight: '240px'
                    }}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option.name)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        border: 'none',
                                        background: value === option.name ? '#eff6ff' : 'white',
                                        color: value === option.name ? '#2563eb' : '#0f172a',
                                        fontWeight: value === option.name ? 600 : 400,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        fontSize: '0.875rem'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (value !== option.name) {
                                            e.currentTarget.style.background = '#f8fafc';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (value !== option.name) {
                                            e.currentTarget.style.background = 'white';
                                        }
                                    }}
                                >
                                    {option.name}
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
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
