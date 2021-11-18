const path = require("path");
const webpack_rules = [];

const webpackOption = {
	entry: "./src/Path.js",
	output: {
		path: path.resolve(__dirname, 'js', "dist"),
		filename: "Path.js",
	},
	module: {
		rules: webpack_rules
	}
};

let babelLoader = {
	test: /\.js$/,
	exclude: /(node_modules|bower_components)/,
	use: {
		loader: "babel-loader",
		options: {
			presets: ["@babel/preset-env"]
		}
	}
};

webpack_rules.push(babelLoader);
module.exports = webpackOption;