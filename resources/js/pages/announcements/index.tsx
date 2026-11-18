import { Head, useForm } from '@inertiajs/react';
import {
    ArrowUpRight,
    CalendarDays,
    FileText,
    LoaderCircle,
    Megaphone,
    Pencil,
    Plus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    dateLabel,
    EmptyState,
    Field,
    PageHeading,
    Pagination,
    SearchFilters,
    StatCard,
    StatusBadge,
} from '@/components/clinic-ui';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { index, store, update } from '@/routes/announcements';
import type { Announcement, Paginated } from '@/types/clinic';

function AnnouncementDialog({
    announcement,
    onClose,
}: {
    announcement?: Announcement;
    onClose: () => void;
}) {
    const form = useForm({
        title: announcement?.title ?? '',
        body: announcement?.body ?? '',
        audience: announcement?.audience ?? 'students',
        published: !!announcement?.published_at,
    });
    function submit(event: FormEvent) {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };
        if (announcement) form.patch(update.url(announcement.id), options);
        else form.post(store.url(), options);
    }
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[570px]">
                <DialogHeader>
                    <DialogTitle>
                        {announcement
                            ? 'Edit announcement'
                            : 'Create announcement'}
                    </DialogTitle>
                    <DialogDescription>
                        Share clear, timely information with your campus
                        community.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="mt-2 space-y-5">
                    <Field
                        label="Title"
                        htmlFor="notice-title"
                        error={form.errors.title}
                    >
                        <Input
                            id="notice-title"
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            maxLength={150}
                            placeholder="Give your announcement a clear title"
                            required
                        />
                    </Field>
                    <Field
                        label="Announcement"
                        htmlFor="notice-body"
                        error={form.errors.body}
                    >
                        <textarea
                            id="notice-body"
                            className="field-input min-h-40 resize-y"
                            value={form.data.body}
                            onChange={(e) =>
                                form.setData('body', e.target.value)
                            }
                            maxLength={10000}
                            placeholder="What does your audience need to know?"
                            required
                        />
                    </Field>
                    <Field
                        label="Audience"
                        htmlFor="notice-audience"
                        error={form.errors.audience}
                    >
                        <select
                            id="notice-audience"
                            className="field-input"
                            value={form.data.audience}
                            onChange={(e) =>
                                form.setData('audience', e.target.value)
                            }
                        >
                            <option value="students">Students</option>
                            <option value="staff">Clinic staff</option>
                            <option value="everyone">Everyone</option>
                        </select>
                    </Field>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                        <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-primary"
                            checked={form.data.published}
                            onChange={(e) =>
                                form.setData('published', e.target.checked)
                            }
                        />
                        <span>
                            <span className="block text-xs font-medium">
                                Publish announcement
                            </span>
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                                Uncheck to keep this announcement as a draft.
                            </span>
                        </span>
                    </label>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button disabled={form.processing}>
                            {form.processing && (
                                <LoaderCircle className="size-4 animate-spin" />
                            )}
                            {form.data.published
                                ? 'Publish announcement'
                                : 'Save draft'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
export default function Announcements({
    announcements,
    filters,
    counts,
}: {
    announcements: Paginated<Announcement>;
    filters: Record<string, string>;
    counts: { all: number; published: number; draft: number };
}) {
    const [editing, setEditing] = useState<Announcement | undefined>();
    const [open, setOpen] = useState(false);
    const [reading, setReading] = useState<Announcement | null>(null);
    function edit(announcement?: Announcement) {
        setEditing(announcement);
        setOpen(true);
    }
    return (
        <>
            <Head title="Announcements" />
            <div className="clinic-page">
                <PageHeading
                    eyebrow="KEEP YOUR CAMPUS INFORMED"
                    title="Clinic announcements"
                    description="The right information, at the right time. Create and manage updates for your community."
                >
                    <Button onClick={() => edit()}>
                        <Plus className="size-4" />
                        New announcement
                    </Button>
                </PageHeading>
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="All announcements"
                        value={counts.all}
                        caption="Clinic updates and advisories"
                        icon={Megaphone}
                    />
                    <StatCard
                        label="Published"
                        value={counts.published}
                        caption="Notices ready for your community"
                        icon={Users}
                        tone="blue"
                    />
                    <StatCard
                        label="Drafts"
                        value={counts.draft}
                        caption="Updates still being prepared"
                        icon={FileText}
                        tone="amber"
                    />
                </div>
                <section className="panel overflow-visible">
                    <SearchFilters
                        url={index.url()}
                        filters={filters}
                        placeholder="Search clinic announcements..."
                    />
                    {announcements.data.length ? (
                        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                            {announcements.data.map((item) => (
                                <article
                                    key={item.id}
                                    className="flex flex-col rounded-xl border bg-background p-5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/8 text-primary">
                                            <Megaphone className="size-4" />
                                        </span>
                                        <StatusBadge
                                            status={
                                                item.published_at
                                                    ? 'published'
                                                    : 'draft'
                                            }
                                        />
                                    </div>
                                    <h2 className="mt-5 text-sm leading-relaxed font-semibold">
                                        {item.title}
                                    </h2>
                                    <p className="mt-3 line-clamp-3 text-xs leading-6 text-muted-foreground">
                                        {item.body}
                                    </p>
                                    <div className="mt-auto pt-5">
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <CalendarDays className="size-3" />
                                            {item.published_at
                                                ? dateLabel(item.published_at)
                                                : 'Unpublished draft'}
                                            <span className="ml-auto capitalize">
                                                {item.audience}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setReading(item)}
                                                className="-ml-2 text-xs text-primary"
                                            >
                                                Read announcement
                                                <ArrowUpRight className="size-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => edit(item)}
                                                aria-label={
                                                    'Edit ' + item.title
                                                }
                                            >
                                                <Pencil className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            icon={Megaphone}
                            title="No announcements found"
                            description="Create an announcement or adjust your search."
                        />
                    )}
                    <Pagination data={announcements} />
                </section>
            </div>
            {open && (
                <AnnouncementDialog
                    announcement={editing}
                    onClose={() => setOpen(false)}
                />
            )}
            <Dialog
                open={!!reading}
                onOpenChange={(open) => {
                    if (!open) setReading(null);
                }}
            >
                <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="leading-relaxed">
                            {reading?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {reading?.published_at
                                ? 'Published ' + dateLabel(reading.published_at)
                                : 'Draft announcement'}{' '}
                            · {reading?.audience}
                        </DialogDescription>
                    </DialogHeader>
                    <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                        {reading?.body}
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (reading) edit(reading);
                                setReading(null);
                            }}
                        >
                            <Pencil className="size-3.5" />
                            Edit announcement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
Announcements.layout = {
    breadcrumbs: [{ title: 'Announcements', href: index() }],
};
