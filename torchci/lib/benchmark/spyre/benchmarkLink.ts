import { SPYRE_ARTIFACT_BENCHMARK_ID } from "components/benchmark_v3/configs/teams/vllm/spyre_config";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { benchmarkTable, queryClickhouse } from "lib/clickhouse";
dayjs.extend(utc);

export const ARTIFACT_FAMILY = "artifact";

export interface SpyreLinkParams {
  family?: string;
  tag?: string;
  artifact?: string;
  vs?: string;
  arch?: string;
  model?: string;
  days?: number;
}

interface TagPoint {
  tag: string;
  workflow_id: string;
  ts: number;
}

export interface SpyreLink {
  url: string;
  family: string;
  arch: string;
  left: TagPoint | null;
  right: TagPoint | null;
}

const one = async (sql: string, params: Record<string, unknown>) =>
  (await queryClickhouse(sql, params, "spyre_benchmark_link"))[0];

/**
 * Resolves a family / tag / artifact (plus an optional baseline) to a dashboard URL that compares
 * the tag with the one before it in its family, or `vs` when given. The dashboard keys commits on
 * a hashed workflow_id, so callers name tags and this looks the ids up.
 */
export async function resolveSpyreBenchmarkLink(
  p: SpyreLinkParams
): Promise<SpyreLink> {
  const table = benchmarkTable("oss_ci_benchmark_v3_by_tag");
  const metadata = benchmarkTable("oss_ci_benchmark_metadata_by_tag");
  let family = p.family ?? "";
  let tag = p.tag ?? "";
  let arch = p.arch ?? "";

  if (p.artifact) {
    const a = await one(
      `SELECT any(artifact_id12) AS id12,
              any(tupleElement(benchmark, 'extra_info')['arch']) AS arch,
              anyIf(tag, tag_family = {family: String}) AS family_tag
       FROM ${table}
       WHERE toString(artifact_id) = {artifact: String} OR artifact_id12 = {artifact: String}`,
      { artifact: p.artifact.toLowerCase(), family }
    );
    if (!a?.id12) throw new Error(`no benchmark run on artifact ${p.artifact}`);
    arch = arch || a.arch;
    if (family && family !== ARTIFACT_FAMILY && a.family_tag) {
      tag = a.family_tag;
    } else {
      family = ARTIFACT_FAMILY;
      tag = a.id12;
    }
  } else if (tag && !family) {
    const t = await one(
      `SELECT any(tag_family) AS family FROM ${table} WHERE tag = {tag: String}`,
      { tag }
    );
    if (!t?.family) throw new Error(`no benchmark run on tag ${tag}`);
    family = t.family;
  }
  if (!family) throw new Error("one of family, tag or artifact is required");

  const points: TagPoint[] = await queryClickhouse(
    `SELECT head_sha AS tag, toString(workflow_id) AS workflow_id, min(timestamp) AS ts
     FROM ${metadata}
     WHERE head_branch = {family: String} AND (arch = {arch: String} OR {arch: String} = '')
     GROUP BY head_sha, workflow_id
     ORDER BY ts`,
    { family, arch },
    "spyre_benchmark_link"
  );

  let right: TagPoint | null = null;
  let left: TagPoint | null = null;
  if (tag) {
    const i = points.findIndex((x) => x.tag === tag);
    if (i < 0)
      throw new Error(`no ${arch || "any-arch"} run on ${family}/${tag}`);
    right = points[i];
    left = p.vs
      ? points.find((x) => x.tag === p.vs) ?? null
      : points[i - 1] ?? right;
    if (!left)
      throw new Error(`no ${arch || "any-arch"} run on ${family}/${p.vs}`);
  }

  const days = p.days && p.days > 0 ? p.days : 30;
  const end = right
    ? dayjs.utc(Math.max(left!.ts, right.ts) * 1000).endOf("day")
    : dayjs.utc().endOf("day");
  const start = dayjs
    .utc(
      Math.min(
        end.subtract(days, "day").valueOf(),
        (left?.ts ?? Infinity) * 1000
      )
    )
    .startOf("day");

  const q = new URLSearchParams({
    "time.start": start.toISOString(),
    "time.end": end.toISOString(),
    "filters.device": "spyre",
    lbranch: family,
    rbranch: family,
    renderGroupId: p.model ? "detail_view" : "main",
  });
  if (arch) q.set("filters.arch", arch);
  if (p.model) q.set("filters.model", p.model);
  for (const [side, pt] of [
    ["lcommit", left],
    ["rcommit", right],
  ] as const) {
    if (!pt) continue;
    q.set(`${side}.commit`, pt.tag);
    q.set(`${side}.workflow_id`, pt.workflow_id);
    q.set(`${side}.branch`, family);
    q.set(
      `${side}.date`,
      dayjs
        .utc(pt.ts * 1000)
        .startOf("hour")
        .toISOString()
    );
  }
  return {
    url: `/benchmark/v3/dashboard/${SPYRE_ARTIFACT_BENCHMARK_ID}?${q}`,
    family,
    arch,
    left,
    right,
  };
}
