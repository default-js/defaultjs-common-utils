const path = require("path");
const { merge } = require("webpack-merge");
const project = require("./package.json");
const CopyPlugin = require("copy-webpack-plugin");

const entries = require("./entries.config.json");

module.exports = (env, argv) => {
	const devMode = argv.mode != "production";
	const target = argv.target ? argv.target : "dist";
	// The sources only reach the browser bundled into the test entry, so a karma preprocessor never
	// gets to see them - the instrumentation has to happen inside the bundle. Karma switches this on,
	// a dist build never does.
	const coverage = !!(env && env.coverage);

	return {
		entry: entries,
		target: "web",
		mode: devMode ? "development" : "production",
		module: {
			rules: coverage
				? [
						{
							test: /\.js$/,
							include: path.resolve(__dirname, "src"),
							use: {
								loader: "babel-loader",
								options: {
									// no project babel config exists and none is wanted - istanbul only,
									// the browsers under test run the sources untranspiled
									babelrc: false,
									configFile: false,
									plugins: ["istanbul"],
									sourceMaps: true,
								},
							},
						},
				  ]
				: [],
		},
		optimization: {
			minimize: !devMode,
			usedExports: false,
			// the sideEffects field of package.json covers the published files, but it applies to the
			// whole package - a test file is not listed there and would be dropped from the test bundle
			sideEffects: !coverage,
		},
		devtool: devMode ? "inline-source-map" : "source-map",
		output: {
			filename: devMode ? `[name]-${project.buildname}.js` : `[name]-${project.buildname}.min.js`,
			path: path.resolve(__dirname, target),
		},
		plugins: (() => {
            return  [
				// the version no longer needs replacing in the bundle - scripts/generate-version.js
				// writes it into src/version.js before every build, so it is already in the source
				new CopyPlugin({
					patterns: [
						{ from: "./src/css", to: `css`, noErrorOnMissing: true }
					]
				})
            ]
        })(),
        devServer: {
            open: true,
			allowedHosts: "all",
			client: {
				overlay: true,
				progress: true,
				reconnect: true,
			},
            devMiddleware: {
				index: true,
				writeToDisk: false,
			},
			static: ["./webcontent", "./src/css"],
			watchFiles: { paths: ["src/**/*", "./webcontent"] }
        }       
	};
};