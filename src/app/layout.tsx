import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import React from 'react';
import { geistSans } from '@/lib/font';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
    title: {
        default: 'PolyWall',
        template: '%s | PolyWall',
    },
    description: 'Plateforme web de gestion et de diffusion pour affichage dynamique multi-entites.',
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
        <body className={`${geistSans.className} antialiased`}>
        <TooltipProvider>
            {children}
        </TooltipProvider>
        <Toaster />
        </body>
        </html>
    );
}
