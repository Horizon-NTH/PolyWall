import React from 'react';
import type { ImageProps } from 'next/image';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
    default: (props: ImageProps) => {
        const cleanedProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => key !== 'priority'),
        ) as ImageProps;
        const {src, alt, ...rest} = cleanedProps;
        return <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} {...rest} />;
    },
}));

import Home from './page';

describe('Home page', () => {
    it('renders the main heading', () => {
        render(<Home />);

        expect(
            screen.getByRole('heading', {
                name: /to get started, edit the page\.tsx file\./i,
            }),
        ).toBeInTheDocument();
    });
});
