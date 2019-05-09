"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _this = void 0;

/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @returns {*} The passed argument.
 */
var returnWhatWasGiven = function returnWhatWasGiven (val) {
	return val;
};
/**
 * Converts any key matching the wildcard to a zero.
 * @param {String} key The key to test.
 * @returns {String} The key.
 */


var wildcardToZero = function wildcardToZero (key) {
	return key === "$" ? "0" : key;
};
/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {String} key The key to test.
 * @returns {String} The original key or a wildcard.
 */


var numberToWildcard = function numberToWildcard (key) {
	// Check if the key is a number
	if (String(parseInt(key, 10)) === key) {
		// The key is a number, convert to a wildcard
		return "$";
	}
	
	return key;
};
/**
 * Removes leading period (.) from string and returns it.
 * @param {String} str The string to clean.
 * @returns {*} The cleaned string.
 */


var clean = function clean (str) {
	if (str.substr(0, 1) === ".") {
		str = str.substr(1, str.length - 1);
	}
	
	return str;
};
/**
 * Splits a path by period character, taking into account
 * escaped period characters.
 * @param {String} path The path to split into an array.
 * @return {Array} The component parts of the path, split
 * by period character.
 */


var split = function split (path) {
	// Convert all \. (escaped periods) to another character
	// temporarily
	var escapedPath = path.replace(/\\\./g, "[--]");
	var splitPath = escapedPath.split("."); // Loop the split path array and convert any escaped period
	// placeholders back to their real period characters
	
	for (var i = 0; i < splitPath.length; i++) {
		splitPath[i] = splitPath[i].replace(/\[--]/g, ".");
	}
	
	return splitPath;
};
/**
 * Escapes any periods in the passed string so they will
 * not be identified as part of a path. Useful if you have
 * a path like "domains.www.google.com.data" where the
 * "www.google.com" should not be considered part of the
 * traversal as it is actually in an object like:
 * {
 * 	"domains": {
 * 		"www.google.com": {
 * 			"data": "foo"
 * 		}
 * 	}
 * }
 * @param {String} str The string to escape periods in.
 * @return {String} The escaped string.
 */


var escape = function escape (str) {
	return str.replace(/\./g, "\\.");
};
/**
 * Gets a single value from the passed object and given path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {Object=} options Optional options object.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */


var get = function get (obj, path) {
	var defaultVal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
	var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
	var internalPath = path,
		objPart;
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven
	}, options); // No object data, return undefined
	
	if (obj === undefined || obj === null) {
		return defaultVal;
	} // No path string, return the base obj
	
	
	if (!internalPath) {
		return obj;
	}
	
	internalPath = clean(internalPath); // Path is not a string, throw error
	
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	} // Path has no dot-notation, return key/value
	
	
	if (internalPath.indexOf(".") === -1) {
		return obj[internalPath];
	}
	
	if ((0, _typeof2.default)(obj) !== "object") {
		return obj;
	}
	
	var pathParts = split(internalPath);
	objPart = obj;
	
	for (var i = 0; i < pathParts.length; i++) {
		var pathPart = pathParts[i];
		objPart = objPart[options.transformKey(pathPart)];
		
		if (!objPart || (0, _typeof2.default)(objPart) !== "object") {
			if (i !== pathParts.length - 1) {
				// The path terminated in the object before we reached
				// the end node we wanted so make sure we return undefined
				objPart = undefined;
			}
			
			break;
		}
	}
	
	return objPart !== undefined ? objPart : defaultVal;
};
/**
 * Sets a single value on the passed object and given path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to set data on.
 * @param {*} val The value to assign to the obj at the path.
 * @param {Object=} options The options object.
 * @returns {*} Nothing.
 */


