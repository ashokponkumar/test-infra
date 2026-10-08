import { Typography } from "@mui/material";
import { Box } from "@mui/system";
import { BenchmarkLinkButton } from "components/benchmark_v3/components/common/BenchmarkLinkButton";
import { shortSha } from "components/benchmark_v3/components/dataRender/components/benchmarkTimeSeries/helper";
import { BenchmarkCommitMeta } from "lib/benchmark/store/benchmark_regression_store";

export function BenchmarkComparisonGithubExternalLink({
  benchmarkId,
  lcommit,
  rcommit,
  repo = "pytorch/pytorch",
  title,
}: {
  benchmarkId?: string;
  lcommit?: BenchmarkCommitMeta | null;
  rcommit?: BenchmarkCommitMeta | null;
  repo?: string;
  title?: {
    text?: string;
    description?: string;
  };
}) {
  if (!lcommit || !rcommit) {
    return <></>;
  }
  return (
    <Box>
      {title?.text && <Typography variant="h6">{title?.text}</Typography>}
      {title?.description && (
        <Typography variant="body2">{title.description}</Typography>
      )}
      <BenchmarkLinkButton
        href={toGithubExternalUrl(lcommit, repo)}
        variant="outlined"
        size="small"
      >
        {lcommit.workflow_id} ({shortSha(lcommit.commit)})
      </BenchmarkLinkButton>{" "}
      {lcommit?.workflow_id != rcommit?.workflow_id && (
        <BenchmarkLinkButton
          href={toGithubExternalUrl(rcommit, repo)}
          variant="outlined"
          size="small"
        >
          {rcommit.workflow_id} ({shortSha(rcommit.commit)})
        </BenchmarkLinkButton>
      )}
    </Box>
  );
}

export function toGithubExternalUrl(commit: BenchmarkCommitMeta, repo: string) {
  const wf = commit.workflow_id;
  const sourceRepo = repo ?? "pytorch/pytorch";
  const gitRepoUrl = `https://github.com/${sourceRepo}`;
  const url = `${gitRepoUrl}/actions/runs/${wf}`;
  return url;
}
