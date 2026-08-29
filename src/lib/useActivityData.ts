import { useEffect, useState } from "react";
import type { CatalogStats, SoftwareActivity } from "../types/analysis";
import { fetchSoftwareActivity, fetchStatsIndex, resolveStats } from "./activityData";

interface ActivityData {
  activity: SoftwareActivity | null;
  stats: CatalogStats | null;
  loaded: boolean;
}

export function useActivityData(softwareId: string, catalogId: string | null): ActivityData {
  const [data, setData] = useState<ActivityData>({ activity: null, stats: null, loaded: false });

  useEffect(() => {
    let alive = true;
    Promise.all([fetchSoftwareActivity(softwareId), fetchStatsIndex()]).then(([activity, index]) => {
      if (!alive) return;
      setData({ activity, stats: index ? resolveStats(index, catalogId) : null, loaded: true });
    });
    return () => {
      alive = false;
    };
  }, [softwareId, catalogId]);

  return data;
}
