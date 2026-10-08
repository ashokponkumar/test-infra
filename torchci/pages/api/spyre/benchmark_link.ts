import { resolveSpyreBenchmarkLink } from "lib/benchmark/spyre/benchmarkLink";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Deep link into the by-artifact Spyre dashboard, redirecting (302) to it:
 *   ?family=nightly                       the family's trend
 *   ?family=nightly&tag=nightly-2026-10-07 that tag vs the previous one in the family
 *   ?artifact=<artifact_id|id12>[&family=]  that artifact vs the previous one
 * plus optional arch, model, vs=<baseline tag> and days. format=json returns the resolution.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const q = (k: string) => {
    const v = req.query[k];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  try {
    const link = await resolveSpyreBenchmarkLink({
      family: q("family"),
      tag: q("tag"),
      artifact: q("artifact"),
      vs: q("vs"),
      arch: q("arch"),
      model: q("model"),
      days: q("days") ? Number(q("days")) : undefined,
    });
    if (q("format") === "json") {
      return res.status(200).json(link);
    }
    return res.redirect(302, link.url);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
}
