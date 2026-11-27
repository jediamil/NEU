import { BellRing, CircleHelp } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';
import type { PortalLiveStatus } from '@/hooks/use-portal-realtime';

export function AppSidebarHeader({
    breadcrumbs = [],
    liveStatus = null,
}: {
    breadcrumbs?: BreadcrumbItemType[];
    liveStatus?: PortalLiveStatus;
}) {
    const [help, setHelp] = useState(false);
    return (
        <>
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/80 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <SidebarTrigger className="-ml-2 text-muted-foreground" />
                    <span className="hidden h-4 border-l sm:block" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className="flex items-center gap-3">
                    <span
                        role="status"
                        aria-live="polite"
                        title={
                            liveStatus === 'Live'
                                ? 'Clinic changes update automatically through Neon Realtime'
                                : 'Clinic portal connection status'
                        }
                        className="hidden items-center gap-1.5 rounded-md border border-primary/10 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex"
                    >
                        <span className="size-1 rounded-full bg-primary" />
                        {liveStatus ?? 'Health Portal'}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Portal help"
                        onClick={() => setHelp(true)}
                    >
                        <CircleHelp className="size-[17px] text-muted-foreground" />
                    </Button>
                </div>
            </header>
            <Dialog open={help} onOpenChange={setHelp}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Your clinic workspace</DialogTitle>
                        <DialogDescription>
                            A quick guide to the NEU Health Portal.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                        <p>
                            Use Appointments to reserve a visit, find a booking
                            reference, and check in students when they arrive.
                        </p>
                        <p>
                            Review enrollment requirements in Medical
                            clearances. Registrar accounts can look up clearance
                            status.
                        </p>
                        <p>
                            Clinic schedule controls shared availability.
                            Announcements stores clinic notices and drafts.
                        </p>
                        <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-xs">
                            <BellRing className="size-4 shrink-0" />
                            Clinic records are shared with the student mobile
                            app. Changes are saved for your next visit.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
