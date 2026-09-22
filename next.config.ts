import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "true";
const repository = "heloc-lab";

const nextConfig: NextConfig = {
  trailingSlash: true,
  ...(githubPages
    ? {
        output: "export",
        basePath: `/${repository}`,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
