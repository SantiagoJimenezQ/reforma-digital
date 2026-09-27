import { expect, it, vi } from 'vitest';
import { createSiteAdapter } from './index';

const config = {
  id: 'example',
  name: 'Example',
  enabled: true,
  origins: ['https://example.test'],
  pathPrefix: '/form/',
  homepage: 'https://example.test/form/',
  status: 'experimental',
};
it('keeps a disabled subproject inactive even when its route matches', () => {
  const prepare = vi.fn(() => null);
  const adapter = createSiteAdapter({ ...config, enabled: false }, [
    { id: 'page', matches: () => true, prepare },
  ]);
  expect(adapter.prepare(document, new URL(config.homepage), () => {})).toBeNull();
  expect(prepare).not.toHaveBeenCalled();
});
it('rejects ambiguous page registrations and foreign origins', () => {
  const prepare = vi.fn(() => null);
  const page = { id: 'page', matches: () => true, prepare };
  const adapter = createSiteAdapter(config, [page, { ...page, id: 'other' }]);
  adapter.prepare(document, new URL(config.homepage), () => {});
  adapter.prepare(document, new URL('https://evil.test/form/'), () => {});
  expect(prepare).not.toHaveBeenCalled();
});
it('dispatches to the one matching page', () => {
  const prepare = vi.fn(() => null);
  const adapter = createSiteAdapter(config, [{ id: 'page', matches: () => true, prepare }]);
  adapter.prepare(document, new URL(config.homepage), () => {});
  expect(prepare).toHaveBeenCalledOnce();
});
