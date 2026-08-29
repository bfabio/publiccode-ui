import type { APIRoute } from "astro";
import { fetchAllSoftware, fetchAllSoftwareAnalysis } from "../../lib/api.js";
import { dataCacheKey } from "../../lib/cacheKey";

export async function getStaticPaths() {
  const software: { id: string }[] = await fetchAllSoftware();
  const analysis = await fetchAllSoftwareAnalysis();
  return software.map((s) => {
    const activity = analysis.get(s.id) ?? null;
    return {
      params: { id: s.id },
      props: { activity },
      cacheKey: dataCacheKey(activity),
    };
  });
}

export const GET: APIRoute = ({ props }) => Response.json({ activity: props.activity });
