export interface SoftwareActivity {
  v: number;
  contributors: number;
  commitsAllTime: number;
  commitsRecent: number;
  pullRequestsAllTime?: number | null;
  pullRequestsRecent?: number | null;
  stars?: number | null;
  forks?: number | null;
  issuesOpen?: number | null;
  issuesClosed?: number | null;
  oldestCommit?: string;
  tags: number;
  recentDays: number;
  disabled?: string[];
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

export type ForgeMetric =
  | 'stars'
  | 'forks'
  | 'issuesOpen'
  | 'issuesClosed'
  | 'pullRequestsAllTime'
  | 'pullRequestsRecent';

export type CatalogStats = Partial<Record<StatMetric, MetricStats>>;

export interface CatalogActivity {
  v: number;
  updatedAt: string;
  softwareCount: number;
  recentDays: number;
  stats: CatalogStats;
}
