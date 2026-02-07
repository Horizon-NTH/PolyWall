'use client';

import Link from 'next/link';
import { ArrowUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MediaListFilterValues } from '@/schemas/media-schema';

type MediaFiltersProps = {
    filters: MediaListFilterValues;
    onChange: (next: Partial<MediaListFilterValues>) => void;
    onReset: () => void;
    showReset: boolean;
};

export function MediaFilters({filters, onChange, onReset, showReset}: MediaFiltersProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 basis-full flex-1 md:basis-auto">
                    <Input
                        value={filters.q}
                        onChange={(event) => onChange({q: event.target.value})}
                        placeholder="Rechercher un média..."
                        className="w-full md:w-119"
                    />
                </div>

                <div className="ml-auto flex w-full items-center justify-end gap-2 md:w-auto">
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                        <ArrowUpDown className="size-4" />
                        <span>Tri</span>
                    </div>
                    <Select
                        value={filters.sort}
                        onValueChange={(value) => onChange({sort: value as MediaListFilterValues['sort']})}
                    >
                        <SelectTrigger className="w-full md:w-55">
                            <SelectValue placeholder="Tri" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="updatedAt-desc">MAJ récentes</SelectItem>
                            <SelectItem value="updatedAt-asc">MAJ anciennes</SelectItem>
                            <SelectItem value="createdAt-desc">Créations récentes</SelectItem>
                            <SelectItem value="createdAt-asc">Créations anciennes</SelectItem>
                            <SelectItem value="title-asc">Titre A-Z</SelectItem>
                            <SelectItem value="title-desc">Titre Z-A</SelectItem>
                            <SelectItem value="size-desc">Taille décroissante</SelectItem>
                            <SelectItem value="size-asc">Taille croissante</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Select
                        value={filters.type}
                        onValueChange={(value) => onChange({type: value as MediaListFilterValues['type']})}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les types</SelectItem>
                            <SelectItem value="image">Images</SelectItem>
                            <SelectItem value="video">Vidéos</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="presentation">Présentations</SelectItem>
                            <SelectItem value="other">Autres</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status}
                        onValueChange={(value) => onChange({status: value as MediaListFilterValues['status']})}
                    >
                        <SelectTrigger className="w-45">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="awaiting_upload">En attente d&apos;upload</SelectItem>
                            <SelectItem value="uploaded">Uploadé</SelectItem>
                            <SelectItem value="processing">Traitement</SelectItem>
                            <SelectItem value="ready">Prêt</SelectItem>
                            <SelectItem value="failed">En erreur</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.active}
                        onValueChange={(value) => onChange({active: value as MediaListFilterValues['active']})}
                    >
                        <SelectTrigger className="w-30">
                            <SelectValue placeholder="Actif" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="active">Actifs</SelectItem>
                            <SelectItem value="inactive">Inactifs</SelectItem>
                        </SelectContent>
                    </Select>

                    {showReset ? (
                        <Button variant="ghost" onClick={onReset}>
                            Réinitialiser
                            <X />
                        </Button>
                    ) : null}
                </div>

                <Button asChild className="w-full md:ml-auto md:w-auto">
                    <Link href="/dashboard/media/new">Créer</Link>
                </Button>
            </div>
        </div>
    );
}
