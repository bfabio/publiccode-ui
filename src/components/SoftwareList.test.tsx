// @vitest-environment jsdom
import React, { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoftwareList } from './SoftwareList';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (id: string, name: string, catalogName: string) => ({
  id,
  name,
  shortDescription: '',
  categories: [],
  releaseDate: '',
  license: null,
  logo: null,
  logoFallback: null,
  developmentStatus: 'stable',
  softwareType: 'standalone/web',
  intendedAudience: [],
  catalogSlug: catalogName.toLowerCase(),
  catalogName,
  catalogId: `catalog-${catalogName}`,
  activity: null,
  searchText: name.toLowerCase(),
  nameLower: name.toLowerCase(),
});

const items = [item('a1', 'OpenProject', 'Italia'), item('b2', 'OpenProject', 'Germany')];
const catalogs = [
  { id: 'catalog-Italia', name: 'Italia', slug: 'italia' },
  { id: 'catalog-Germany', name: 'Germany', slug: 'germany' },
];

let container: HTMLDivElement;
let root: Root | undefined;
let exported: Blob[];

beforeEach(() => {
  history.replaceState(null, '', '/publiccode-ui/software/?view=table');
  exported = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    exported.push(blob);
    return 'blob:test';
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.append(container);

});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
});

const exportCsv = async (props: Partial<React.ComponentProps<typeof SoftwareList>>) => {
  root = createRoot(container);
  await act(async () => {
    root!.render(<SoftwareList items={items} base="/publiccode-ui" {...props} />);
  });
  const button = container.querySelector<HTMLButtonElement>('.catalog-table-export');
  expect(button).not.toBeNull();
  act(() => button!.click());
  expect(exported).toHaveLength(1);
  return (await exported[0].text()).split('\r\n').filter(Boolean);
};

describe('SoftwareList CSV export', () => {
  it('gives every row the absolute URL of its page', async () => {
    const [header, ...rows] = await exportCsv({});
    expect(header.split(',').slice(0, 3)).toEqual(['Name', 'Page', 'Activity score']);
    expect(rows.map((row) => row.split(',').slice(0, 2))).toEqual([
      ['OpenProject', 'http://localhost:3000/publiccode-ui/software/a1'],
      ['OpenProject', 'http://localhost:3000/publiccode-ui/software/b2'],
    ]);
  });

  it('adds the catalog when the list spans several catalogs', async () => {
    const [header, ...rows] = await exportCsv({ catalogs });
    expect(header.split(',').slice(0, 4)).toEqual(['Name', 'Catalog', 'Page', 'Activity score']);
    expect(rows.map((row) => row.split(',').slice(0, 3))).toEqual([
      ['OpenProject', 'Italia', 'http://localhost:3000/publiccode-ui/software/a1'],
      ['OpenProject', 'Germany', 'http://localhost:3000/publiccode-ui/software/b2'],
    ]);
  });
});


describe('SoftwareList hydration', () => {
  it.each([undefined, 'OpenProject'])('applies URL filters while preserving prehydration text %s', async (typed) => {
    const software = [
      { ...item('match', 'OpenProject', 'Germany'), categories: ['project-management'], intendedAudience: ['government'] },
      { ...item('query', 'Other', 'Germany'), categories: ['project-management'], intendedAudience: ['government'] },
      { ...item('category', 'OpenProject', 'Germany'), categories: ['office'], intendedAudience: ['government'] },
      { ...item('status', 'OpenProject', 'Germany'), categories: ['project-management'], intendedAudience: ['government'], developmentStatus: 'beta' },
      { ...item('type', 'OpenProject', 'Germany'), categories: ['project-management'], intendedAudience: ['government'], softwareType: 'library' },
      { ...item('audience', 'OpenProject', 'Germany'), categories: ['project-management'], intendedAudience: ['business'] },
      { ...item('catalog', 'OpenProject', 'Italia'), categories: ['project-management'], intendedAudience: ['government'] },
    ];
    const element = <SoftwareList items={software} catalogs={catalogs} base="/publiccode-ui" />;
    // Static builds have no request URL, regardless of the visitor's filters.
    history.replaceState(null, '', '/publiccode-ui/software/');
    container.innerHTML = renderToString(element);
    expect(container.querySelector('.catalog-table')).toBeNull();
    const field = container.querySelector<HTMLInputElement>('input[name="q"]')!;
    expect(field.value).toBe('');
    history.replaceState(null, '', '/publiccode-ui/software/?q=' + (typed ? 'Other' : 'OpenProject') + '&category=project-management&status=stable&type=standalone%2Fweb&audience=government&catalog=germany&sort_by=name_asc&view=table');
    if (typed) field.value = typed;
    const onRecoverableError = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, element, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    // Retaining the original node also rules out a client rebuild of the island.
    expect(container.querySelector('input[name="q"]')).toBe(field);
    expect(field.value).toBe('OpenProject');
    for (const [name, value] of Object.entries({ category: 'project-management', status: 'stable', type: 'standalone/web', audience: 'government', catalog: 'germany' })) {
      expect(container.querySelector<HTMLSelectElement>(`select[name="${name}"]`)?.value).toBe(value);
    }
    const rows = container.querySelectorAll('.catalog-table tbody tr');
    expect(rows).toHaveLength(1);
    expect(container.querySelector('.catalog-table th')?.getAttribute('aria-sort')).toBe('ascending');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toContain('/software/match');
    const params = new URLSearchParams(location.search);
    expect(params.get('q')).toBe('OpenProject');
    expect(params.get('catalog')).toBe('germany');
    expect(params.get('view')).toBe('table');
  });
});
