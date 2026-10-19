import {beforeEach, describe, expect, it, jest} from '@jest/globals';

type RequestConfig = { url: string; method: string; headers: Record<string, string>; data?: unknown };
const request = jest.fn<(config: RequestConfig) => Promise<{ data: unknown; status: number; headers: Record<string, unknown> }>>();

jest.mock('axios', () => ({
    __esModule: true,
    default: {create: () => ({request})},
    isAxiosError: () => false,
}));

async function siteAPI() {
    const {AbstractAPI} = await import('../../services/AbstractAPI');

    class PageAPI extends AbstractAPI {
        public constructor() {
            super('http://site/api', '/pages');
        }

        public get(path: string, headers?: Record<string, string>) {
            return this.request<unknown>(path, {headers});
        }
    }

    return new PageAPI();
}

describe('AbstractAPI trace propagation', () => {
    const pattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-01$/;

    beforeEach(() => {
        jest.spyOn(console, 'debug').mockImplementation(() => undefined);
        request.mockReset();
        request.mockResolvedValue({data: {ok: true}, status: 200, headers: {}});
    });

    it('sends the traceparent of the page with every request, a new span id each time', async () => {
        const api = await siteAPI();

        await api.get('/one');
        await api.get('/two');

        const [first, second] = request.mock.calls.map(call => call[0].headers['traceparent']);
        expect(first).toMatch(pattern);
        expect(second).toMatch(pattern);
        expect(first.split('-')[1]).toBe(second.split('-')[1]);
        expect(first.split('-')[2]).not.toBe(second.split('-')[2]);
        expect(request.mock.calls[0][0].headers['Content-Type']).toBe('application/json');
    });

    it('keeps a traceparent the caller set, whatever its letter case', async () => {
        const api = await siteAPI();
        const explicit = '00-11111111111111111111111111111111-2222222222222222-01';

        await api.get('/one', {Traceparent: explicit});

        expect(request.mock.calls[0][0].headers['Traceparent']).toBe(explicit);
        expect(request.mock.calls[0][0].headers['traceparent']).toBeUndefined();
    });
});
