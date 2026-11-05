import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
	agentRules: false,
	experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
	serverExternalPackages: ["pdfjs-dist"],
	webpack(config, { isServer, webpack }) {
		// PptxGenJS 4 marks node:fs/https false in its browser map, but webpack
		// rejects these schemes before honoring that map. Scope the shim to it.
		if (!isServer) config.plugins.push(new webpack.NormalModuleReplacementPlugin(
			/^node:(fs|https)$/, (resource: { context: string; request: string }) => {
				if (/[\\/]pptxgenjs[\\/]/.test(resource.context))
					resource.request = resolve(process.cwd(), "src/lib/presentation-node-disabled.ts");
			},
		));
		return config;
	},
	outputFileTracingIncludes: { "/teaching": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"] },
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com",
			},
		],
	},
};

export default nextConfig;