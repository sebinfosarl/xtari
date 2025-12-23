'use client';

import { useState, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragMoveEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { reorderCategoriesAction } from '@/app/actions';
import DeleteCategoryButton from './DeleteCategoryButton';
import styles from '../../Admin.module.css';

interface Category {
    id: string;
    name: string;
    slug: string;
    parentId?: string;
    level?: number;
    order?: number;
}

interface CategoryListProps {
    categories: Category[];
    allCategories: Category[];
    onCategoriesChange: (categories: Category[]) => void;
    onDeleteCategory: (id: string) => Promise<void>;
}

const INDENTATION_WIDTH = 48; // Increased for better visual hierarchy

function SortableItem({
    category,
    depth,
    indentationWidth,
    clone,
    onDelete
}: {
    category: Category,
    depth: number,
    indentationWidth: number,
    clone?: boolean,
    onDelete?: (id: string) => Promise<void>
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: category.id, animateLayoutChanges: () => false });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        position: 'relative' as const,
        opacity: isDragging ? 0.3 : 1,
    };

    if (clone) {
        return (
            <div className={styles.tableRow} style={{ ...style, opacity: 1, background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0.75rem', paddingLeft: `${depth * indentationWidth + 16}px` }}>
                <div style={{ marginRight: '0.5rem', color: '#94a3b8' }}>
                    <GripVertical size={16} />
                </div>
                <span className={styles.bold}>{category.name}</span>
            </div>
        );
    }

    return (
        <tr ref={setNodeRef} style={style} className={styles.tableRow}>
            <td style={{ display: 'flex', alignItems: 'center', position: 'relative', paddingLeft: '1rem' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: `${depth * indentationWidth}px`,
                    transition: 'padding-left 0.2s ease',
                    width: '100%',
                    position: 'relative',
                    zIndex: 1
                }}>
                    {/* Visual tree guide line */}
                    {depth > 0 && (
                        <div style={{
                            position: 'absolute',
                            left: `${(depth - 1) * indentationWidth + 24}px`,
                            borderLeft: '2px solid #e2e8f0',
                            borderBottom: '2px solid #e2e8f0',
                            width: '12px',
                            height: '50%',
                            top: 0,
                            borderBottomLeftRadius: '4px',
                            zIndex: 0
                        }} />
                    )}

                    <div {...attributes} {...listeners} style={{ cursor: 'grab', marginRight: '0.8rem', color: '#94a3b8', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                        <GripVertical size={16} />
                    </div>
                    <span className={styles.bold} style={{ color: depth > 0 ? '#475569' : 'inherit', position: 'relative', zIndex: 1 }}>
                        {category.name}
                    </span>
                </div>
            </td>
            <td><code>{category.slug}</code></td>
            <td>
                <DeleteCategoryButton categoryId={category.id} onDelete={onDelete} />
            </td>
        </tr>
    );
}

export default function CategoryList({ categories, allCategories, onCategoriesChange, onDeleteCategory }: CategoryListProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [offsetLeft, setOffsetLeft] = useState(0);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const activeItem = useMemo(() =>
        allCategories.find(c => c.id === activeId),
        [activeId, allCategories]);

    function handleDragStart(event: any) {
        setActiveId(event.active.id);
        setOffsetLeft(0);
    }

    function handleDragMove(event: DragMoveEvent) {
        setOffsetLeft(event.delta.x);
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over, delta } = event;
        setActiveId(null);
        setOffsetLeft(0);

        if (!over) return;

        // Calculate drag depth change
        const dragDepthChange = Math.round(delta.x / INDENTATION_WIDTH);

        // Proceed if items reordered OR if there's a horizontal shift (indentation change)
        if (active.id !== over.id || dragDepthChange !== 0) {
            // Use the VISUAL list for calculations
            const oldIndex = categories.findIndex((item) => item.id === active.id);
            const newIndex = categories.findIndex((item) => item.id === over.id);

            const movedItems = arrayMove(categories, oldIndex, newIndex);

            // Calculate new depth
            const activeItemDisplay = categories[oldIndex];
            const originalDepth = activeItemDisplay?.level || 0;

            let projectedDepth = originalDepth + dragDepthChange;

            // Constrain depth
            const prevItem = movedItems[newIndex - 1];
            const maxDepth = prevItem ? (prevItem.level || 0) + 1 : 0;
            const minDepth = 0;

            if (projectedDepth > maxDepth) projectedDepth = maxDepth;
            if (projectedDepth < minDepth) projectedDepth = minDepth;

            // Find new parent
            let newParentId: string | undefined = undefined;
            if (projectedDepth > 0 && prevItem) {
                if (projectedDepth === (prevItem.level || 0) + 1) {
                    newParentId = prevItem.id;
                } else if (projectedDepth === (prevItem.level || 0)) {
                    newParentId = prevItem.parentId;
                } else {
                    // Walk backwards to find parent
                    for (let i = newIndex - 1; i >= 0; i--) {
                        if ((movedItems[i].level || 0) === projectedDepth - 1) {
                            newParentId = movedItems[i].id;
                            break;
                        }
                    }
                }
            }

            // Sync with allCategories (state)
            const updates = movedItems.map((item, index) => ({
                id: item.id,
                order: index,
                parentId: item.id === active.id ? newParentId : item.parentId
            }));

            const updatedCategories = allCategories.map(c => {
                const update = updates.find(u => u.id === c.id);
                if (update) {
                    return { ...c, parentId: update.parentId, order: update.order };
                }
                return c;
            }).sort((a, b) => (a.order || 0) - (b.order || 0));

            onCategoriesChange(updatedCategories);
            reorderCategoriesAction(updates);
        }
    }

    return (
        <DndContext
            id="categories-dnd-context"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ paddingLeft: '2rem' }}>Category Name</th>
                        <th>Slug</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <SortableContext
                        items={categories.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {categories.map((cat) => (
                            <SortableItem
                                key={cat.id}
                                category={cat}
                                depth={cat.level || 0}
                                indentationWidth={INDENTATION_WIDTH}
                                onDelete={onDeleteCategory}
                            />
                        ))}
                    </SortableContext>
                    {categories.length === 0 && (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>No categories found</td></tr>
                    )}
                </tbody>
            </table>
            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.3',
                        },
                    },
                }),
            }}>
                {activeId && activeItem ? (
                    <SortableItem
                        category={activeItem}
                        depth={0} // Clone shows at root level for clarity
                        indentationWidth={INDENTATION_WIDTH}
                        clone
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
