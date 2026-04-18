import Image from 'next/image';
import Link from 'next/link';
import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MediaKind } from '@/lib/media/media-view-model';

type MediaDetailPreviewProps = {
    title: string;
    kind: MediaKind;
    originalUrl: string | null;
    originalMimeType: string | null;
    renderUrls: { index: number; url: string }[];
};

export function MediaDetailPreview({title, kind, originalUrl, originalMimeType, renderUrls}: MediaDetailPreviewProps) {
    if (!originalUrl) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Aperçu</CardTitle>
                    <CardDescription>Le fichier original n&apos;est pas encore disponible.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const isPresentation = kind === 'presentation';
    const isPdf = kind === 'pdf';
    const hasPresentationRenders = isPresentation && renderUrls.length > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Aperçu</CardTitle>
                <CardDescription>Aperçu du média original.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {kind === 'image' ? (
                    <Image
                        src={originalUrl}
                        alt={title}
                        width={1}
                        height={1}
                        unoptimized
                        sizes="100vw"
                        className="mx-auto block h-auto max-h-140 w-auto max-w-full rounded-md object-contain"
                    />
                ) : null}

                {kind === 'video' ? (
                    <video src={originalUrl} controls className="max-h-140 w-full rounded-md border bg-black"
                           autoPlay={true} />
                ) : null}

                {isPdf ? (
                    <div className="space-y-2">
                        <iframe
                            src={originalUrl}
                            title={title}
                            className="h-140 w-full rounded-md border"
                        />
                        <p className="text-muted-foreground text-xs">
                            Si l&apos;aperçu ne s&apos;affiche pas correctement, utilisez le bouton
                            {' '}
                            <span className="font-medium">Ouvrir l&apos;original</span>
                            .
                        </p>
                    </div>
                ) : null}

                {isPresentation && !hasPresentationRenders ? (
                    <div
                        className="bg-muted flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border px-4 text-center">
                        <FileText className="size-6" />
                        <p className="text-sm">Rendus de présentation indisponibles pour le moment.</p>
                    </div>
                ) : null}

                {kind === 'other' ? (
                    <div
                        className="bg-muted flex min-h-48 flex-col items-center justify-center gap-2 rounded-md border px-4 text-center">
                        <FileText className="size-6" />
                        <p className="text-sm">Aperçu non disponible pour ce type.</p>
                    </div>
                ) : null}

                {hasPresentationRenders ? (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {renderUrls.map((render) => (
                                <Image
                                    key={render.index}
                                    src={render.url}
                                    alt={`Slide ${render.index}`}
                                    width={1}
                                    height={1}
                                    unoptimized
                                    sizes="(max-width: 640px) 100vw, 50vw"
                                    className="h-auto w-full rounded-md border"
                                />
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href={originalUrl} target="_blank" rel="noopener noreferrer">
                            Ouvrir l&apos;original
                        </Link>
                    </Button>
                    <p className="text-muted-foreground text-xs break-all">{originalMimeType ?? 'MIME inconnu'}</p>
                </div>
            </CardContent>
        </Card>
    );
}
