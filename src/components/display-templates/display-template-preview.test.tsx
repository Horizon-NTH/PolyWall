import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DisplayTemplatePreview, getZoneLabel } from '@/components/display-templates/display-template-preview';
import { ZoneType } from '@/generated/prisma/enums';

describe('DisplayTemplatePreview', () => {
    it('maps zone types to user-facing labels', () => {
        expect(getZoneLabel(ZoneType.PLAYLIST)).toBe('Playlist');
        expect(getZoneLabel(ZoneType.WIDGET)).toBe('Widget');
        expect(getZoneLabel(ZoneType.STATIC)).toBe('Statique');
    });

    it('renders zones with proportional absolute geometry', () => {
        render(
            <DisplayTemplatePreview
                resolutionX={1920}
                resolutionY={1080}
                zones={[
                    {
                        id: 'zone-playlist',
                        name: 'Main',
                        zoneType: ZoneType.PLAYLIST,
                        orderIndex: 0,
                        positionX: 0,
                        positionY: 0,
                        width: 1520,
                        height: 1080,
                    },
                    {
                        id: 'zone-widget',
                        name: 'Sidebar',
                        zoneType: ZoneType.WIDGET,
                        orderIndex: 2,
                        positionX: 1520,
                        positionY: 0,
                        width: 400,
                        height: 1080,
                    },
                ]}
            />,
        );

        const mainZone = screen.getByText('Main').parentElement;
        const widgetZone = screen.getByText('Sidebar').parentElement;

        expect(mainZone).toHaveStyle({
            left: '0%',
            top: '0%',
            width: '79.16666666666666%',
            height: '100%',
            zIndex: '0',
        });
        expect(widgetZone).toHaveStyle({
            left: '79.16666666666666%',
            width: '20.833333333333336%',
            zIndex: '2',
        });
        expect(screen.getByText('Playlist')).toBeInTheDocument();
        expect(screen.getByText('Widget')).toBeInTheDocument();
    });
});
