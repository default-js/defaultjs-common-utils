const webpackconf = require("./webpack.prod.js")
const { merge } = require("webpack-merge");
const common = require('./karma.common.js');
const puppeteer = require('puppeteer');
const path = require('path');
process.env.CHROME_BIN = puppeteer.executablePath();

module.exports = function(config) {
	config.set(merge(common, {
		webpack : merge(webpackconf, {
			output: {
				path: path.resolve(__dirname, "runtime"),
			},
		}),
		logLevel : config.LOG_INFO,
		browsers : [ 'ChromeHeadless' ],
		autoWatch : true,
		singleRun : true,
		concurrency : Infinity
	}))
}
