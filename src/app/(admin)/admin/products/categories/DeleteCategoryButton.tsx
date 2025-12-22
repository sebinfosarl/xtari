'use client';

import { Trash2 } from 'lucide-react';
import { deleteCategoryAction } from '@/app/actions';
import styles from '../../Admin.module.css';

interface DeleteCategoryButtonProps {
    categoryId: string;
    onDelete?: (id: string) => Promise<void>;
}

export default function DeleteCategoryButton({ categoryId, onDelete }: DeleteCategoryButtonProps) {
    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this category? This will also delete all subcategories.')) {
            if (onDelete) {
                await onDelete(categoryId);
            } else {
                await deleteCategoryAction(categoryId);
            }
        }
    };

    return (
        <button onClick={handleDelete} className={styles.deleteBtn} type="button">
            <Trash2 size={16} />
        </button>
    );
}
