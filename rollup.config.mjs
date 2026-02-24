import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { builtinModules } from "module";

export default {
	input: "src/plugin.ts",
	output: {
		file: "com.tbprojects.solarman.sdPlugin/bin/plugin.js",
		format: "esm",
		sourcemap: true,
	},
	plugins: [
		nodeResolve({ browser: false, preferBuiltins: true }),
		commonjs(),
		typescript(),
	],
	external: [
		...builtinModules,
		...builtinModules.map((m) => `node:${m}`),
	],
};