var set = function set (obj, path, val) {
	var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
	var internalPath = path,
		objPart;
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven
	}, options); // No object data
	
	if (obj === undefined || obj === null) {
		return;
	} // No path string
	
	
	if (!internalPath) {
		return;
	}
	
	internalPath = clean(internalPath); // Path is not a string, throw error
	
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}
	
	if ((0, _typeof2.default)(obj) !== "object") {
		return;
	} // Path has no dot-notation, set key/value
	
	
	if (internalPath.indexOf(".") === -1) {
		obj[options.transformKey(internalPath)] = val;
		return;
	}
	
	var pathParts = split(internalPath);
	objPart = obj;
	
	for (var i = 0; i < pathParts.length; i++) {
		var pathPart = pathParts[i];
		var transformedPathPart = options.transformKey(pathPart);
		var tmpPart = objPart[transformedPathPart];
		
		if (!tmpPart || (0, _typeof2.default)(objPart) !== "object") {
			if (i !== pathParts.length - 1) {
				// Create an object or array on the path
				if (String(parseInt(pathPart, 10)) === pathPart) {
					// This is an array index
					objPart[transformedPathPart] = [];
				} else {
					objPart[transformedPathPart] = {};
				}
				
				objPart = objPart[transformedPathPart];
			}
		} else {
			objPart = tmpPart;
		}
		
		if (i === pathParts.length - 1) {
			// Set value
			objPart[transformedPathPart] = val;
		}
	}
};
/**
 * Push a value to an array on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @returns {Object} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */


var push = function push (obj, path, val) {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	} // Clean the path
	
	
	path = _this.clean(path);
	var pathParts = split(path);
	var part = pathParts.shift();
	
	if (pathParts.length) {
		// Generate the path part in the object if it does not already exist
		obj[part] = obj[part] || {}; // Recurse
		
		push(obj[part], pathParts.join("."), val);
	} else {
		// We have found the target array, push the value
		obj[part] = obj[part] || [];
		
		if (obj[part] instanceof Array) {
			obj[part].push(val);
		} else {
			throw "Cannot push to a path whose leaf node is not an array!";
		}
	}
	
	return obj;
};
/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {String} The path to the furthest non-undefined value.
 */


var furthest = function furthest (obj, path) {
	var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	var internalPath = path,
		objPart;
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": wildcardToZero,
		// Any path that has a wildcard will essentially check the first array item to continue down the tree
		"transformWrite": returnWhatWasGiven
	}, options);
	var finalPath = []; // No path string, return the base obj
	
	if (!internalPath) {
		return finalPath.join(".");
	}
	
	internalPath = clean(internalPath); // Path is not a string, throw error
	
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}
	
	if ((0, _typeof2.default)(obj) !== "object") {
		return finalPath.join(".");
	} // Path has no dot-notation, return key/value
	
	
	if (internalPath.indexOf(".") === -1) {
		if (obj[internalPath] !== undefined) {
			return internalPath;
		}
		
		return finalPath.join(".");
	}
	
	var pathParts = split(internalPath);
	objPart = obj;
	
	for (var i = 0; i < pathParts.length; i++) {
		var pathPart = pathParts[i];
		objPart = objPart[options.transformKey(pathPart)];
		
		if (objPart === undefined) {
			break;
		}
		
		finalPath.push(pathPart);
	}
	
	return finalPath.join(".");
};
/**
 * Traverses the object by the given path and returns an object where
 * each key is a path pointing to a leaf node and contains the value
 * from the leaf node from the overall object in the obj argument,
 * essentially providing all available paths in an object and all the
 * values for each path.
 * @param {Object} obj The object to inspect.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {Object} The result of the traversal.
 */


var values = function values (obj, path) {
	var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	var internalPath = clean(path);
	var pathParts = split(internalPath);
	var currentPath = [];
	var valueData = {};
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven
	}, options);
	
	for (var i = 0; i < pathParts.length; i++) {
		var pathPart = options.transformKey(pathParts[i]);
		currentPath.push(pathPart);
		var tmpPath = currentPath.join(".");
		valueData[tmpPath] = get(obj, tmpPath);
	}
	
	return valueData;
};
/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings.
 * @param {Object} obj The object to scan.
 * @param {Array=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param {Object=} options An options object.
 * @returns {Array<String>} An array containing path strings.
 */


var flatten = function flatten (obj) {
	var finalObj = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
	var parentPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
	var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven
	}, options);
	var transformedObj = options.transformRead(obj);
	
	var currentPath = function currentPath (i) {
		var tKey = options.transformKey(i);
		return parentPath ? parentPath + "." + tKey : tKey;
	};
	
	for (var i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			if (options.ignore && options.ignore.test(i)) {
				continue;
			}
			
			if ((0, _typeof2.default)(transformedObj[i]) === "object") {
				flatten(transformedObj[i], finalObj, currentPath(i), options);
			}
			
			finalObj.push(currentPath(i));
		}
	}
	
	return finalObj;
};
/**
 * Takes an object and finds all paths, then returns the paths as keys
 * and the values of each path as the values.
 * @param {Object} obj The object to scan.
 * @param {Object=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly).
 * @param {Object=} options An options object.
 * @returns {Object} An object containing path keys and their values.
 */


