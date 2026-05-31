import type { SoftwareActivity, CatalogActivity, ForgeMetric } from '../types/analysis';

const SUPPORTED_VERSION = 1;

export function parseSoftwareActivity(analysis: unknown): SoftwareActivity | null {
  const activity = (analysis as { activity?: SoftwareActivity } | null)?.activity;
  if (!activity || activity.v !== SUPPORTED_VERSION) return null;
  return activity;
}

export function parseCatalogActivity(analysis: unknown): CatalogActivity | null {
  const activity = (analysis as { activity?: CatalogActivity } | null)?.activity;
  if (!activity || activity.v !== SUPPORTED_VERSION) return null;
  const { v, updatedAt, softwareCount, recentDays, stats } = activity;
  return { v, updatedAt, softwareCount, recentDays, stats: stats ?? {} };
}

export type FieldState =
  | { state: 'absent' }
  | { state: 'unavailable' }
  | { state: 'value'; value: number };

export function fieldState(activity: SoftwareActivity, key: ForgeMetric): FieldState {
  if (!(key in activity)) return { state: 'absent' };
  const value = activity[key];
  if (value === null) return { state: 'unavailable' };
  if (typeof value === 'number') return { state: 'value', value };
  return { state: 'absent' };
}
