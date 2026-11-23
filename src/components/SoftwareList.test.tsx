// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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
let root: Root;
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
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const exportCsv = async (props: Partial<React.ComponentProps<typeof SoftwareList>>) => {
  await act(async () => {
    root.render(<SoftwareList items={items} base="/publiccode-ui" {...props} />);
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
