/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Opt-in, so the Vercel deployment is untouched: `standalone` emits a self-contained server
  // bundle, which is what a container image needs and what Vercel must not be given.
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1"
    ? { output: "standalone" }
    : {}),
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/hud/pytorch/pytorch/main/1",
      },
      {
        source: "/commit/:repoOwner/:repoName/:sha",
        destination: "/:repoOwner/:repoName/commit/:sha",
      },
      {
        source: "/pr/:repoOwner/:repoName/:prNumber",
        destination: "/:repoOwner/:repoName/pull/:prNumber",
      },
      {
        source: "/pr/:prNumber",
        destination: "/pytorch/pytorch/pull/:prNumber",
      },
      {
        source: "/commit/:sha",
        destination: "/pytorch/pytorch/commit/:sha",
      },
      {
        source: "/ci/:repoOwner/:repoName/:branch",
        destination: "/hud/:repoOwner/:repoName/:branch/1",
      },
      {
        source: "/tts",
        destination: "/tts/pytorch/pytorch/main",
      },
      {
        source: "/reliability",
        destination: "/reliability/pytorch/pytorch",
      },
    ];
  },
  transpilePackages: [
    "@mui/x-data-grid",
    "@mui/x-data-grid-pro",
    "@mui/x-data-grid-premium",
  ],
};
