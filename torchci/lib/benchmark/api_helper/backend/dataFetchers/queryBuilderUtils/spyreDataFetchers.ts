import { benchmarkTable } from "lib/clickhouse";
import { BenchmarkDataQuery } from "./benchmarkDataQueryBuilder";
import { BenchmarkListCommitQueryBuilder } from "./listCommitQueryBuilder";
import { BenchmarkMetadataQuery } from "./listMetadataQueryBuilder";

// The run config the Spyre ingest writes into benchmark.extra_info; as extra keys they also
// keep two configs of one model on separate series instead of averaging them.
const SPYRE_EXTRA_INFOS = new Map([
  ["hardware_type", "tupleElement(o.benchmark, 'extra_info')['hardware_type']"],
  ["use_compile", "tupleElement(o.benchmark, 'extra_info')['use_compile']"],
  ...["tensor_parallel_size", "input_len", "output_len"].map(
    (k): [string, string] => [
      k,
      `JSONExtractString(tupleElement(o.benchmark, 'extra_info')['args'], '${k}')`,
    ]
  ),
]);

export class SpyreBenchmarkDataFetcher extends BenchmarkDataQuery {
  constructor() {
    super();
    this.addExtraInfos(SPYRE_EXTRA_INFOS);
  }
}

// The *_by_tag tables file each run under (tag family, tag) as (branch, commit); see the
// torch-spyre schema 70-vllm-hud-projection.sql.
export class SpyreArtifactBenchmarkDataFetcher extends BenchmarkDataQuery {
  constructor() {
    super();
    this.setTable(benchmarkTable("oss_ci_benchmark_v3_by_tag"));
    this.addExtraInfos(SPYRE_EXTRA_INFOS);
    this.addMetadataInfos(
      new Map([
        ["artifact_id", "toString(o.artifact_id)"],
        ["artifact_id12", "o.artifact_id12"],
        ["image", "o.image"],
        ["commit_sha", "o.commit_sha"],
        ["source_workflow_id", "toString(o.source_workflow_id)"],
      ])
    );
  }
}

// The list-commits defaults send arches: [], which the builder reads as set, so a dashboard's
// arch filter never reached the commit pickers.
export class SpyreListCommitsFetcher extends BenchmarkListCommitQueryBuilder {
  toQueryParams(inputs: any, id?: string) {
    return super.toQueryParams(
      inputs.arch ? { ...inputs, arches: [inputs.arch] } : inputs,
      id
    );
  }
}

export class SpyreArtifactListCommitsFetcher extends SpyreListCommitsFetcher {
  constructor() {
    super();
    this.setTable(benchmarkTable("oss_ci_benchmark_metadata_by_tag"));
  }
}

export class SpyreArtifactMetadataFetcher extends BenchmarkMetadataQuery {
  constructor() {
    super();
    this.setTable(benchmarkTable("oss_ci_benchmark_metadata_by_tag"));
  }
}