var flattenValues = function flattenValues (obj) {
	var finalObj = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	var parentPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
	var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
	options = (0, _objectSpread2.default)({
		"transformRead": returnWhatWasGiven,
		"transformKey": returnWhatWasGiven,
		"transformWrite": returnWhatWasGiven
	}, options);
	var transformedObj = options.transformRead(obj);
	
	var currentPath = function currentPath (i) {
		var tKey = options.transformKey(i);
		return parentPath ? parentPath + "." + tKey : tKey;
	};
	
	for (var i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			if ((0, _typeof2.default)(transformedObj[i]) === "object") {
				flattenValues(transformedObj[i], finalObj, currentPath(i), options);
			}
			
			finalObj[currentPath(i)] = options.transformWrite(transformedObj[i]);
		}
	}
	
	return finalObj;
};
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {Array} args The arguments passed to the function,
 * spread using ES6 spread.
 * @returns {string} A final path string.
 */


var join = function join () {
	for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}
	
	return args.reduce(function (arr, item) {
		if (item !== undefined && String(item)) {
			arr.push(item);
		}
		
		return arr;
	}, []).join(".");
};
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {Array} args The arguments passed to the function,
 * spread using ES6 spread.
 * @returns {string} A final path string.
 */


var joinEscaped = function joinEscaped () {
	for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
		args[_key2] = arguments[_key2];
	}
	
	var escapedArgs = args.map(function (item) {
		return escape(item);
	});
	return join.apply(void 0, (0, _toConsumableArray2.default)(escapedArgs));
};
/**
 * Returns the specified path but removes the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {String} path The path to operate on.
 * @returns {String} The new path string.
 */


var up = function up (path) {
	var parts = split(path);
	parts.pop();
	return parts.join(".");
};
/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {Object} obj The object to count key leaf nodes for.
 * @returns {Number} The number of keys.
 */


var countLeafNodes = function countLeafNodes (obj) {
	var totalKeys = 0;
	
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (obj[i] !== undefined) {
				if ((0, _typeof2.default)(obj[i]) !== "object") {
					totalKeys++;
				} else {
					totalKeys += countLeafNodes(obj[i]);
				}
			}
		}
	}
	
	return totalKeys;
};
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */


var hasMatchingPathsInObject = function hasMatchingPathsInObject (testKeys, testObj) {
	var result = true;
	
	for (var i in testKeys) {
		if (testKeys.hasOwnProperty(i)) {
			if (testObj[i] === undefined) {
				return false;
			}
			
			if ((0, _typeof2.default)(testKeys[i]) === "object") {
				// Recurse object
				result = hasMatchingPathsInObject(testKeys[i], testObj[i]); // Should we exit early?
				
				if (!result) {
					return false;
				}
			}
		}
	}
	
	return result;
};
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Object<matchedKeys<Number>, matchedKeyCount<Number>, totalKeyCount<Number>>} Stats on the matched keys.
 */


var countMatchingPathsInObject = function countMatchingPathsInObject (testKeys, testObj) {
	var matchedKeys = {};
	var matchData,
		matchedKeyCount = 0,
		totalKeyCount = 0;
	
	for (var i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if ((0, _typeof2.default)(testObj[i]) === "object") {
				// The test / query object key is an object, recurse
				matchData = countMatchingPathsInObject(testKeys[i], testObj[i]);
				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++; // Check if the test keys also have this key and it is also not an object
				
				if (testKeys && testKeys[i] && (0, _typeof2.default)(testKeys[i]) !== "object") {
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					matchedKeys[i] = false;
				}
			}
		}
	}
	
	return {
		matchedKeys: matchedKeys,
		matchedKeyCount: matchedKeyCount,
		totalKeyCount: totalKeyCount
	};
};

module.exports = {
	wildcardToZero: wildcardToZero,
	numberToWildcard: numberToWildcard,
	clean: clean,
	split: split,
	escape: escape,
	get: get,
	set: set,
	push: push,
	furthest: furthest,
	values: values,
	flatten: flatten,
	flattenValues: flattenValues,
	join: join,
	joinEscaped: joinEscaped,
	up: up,
	countLeafNodes: countLeafNodes,
	hasMatchingPathsInObject: hasMatchingPathsInObject,
	countMatchingPathsInObject: countMatchingPathsInObject
};