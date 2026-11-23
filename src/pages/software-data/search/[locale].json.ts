import type { APIRoute } from "astro";
import { fetchAllSoftware } from "../../../lib/api.js";
import { resolveLogoAsset } from "../../../lib/assets.js";
import { dataCacheKey } from "../../../lib/cacheKey";
import { localizeDescription } from "../../../lib/i18n.js";
import type { SearchIndexEntry } from "../../../lib/searchIndex";

export async function getStaticPaths() {
  const software: { id: string; publiccode: { name: string; description?: unknown } }[] = await fetchAllSoftware();
  return ["en", "it"].map((locale) => {
    const entries: SearchIndexEntry[] = software.map((s) => {
      const logo = resolveLogoAsset(s.publiccode);
      return {
        id: s.id,
        name: s.publiccode.name,
        shortDescription: localizeDescription(s.publiccode.description, locale).shortDescription ?? "",
        logo: logo?.src ?? null,
        logoFallback: logo?.fallback ?? null,
      };
    });
    return {
      params: { locale },
      props: { entries },
      cacheKey: dataCacheKey(entries),
    };
  });
}

export const GET: APIRoute = ({ props }) => Response.json(props.entries);
