import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { MediaDetailPreview } from '@/components/media/media-detail-preview';

describe('MediaDetailPreview', () => {
    it('shows unavailable state when original file is missing', () => {
        render(
            <MediaDetailPreview
                title="Affiche"
                kind="image"
                originalUrl={null}
                originalMimeType={null}
                renderUrls={[]}
            />,
        );

        expect(screen.getByText('Le fichier original n\'est pas encore disponible.')).toBeInTheDocument();
    });

    it('renders image preview and original link', () => {
        render(
            <MediaDetailPreview
                title="Affiche"
                kind="image"
                originalUrl="https://cdn.example.com/image.png"
                originalMimeType="image/png"
                renderUrls={[]}
            />,
        );

        expect(screen.getByRole('img', {name: 'Affiche'})).toHaveAttribute('src', 'https://cdn.example.com/image.png');
        expect(screen.getByRole('link', {name: 'Ouvrir l\'original'})).toHaveAttribute(
            'href',
            'https://cdn.example.com/image.png',
        );
        expect(screen.getByText('image/png')).toBeInTheDocument();
    });

    it('renders presentation fallback when no rendered slides are available', () => {
        render(
            <MediaDetailPreview
                title="Deck"
                kind="presentation"
                originalUrl="https://cdn.example.com/file.pptx"
                originalMimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"
                renderUrls={[]}
            />,
        );

        expect(screen.getByText('Rendus de présentation indisponibles pour le moment.')).toBeInTheDocument();
    });

    it('renders slides for presentation when render files exist', () => {
        render(
            <MediaDetailPreview
                title="Deck"
                kind="presentation"
                originalUrl="https://cdn.example.com/file.pptx"
                originalMimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"
                renderUrls={[
                    {index: 1, url: 'https://cdn.example.com/slide-1.jpg'},
                    {index: 2, url: 'https://cdn.example.com/slide-2.jpg'},
                ]}
            />,
        );

        expect(screen.getByRole('img', {name: 'Slide 1'})).toHaveAttribute('src', 'https://cdn.example.com/slide-1.jpg');
        expect(screen.getByRole('img', {name: 'Slide 2'})).toHaveAttribute('src', 'https://cdn.example.com/slide-2.jpg');
    });
});
