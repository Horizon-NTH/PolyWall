'use client';

import Link from 'next/link';
import { Clock3, FileImage, FileText, FileVideo, FileWarning, HardDrive, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { formatBytes, formatDate } from '@/lib/utils';
import type { MediaFileStatus } from '@/generated/prisma/enums';
import type { MediaKind } from '@/lib/media/media-view-model';

type MediaCardProps = {
    item: {
        id: string;
        title: string;
        description: string;
        active: boolean;
        updatedAt: string;
        kind: MediaKind;
        status: MediaFileStatus;
        thumbUrl: string | null;
        sizeBytes: number | null;
    };
    statusLabel: string;
    kindLabel: string;
    onToggle: () => void;
    onDelete: () => void;
    isPending: boolean;
};

function renderMediaKindIcon(kind: MediaKind, className: string) {
    if (kind === 'image') return <FileImage className={className} />;
    if (kind === 'video') return <FileVideo className={className} />;
    if (kind === 'pdf' || kind === 'presentation') return <FileText className={className} />;
    return <FileWarning className={className} />;
}

function MediaFallback({kind}: { kind: MediaKind }) {
    return renderMediaKindIcon(kind, 'size-10 text-muted-foreground');
}

export function MediaKindIcon({kind}: { kind: MediaKind }) {
    return renderMediaKindIcon(kind, 'size-3.5');
}

export function MediaCard({item, statusLabel, kindLabel, onToggle, onDelete, isPending}: MediaCardProps) {
    return (
        <Card className="overflow-hidden border-border/60 pt-0 transition-shadow hover:shadow-md">
            <div
                className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
                {item.thumbUrl ? (
                    <>
                        <img
                            src={item.thumbUrl}
                            alt={`Aperçu ${item.title}`}
                            className="h-full w-full object-cover"
                        />
                    </>
                ) : (
                    <MediaFallback kind={item.kind} />
                )}
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-3">
                    <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="bg-background/90 text-foreground">
                            <MediaKindIcon kind={item.kind} />
                            <span className="sr-only">{kindLabel}</span>
                        </Badge>
                        <Badge
                            className={item.active ? 'bg-background/90 text-foreground' : 'bg-background/60 text-foreground'}>
                            {item.active ? 'Actif' : 'Inactif'}
                        </Badge>
                    </div>
                </div>
            </div>
            <CardHeader className="space-y-2 pb-2">
                <div className="flex items-start gap-2 min-w-0">
                    <CardTitle
                        className="min-w-0 basis-[60%] sm:basis-[70%] lg:basis-[75%] max-w-[80%] truncate break-all text-base leading-snug"
                        title={item.title}
                    >
                        {item.title}
                    </CardTitle>
                    <div className="ml-auto shrink-0">
                        <DataTableRowActions label="Actions">
                            <DropdownMenuItem asChild disabled={isPending}>
                                <Link href={`/dashboard/media/${item.id}`}>Voir la fiche</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={isPending}>
                                <Link href={`/dashboard/media/${item.id}/edit`}>Modifier</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled={isPending} onClick={onToggle}>
                                {item.active ? 'Désactiver' : 'Activer'}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={isPending} variant="destructive" onClick={onDelete}>
                                Supprimer
                            </DropdownMenuItem>
                        </DataTableRowActions>
                    </div>
                </div>
                {item.description ? (
                    <p
                        className="w-[80%] min-w-0 truncate break-all text-sm text-muted-foreground"
                        title={item.description}
                    >
                        {item.description}
                    </p>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0 text-xs">
                <Badge variant="outline">
                    <LoaderCircle className="size-3.5" />
                    {statusLabel}
                </Badge>
                <Badge variant="outline">
                    <HardDrive className="size-3.5" />
                    {formatBytes(item.sizeBytes)}
                </Badge>
                <Badge variant="outline">
                    <Clock3 className="size-3.5" />
                    {formatDate(new Date(item.updatedAt))}
                </Badge>
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/dashboard/media/${item.id}`}>Ouvrir</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
