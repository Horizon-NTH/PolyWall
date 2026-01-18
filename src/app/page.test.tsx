import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
    default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
        const { src, alt, ...rest } = props;
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
