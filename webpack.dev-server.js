const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const project = require("./package.json");

module.exports = merge(common, {
    mode : 'development',
    optimization : {
	    usedExports : true
    },
    devtool : 'inline-source-map',
    devServer : {
        contentBase : './WebContent',
        hot : true,
        quiet : true
    },
    output : {
	    filename : project.buildname + '.js',
        path : path.resolve(__dirname, 'dist')
    },
    plugins : [ new webpack.HotModuleReplacementPlugin() ]  
});
