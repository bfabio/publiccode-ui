import type { APIRoute } from "astro";
import { fetchAllCatalogAnalysis, fetchRootCatalogAnalysis } from "../../lib/api.js";
import { statsByCatalog, usableStats } from "../../lib/activity";

export const GET: APIRoute = async () =>
  Response.json({
    root: usableStats(await fetchRootCatalogAnalysis()),
    byCatalog: statsByCatalog((await fetchAllCatalogAnalysis()).entries()),
  });
