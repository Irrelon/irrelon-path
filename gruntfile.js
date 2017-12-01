"use strict";

var util = require('util'),
	aliasify = require('aliasify'),
	stringify = require('stringify'),
	derequire = require('derequire');

module.exports = function(grunt) {
	//grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks("grunt-browserify");
	//grunt.loadNpmTasks('grunt-qunit-blanket-lcov');
	grunt.loadNpmTasks('grunt-umd');
	//grunt.loadNpmTasks('grunt-jsdoc');
	//grunt.loadNpmTasks('grunt-qunit-istanbul');
	//grunt.loadNpmTasks('grunt-contrib-qunit');
	//grunt.loadNpmTasks('grunt-node-qunit');

	grunt.initConfig({
		"browserify": {
			"all": {
				src: ["./js/builds/all.js"],
				dest: "./js/dist/Path.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			}
		},

		"uglify": {
			"all": {
				"files": {
					"./js/dist/Path.min.js": ["./js/dist/Path.js"]
				}
			}
		},

		umd: {
			all: {
				options: {
					src: './js/dist/Path.js',
					globalAlias: 'Path'
				}
			}
		}
	});

	grunt.registerTask('version', 'Increments the current version by a revision', function () {
		var fs = require('fs-extra'),
			packageJson,
			versionString,
			oldVersion,
			versionArr,
			revision,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;
		oldVersion = versionString;
		versionArr = versionString.split('.');
		revision = parseInt(versionArr[2], 10);

		// Increment revision number
		revision++;

		// Create new string
		versionArr[2] = String(revision);
		versionString = versionArr.join('.');

		// Save JSON
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./package.json', fileData);

		// Search project files for old version and replace
		fileData = fs.readFileSync('./js/lib/Shared.js', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./js/lib/Shared.js', fileData);

		fileData = fs.readFileSync('./readme.md', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./readme.md', fileData);

		fileData = fs.readFileSync('./bower.json', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./bower.json', fileData);
	});

	grunt.registerTask('gitCommit', 'Git Commit Updates', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git commit -am "New version build ' + versionString + '"');
	});

	grunt.registerTask('gitPushAndTagDev', 'Git Push and Tag Dev Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString + '-dev');
		child = execSync('git push --tags');
	});

	grunt.registerTask('gitPushAndTagEdge', 'Git Push and Tag Edge Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString + '-edge');
		child = execSync('git push --tags');
	});

	grunt.registerTask('gitMergeEdgeIntoDev', 'Git Merge Edge Into Dev', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout dev');
		child = execSync('git merge edge');
	});

	grunt.registerTask('gitMergeDevIntoMaster', 'Git Merge Dev Into Master', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout master');
		child = execSync('git merge dev');
	});

	grunt.registerTask('gitMergeDevIntoEdge', 'Git Merge Dev Into Edge', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout edge');
		child = execSync('git merge dev');
	});

	grunt.registerTask('gitPushAndTagMaster', 'Git Push and Tag Master Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString);
		child = execSync('git push --tags');
	});

	grunt.registerTask('npmPublish', 'NPM Publish New Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish');
	});

	grunt.registerTask('npmPublishDev', 'NPM Publish New Dev Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish --tag dev');
	});

	grunt.registerTask('npmPublishEdge', 'NPM Publish New Edge Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish --tag edge');
	});

	grunt.registerTask('checkoutMaster', 'Git Checkout Master Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout master');
	});

	grunt.registerTask('checkoutDev', 'Git Checkout Dev Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout dev');
	});

	grunt.registerTask('checkoutEdge', 'Git Checkout Edge Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout edge');
	});
	
	grunt.registerTask("1: Build Source File", ["browserify"]);
	grunt.registerTask("default", ["browserify"]);
};