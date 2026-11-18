import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    ChevronLeft,
    ChevronRight,
    Circle,
    Clock3,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types/clinic';

export function PageHeading({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow?: string;
    title: string;
    description: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
                {eyebrow && (
                    <p className="mb-2 text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[29px]">
                    {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}
export function StatCard({
    label,
    value,
    caption,
    icon: Icon,
    tone = 'green',
}: {
    label: string;
    value: number;
    caption: string;
    icon: LucideIcon;
    tone?: 'green' | 'blue' | 'amber' | 'violet';
}) {
    const tones = {
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
    };
    return (
        <div className="panel p-5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                    {label}
                </span>
                <span
                    className={cn(
                        'flex size-9 items-center justify-center rounded-xl',
                        tones[tone],
                    )}
                >
                    <Icon className="size-[18px]" strokeWidth={1.7} />
                </span>
            </div>
            <p className="mt-2 text-[31px] leading-tight font-semibold tracking-tight tabular-nums">
                {value.toLocaleString()}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">{caption}</p>
        </div>
    );
}
const statusLabels: Record<string, string> = {
    scheduled: 'Scheduled',
    checked_in: 'Checked in',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No-show',
    pending: 'Pending',
    incomplete: 'Incomplete',
    cleared: 'Cleared',
    published: 'Published',
    draft: 'Draft',
};
export function StatusBadge({ status }: { status: string }) {
    const green = ['completed', 'cleared', 'published'].includes(status);
    const blue = ['scheduled', 'checked_in'].includes(status);
    const amber = ['pending', 'incomplete'].includes(status);
    const Icon = green ? Check : blue ? Clock3 : Circle;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium whitespace-nowrap',
                green
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : blue
                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                      : amber
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-muted text-muted-foreground',
            )}
        >
            <Icon className="size-3" />
            {statusLabels[status] ?? status}
        </span>
    );
}
export function StudentAvatar({
    name,
    index = 0,
}: {
    name: string;
    index?: number;
}) {
    const colors = [
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
        'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
        'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
        'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    ];
    return (
        <span
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                colors[index % colors.length],
            )}
        >
            {name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
        </span>
    );
}
export function EmptyState({
    title = 'No records found',
    description = 'Try adjusting your search or filters.',
    icon: Icon = Search,
}: {
    title?: string;
    description?: string;
    icon?: LucideIcon;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
                <Icon
                    className="size-6 text-muted-foreground"
                    strokeWidth={1.5}
                />
            </div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
        </div>
    );
}
export function Pagination({ data }: { data: Paginated<unknown> }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                    {data.from ?? 0}–{data.to ?? 0}
                </span>{' '}
                of {data.total} records
            </p>
            <div className="flex items-center gap-3">
                {data.prev_page_url ? (
                    <Button asChild variant="outline" size="icon">
                        <Link
                            href={data.prev_page_url}
                            preserveScroll
                            aria-label="Previous page"
                        >
                            <ChevronLeft />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="icon"
                        disabled
                        aria-label="Previous page"
                    >
                        <ChevronLeft />
                    </Button>
                )}
                <span className="text-xs text-muted-foreground">
                    {data.current_page} / {data.last_page}
                </span>
                {data.next_page_url ? (
                    <Button asChild variant="outline" size="icon">
                        <Link
                            href={data.next_page_url}
                            preserveScroll
                            aria-label="Next page"
                        >
                            <ChevronRight />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="icon"
                        disabled
                        aria-label="Next page"
                    >
                        <ChevronRight />
                    </Button>
                )}
            </div>
        </div>
    );
}
export function SearchFilters({
    url,
    filters,
    placeholder = 'Search records...',
    children,
}: {
    url: string;
    filters: Record<string, string | undefined>;
    placeholder?: string;
    children?: ReactNode;
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const query: Record<string, string> = {};
        for (const [key, value] of form.entries()) {
            if (typeof value === 'string' && value) query[key] = value;
        }
        router.get(url, query, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }
    return (
        <form
            onSubmit={submit}
            className="flex flex-wrap items-center gap-3 border-b border-border p-4"
        >
            <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                    name="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className="h-10 bg-background pl-10"
                />
            </div>
            {children}
            <Button type="submit" variant="outline" className="h-10">
                <SlidersHorizontal className="size-3.5" />
                Apply
            </Button>
            {Object.values(filters).some(Boolean) && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                        setSearch('');
                        router.get(url, {}, { preserveScroll: true });
                    }}
                >
                    Reset
                </Button>
            )}
        </form>
    );
}
export function Field({
    label,
    error,
    children,
    htmlFor,
}: {
    label: string;
    error?: string;
    children: ReactNode;
    htmlFor?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={htmlFor} className="text-xs font-medium">
                {label}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}
export function SectionHeading({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
            <div>
                <h2 className="text-sm font-semibold">{title}</h2>
                {description && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}
export function dateLabel(value: string, withTime = false) {
    return new Intl.DateTimeFormat(
        'en-PH',
        withTime
            ? {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
              }
            : { month: 'short', day: 'numeric', year: 'numeric' },
    ).format(new Date(value.length === 10 ? value + 'T00:00:00' : value));
}
export function timeLabel(value: string) {
    return new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}
export { ArrowLeft, ArrowRight };
