export interface SoftwareActivity {
  v: number;
  contributors: number;
  commitsAllTime: number;
  pullRequestsAllTime: number;
  commitsRecent: number;
  pullRequestsRecent: number;
  stars?: number;
  forks?: number;
  issuesOpen?: number;
  issuesClosed?: number;
  oldestCommit?: string;
  releases: number;
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
  | 'releases';

export type CatalogStats = Partial<Record<StatMetric, MetricStats>>;
