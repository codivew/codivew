import type { ComponentChildren, VNode } from 'preact';

export const SURFACE_BASE_CLASSES =
  'rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)] print:break-inside-avoid';
export const SURFACE_CLASSES = `${SURFACE_BASE_CLASSES} mb-4`;
export const PANEL_CLASSES = `${SURFACE_CLASSES} p-5 max-[700px]:p-4`;

const PANEL_HEADING_CLASSES =
  'mb-3 text-[13px]/5 font-bold tracking-[0.08em] text-[var(--muted-strong)] uppercase';
const SECTION_HEADING_CLASSES = 'text-xl leading-tight font-bold tracking-[-0.02em]';
const EMPTY_CLASSES =
  'rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-subtle)] px-5 py-7 text-center text-[var(--muted)]';

export function Panel({ title, children }: { title: string; children: ComponentChildren }): VNode {
  return (
    <section class={PANEL_CLASSES}>
      <PanelHeading>{title}</PanelHeading>
      {children}
    </section>
  );
}

export function PanelHeading({ children }: { children: ComponentChildren }): VNode {
  return <h2 class={PANEL_HEADING_CLASSES}>{children}</h2>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
}): VNode {
  return (
    <div class="mt-9 mb-4 flex items-end justify-between gap-4 max-[700px]:items-start">
      <div>
        <p class="mb-1 text-[11px]/4 font-bold tracking-[0.14em] text-[var(--accent)] uppercase">
          {eyebrow}
        </p>
        <h2 class={SECTION_HEADING_CLASSES}>{title}</h2>
        <p class="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      {count === undefined ? null : (
        <span class="shrink-0 rounded-full bg-[var(--panel-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--muted-strong)] ring-1 ring-[var(--line)]">
          {count}
        </span>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ComponentChildren }): VNode {
  return (
    <div class={EMPTY_CLASSES}>
      <span class="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-[var(--accent-soft)] font-bold text-[var(--accent)]">
        ✓
      </span>
      <p>{children}</p>
    </div>
  );
}

export function MetadataList({ children }: { children: ComponentChildren }): VNode {
  return (
    <dl class="grid grid-cols-[104px_1fr] gap-x-4 gap-y-2 text-sm max-[700px]:grid-cols-[92px_1fr]">
      {children}
    </dl>
  );
}

export function MetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): VNode {
  return (
    <>
      <dt class="font-medium text-[var(--muted)]">{label}</dt>
      <dd
        class={`min-w-0 font-semibold [overflow-wrap:anywhere] ${mono ? 'font-mono text-[13px]' : ''}`}
      >
        {value}
      </dd>
    </>
  );
}

export function OptionalMetadataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}): VNode | null {
  return value === undefined || value.length === 0 ? null : (
    <MetadataRow label={label} value={value} mono={mono} />
  );
}

export function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}. ${month}. ${day}. ${hours}:${minutes}:${seconds}`;
}
