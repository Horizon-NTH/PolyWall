import { vi } from 'vitest';

const navigationMocks = vi.hoisted(() => {
    const push = vi.fn();
    const replace = vi.fn();
    const refresh = vi.fn();
    const back = vi.fn();
    const forward = vi.fn();
    const prefetch = vi.fn();
    const redirect = vi.fn();
    const notFound = vi.fn();

    let pathname = '/dashboard';
    let searchParams = new URLSearchParams();

    return {
        router: {
            push,
            replace,
            refresh,
            back,
            forward,
            prefetch,
        },
        redirect,
        notFound,
        getPathname: () => pathname,
        setPathname: (value: string) => {
            pathname = value;
        },
        getSearchParams: () => searchParams,
        setSearchParams: (value: string | URLSearchParams) => {
            searchParams = typeof value === 'string'
                ? new URLSearchParams(value)
                : new URLSearchParams(value);
        },
        reset: () => {
            push.mockReset();
            replace.mockReset();
            refresh.mockReset();
            back.mockReset();
            forward.mockReset();
            prefetch.mockReset();
            redirect.mockReset();
            notFound.mockReset();
            pathname = '/dashboard';
            searchParams = new URLSearchParams();
        },
    };
});

vi.mock('next/navigation', () => ({
    useRouter: () => navigationMocks.router,
    usePathname: () => navigationMocks.getPathname(),
    useSearchParams: () => navigationMocks.getSearchParams(),
    redirect: (...args: unknown[]) => navigationMocks.redirect(...args),
    notFound: (...args: unknown[]) => navigationMocks.notFound(...args),
}));

export const routerMock = navigationMocks.router;
export const redirectMock = navigationMocks.redirect;
export const notFoundMock = navigationMocks.notFound;
export const resetNavigationMocks = navigationMocks.reset;
export const setMockPathname = navigationMocks.setPathname;
export const setMockSearchParams = navigationMocks.setSearchParams;
