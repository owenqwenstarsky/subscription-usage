"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AccountCard } from "@/components/AccountCard";
import { accountDisplayName } from "@/lib/format";
import { UsageAllItem } from "@/lib/types";

export function SortableAccountCard({
  item,
  enabled,
}: {
  item: UsageAllItem;
  enabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.account.id, disabled: !enabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={`min-w-0 ${isDragging ? "relative opacity-70" : ""}`}
    >
      <AccountCard
        item={item}
        isDragging={isDragging}
        dragHandle={
          enabled ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Move ${accountDisplayName(item.account)}`}
              title="Drag to reorder. Press Space to pick up with the keyboard."
              className="flex size-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-950/70 text-zinc-500 transition hover:border-indigo-300/40 hover:bg-indigo-400/10 hover:text-indigo-200 active:cursor-grabbing"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="currentColor">
                <circle cx="6" cy="4" r="1.25" />
                <circle cx="14" cy="4" r="1.25" />
                <circle cx="6" cy="10" r="1.25" />
                <circle cx="14" cy="10" r="1.25" />
                <circle cx="6" cy="16" r="1.25" />
                <circle cx="14" cy="16" r="1.25" />
              </svg>
            </button>
          ) : null
        }
      />
    </div>
  );
}
