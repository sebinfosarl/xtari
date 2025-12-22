'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { saveCategoryAction } from '@/app/actions';
import CategoryList from './CategoryList'; // We will update this later or inline it
import styles from '../../Admin.module.css';

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    level?: number; // Optional, calculated for display
    order?: number;
}

interface CategoriesClientProps {
    initialCategories: Category[];
}

export default function CategoriesClient({ initialCategories }: CategoriesClientProps) {
    // We'll use local state for immediate updates, and sync with server
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [isPending, startTransition] = useTransition();

    // Helper to build hierarchy (flattened tree with levels)
    // We do this on the client now to support real-time updates
    const buildHierarchy = (cats: Category[], parentId: string | undefined = undefined, level = 0): any[] => {
        return cats
            .filter(cat => cat.parentId === parentId)
            // Sort by order if available
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(cat => [
                { ...cat, level },
                ...buildHierarchy(cats, cat.id, level + 1)
            ])
            .flat();
    };

    const hierarchicalCategories = buildHierarchy(categories);

    async function handleAddCategory(formData: FormData) {
        // Optimistic update
        const newCategory = {
            id: Math.random().toString(36).substr(2, 9),
            name: formData.get('name') as string,
            slug: formData.get('slug') as string,
            parentId: formData.get('parentId') as string || undefined,
            order: categories.length // Append to end
        };

        setCategories((prev) => [...prev, newCategory]);

        // Call server action
        // We need to wrap saveCategoryAction to return the actual saved category or revalidate
        // For now, since saveCategoryAction revalidates path, we might rely on props update if this was a server component.
        // But since we are maintaining local state, we should ideally fetch fresh data or trust our optimistic update.
        // Let's rely on standard form submission for the "real" save, but we are intercepting it here.

        startTransition(async () => {
            await saveCategoryAction(formData);
            // In a perfect world we'd get the ID back and update, but for now this gives the "instant" feel.
            // The revalidatePath in the action will trigger a refresh of the server component data.
            // BUT, since we are using local state 'categories', that prop change from parent won't automatically update this state 
            // unless we add a useEffect or use a key.
        });
    }

    async function handleDeleteCategory(id: string) {
        // Optimistic delete
        const idsToDelete = [id];

        // Also remove children recursively (since local state doesn't know about server recursion yet)
        const getDescendants = (pId: string) => {
            categories.filter(c => c.parentId === pId).forEach(child => {
                idsToDelete.push(child.id);
                getDescendants(child.id);
            });
        };
        getDescendants(id);

        setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));

        // Call server
        startTransition(async () => {
            await import('@/app/actions').then(mod => mod.deleteCategoryAction(id));
        });
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '2rem', flexWrap: 'wrap' }}>
            <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>Product Categories</h2>
                        <span className={styles.statTrend}>{categories.length} categories total</span>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <CategoryList
                        categories={hierarchicalCategories}
                        allCategories={categories}
                        onCategoriesChange={setCategories}
                        onDeleteCategory={handleDeleteCategory}
                    />
                </div>
            </div>

            <aside className={styles.cardSection}>
                <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>Add Category</h2>
                <form action={handleAddCategory} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Category Name</label>
                        <input name="name" required className={styles.input} placeholder="e.g. Living Room" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Slug</label>
                        <input name="slug" required className={styles.input} placeholder="e.g. living-room" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Parent Category (Optional)</label>
                        <select name="parentId" className={styles.input}>
                            <option value="">None</option>
                            {hierarchicalCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {'\u00A0'.repeat((cat.level || 0) * 3)}{cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isPending}>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} />
                        {isPending ? 'Adding...' : 'Create Category'}
                    </button>
                </form>
            </aside>
        </div>
    );
}
