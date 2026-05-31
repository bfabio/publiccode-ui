export interface SoftwareActivity {
  v: number;
  contributors: number;
  commitsAllTime: number;
  pullRequestsAllTime: number;
  commitsRecent: number;
  pullRequestsRecent: number;
  stars?: number | null;
  forks?: number | null;
  issuesOpen?: number | null;
  issuesClosed?: number | null;
  oldestCommit?: string;
  tags: number;
  recentDays: number;
}

export interface MetricStats {
  max: number;
  min: number;
  count: number;
  mean: number;
  median: number;
  p95: number;
}

export type StatMetric =
  | 'contributors'
  | 'commitsAllTime'
  | 'pullRequestsAllTime'
  | 'commitsRecent'
  | 'pullRequestsRecent'
  | 'stars'
  | 'forks'
  | 'issuesOpen'
  | 'issuesClosed'
  | 'tags';

export type ForgeMetric = 'stars' | 'forks' | 'issuesOpen' | 'issuesClosed';

export type CatalogStats = Partial<Record<StatMetric, MetricStats>>;

export interface CatalogActivity {
  v: number;
  updatedAt: string;
  softwareCount: number;
  recentDays: number;
  stats: CatalogStats;
}
