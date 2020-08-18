"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _slicedToArray2 = _interopRequireDefault(require("@babel/runtime/helpers/slicedToArray"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/**
 * Scans an object for all keys that are either objects or arrays
 * and returns an array of those keys only.
 * @param {Object|Array} obj The object to scan.
 * @returns {[string]} An array of string keys.
 * @private
 */
var _iterableKeys = function _iterableKeys(obj) {
  return Object.entries(obj).reduce(function (arr, _ref) {
    var _ref2 = (0, _slicedToArray2["default"])(_ref, 2),
        key = _ref2[0],
        val = _ref2[1];

    var valType = type(val);

    if (valType === "object" || valType === "array") {
      arr.push(key);
    }

    return arr;
  }, []);
};
/**
 * Creates a new instance of "item" that is dereferenced. Useful
 * when you want to return a new version of "item" with the same
 * data for immutable data structures.
 * @param {Object|Array} item The item to mimic.
 * @param {String} key The key to set data in.
 * @param {*} val The data to set in the key.
 * @returns {*} A new dereferenced version of "item" with the "key"
 * containing the "val" data.
 * @private
 */


var _newInstance = function _newInstance(item) {
  var key = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
  var val = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
  var objType = type(item);
  var newObj;

  if (objType === "object") {
    newObj = _objectSpread({}, item);
  }

  if (objType === "array") {
    newObj = (0, _toConsumableArray2["default"])(item);
  }

  if (key !== undefined) {
    newObj[key] = val;
  }

  return newObj;
};
/**
 * Determines if the given path points to a root leaf node (has no delimiter)
 * or contains a dot delimiter so will drill down before reaching a leaf node.
 * If it has a delimiter, it is called a "composite" path.
 * @param {String} path The path to evaluate.
 * @returns {boolean} True if delimiter found, false if not.
 */


var isCompositePath = function isCompositePath(path) {
  var regExp = /\./g;
  var result;

  while (result = regExp.exec(path)) {
    // Check if the previous character was an escape
    // and if so, ignore this delimiter
    if (result.index === 0 || path.substr(result.index - 1, 1) !== "\\") {
      // This is not an escaped path so it IS a composite path
      return true;
    }
  }

  return false;
};
/**
 * Provides the opposite of `isCompositePath()`. If a delimiter is found, this
 * function returns false.
 * @param {String} path The path to evaluate.
 * @returns {boolean} False if delimiter found, true if not.
 */


var isNonCompositePath = function isNonCompositePath(path) {
  return !isCompositePath(path);
};
/**
 * Returns the given path after removing the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {String} path The path to operate on.
 * @param {Number=} levels The number of levels to
 * move up.
 * @returns {String} The new path string.
 */


var up = function up(path) {
  var levels = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var parts = split(path);

  for (var i = 0; i < levels; i++) {
    parts.pop();
  }

  return parts.join(".");
};
/**
 * Returns the given path after removing the first
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "bar.thing".
 * @param {String} path The path to operate on.
 * @param {Number=} levels The number of levels to
 * move down.
 * @returns {String} The new path string.
 */


var down = function down(path) {
  var levels = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var parts = split(path);

  for (var i = 0; i < levels; i++) {
    parts.shift();
  }

  return parts.join(".");
};
/**
 * Returns the last leaf from the path. E.g.
 * "foo.bar.thing" returns "thing".
 * @param {String} path The path to operate on.
 * @param {Number=} levels The number of levels to
 * pop.
 * @returns {String} The new path string.
 */


var pop = function pop(path) {
  var levels = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var parts = split(path);
  var part;

  for (var i = 0; i < levels; i++) {
    part = parts.pop();
  }

  return part || "";
};
/**
 * Adds a leaf to the end of the path. E.g.
 * pushing "goo" to path "foo.bar.thing" returns
 * "foo.bar.thing.goo".
 * @param {String} path The path to operate on.
 * @param {String} val The string value to push
 * to the end of the path.
 * @returns {String} The new path string.
 */


var push = function push(path) {
  var val = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  return "".concat(path, ".").concat(val);
};
/**
 * Returns the first leaf from the path. E.g.
 * "foo.bar.thing" returns "foo".
 * @param {String} path The path to operate on.
 * @param {Number=} levels The number of levels to
 * shift.
 * @returns {String} The new path string.
 */


var shift = function shift(path) {
  var levels = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  var parts = split(path);
  var part;

  for (var i = 0; i < levels; i++) {
    part = parts.shift();
  }

  return part || "";
};
/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @returns {*} The passed argument.
 */


var returnWhatWasGiven = function returnWhatWasGiven(val) {
  return val;
};
/**
 * Converts any key matching the wildcard to a zero.
 * @param {String} key The key to test.
 * @returns {String} The key.
 */


var wildcardToZero = function wildcardToZero(key) {
  return key === "$" ? "0" : key;
};
/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {String} key The key to test.
 * @returns {String} The original key or a wildcard.
 */


var numberToWildcard = function numberToWildcard(key) {
  // Check if the key is a number
  if (String(parseInt(key, 10)) === key) {
    // The key is a number, convert to a wildcard
    return "$";
  }

  return key;
};
/**
 * Removes leading period (.) from string and returns new string.
 * @param {String} str The string to clean.
 * @returns {*} The cleaned string.
 */


var clean = function clean(str) {
  if (!str) {
    return str;
  }

  if (str.substr(0, 1) === ".") {
    str = str.substr(1, str.length - 1);
  }

  return str;
};
/**
 * Splits a path by period character, taking into account
 * escaped period characters.
 * @param {String} path The path to split into an array.
 * @return {Array<String>} The component parts of the path, split
 * by period character.
 */


var split = function split(path) {
  // Convert all \. (escaped periods) to another character
  // temporarily
  var escapedPath = path.replace(/\\\./g, "[--]");
  var splitPath = escapedPath.split("."); // Loop the split path array and convert any escaped period
  // placeholders back to their real period characters

  for (var i = 0; i < splitPath.length; i++) {
    splitPath[i] = splitPath[i].replace(/\[--]/g, "\\.");
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


var escape = function escape(str) {
  return str.replace(/\./g, "\\.");
};
/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value.
 * @param {String} str The string to unescape.
 * @returns {string} The unescaped string.
 */


var unEscape = function unEscape(str) {
  return str.replace(/\\./g, ".");
};
/**
 * Gets a single value from the passed object and given path.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {Object=} options Optional options object.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */


var get = function get(obj, path) {
  var defaultVal = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var internalPath = path,
      objPart;

  if (path instanceof Array) {
    return path.map(function (individualPath) {
      get(obj, individualPath, defaultVal, options);
    });
  }

  options = _objectSpread({
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


  if (isNonCompositePath(internalPath)) {
    return obj[internalPath] !== undefined ? obj[internalPath] : defaultVal;
  }

  if ((0, _typeof2["default"])(obj) !== "object") {
    return defaultVal !== undefined ? defaultVal : undefined;
  }

  var pathParts = split(internalPath);
  objPart = obj;

  var _loop2 = function _loop2(i) {
    var pathPart = pathParts[i];
    objPart = objPart[options.transformKey(unEscape(pathPart))];

    if (objPart instanceof Array && options.arrayTraversal === true) {
      // The data is an array and we have arrayTraversal enabled
      // so loop the array items and return the first non-undefined
      // value from any array item leaf node that matches the path
      var result = objPart.reduce(function (result, arrItem) {
        return get(arrItem, pathParts.slice(i + 1).join("."), defaultVal, options);
      }, undefined);
      return {
        v: result !== undefined ? result : defaultVal
      };
    } else if (!objPart || (0, _typeof2["default"])(objPart) !== "object") {
      if (i !== pathParts.length - 1) {
        // The path terminated in the object before we reached
        // the end node we wanted so make sure we return undefined
        objPart = undefined;
      }

      return "break";
    }
  };

  _loop: for (var i = 0; i < pathParts.length; i++) {
    var _ret = _loop2(i);

    switch (_ret) {
      case "break":
        break _loop;

      default:
        if ((0, _typeof2["default"])(_ret) === "object") return _ret.v;
    }
  }

  return objPart !== undefined ? objPart : defaultVal;
};
/**
 * Sets a single value on the passed object and given path. This
 * will directly modify the "obj" object. If you need immutable
 * updates, use setImmutable() instead.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to set data on.
 * @param {*} val The value to assign to the obj at the path.
 * @param {Object=} options The options object.
 * @returns {*} Nothing.
 */


var set = function set(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var internalPath = path,
      objPart;
  options = _objectSpread({
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

  if ((0, _typeof2["default"])(obj) !== "object") {
    return;
  } // Path has no dot-notation, set key/value


  if (isNonCompositePath(internalPath)) {
    // Do not allow prototype pollution
    if (internalPath === "__proto__") return obj;
    obj = decouple(obj, options);
    obj[options.transformKey(unEscape(internalPath))] = val;
    return obj;
  }

  var newObj = decouple(obj, options);
  var pathParts = split(internalPath);
  var pathPart = pathParts.shift();
  var transformedPathPart = options.transformKey(pathPart); // Do not allow prototype pollution

  if (transformedPathPart === "__proto__") return obj;
  var childPart = newObj[transformedPathPart];

  if ((0, _typeof2["default"])(childPart) !== "object") {
    // Create an object or array on the path
    if (String(parseInt(transformedPathPart, 10)) === transformedPathPart) {
      // This is an array index
      newObj[transformedPathPart] = [];
    } else {
      newObj[transformedPathPart] = {};
    }

    objPart = newObj[transformedPathPart];
  } else {
    objPart = childPart;
  }

  return set(newObj, transformedPathPart, set(objPart, pathParts.join('.'), val, options), options);
};
/**
 * Deletes a key from an object by the given path.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to delete.
 * @param {Object=} options The options object.
 * @param {Object=} tracking Do not use.
 */


var unSet = function unSet(obj, path) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var tracking = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var internalPath = path;
  options = _objectSpread({
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

  if ((0, _typeof2["default"])(obj) !== "object") {
    return;
  }

  var newObj = decouple(obj, options); // Path has no dot-notation, set key/value

  if (isNonCompositePath(internalPath)) {
    var unescapedPath = unEscape(internalPath); // Do not allow prototype pollution

    if (unescapedPath === "__proto__") return obj;

    if (newObj.hasOwnProperty(unescapedPath)) {
      delete newObj[options.transformKey(unescapedPath)];
      return newObj;
    }

    tracking.returnOriginal = true;
    return obj;
  }

  var pathParts = split(internalPath);
  var pathPart = pathParts.shift();
  var transformedPathPart = options.transformKey(unEscape(pathPart)); // Do not allow prototype pollution

  if (transformedPathPart === "__proto__") return obj;
  var childPart = newObj[transformedPathPart];

  if (!childPart) {
    // No child part available, nothing to unset!
    tracking.returnOriginal = true;
    return obj;
  }

  newObj[transformedPathPart] = unSet(childPart, pathParts.join('.'), options, tracking);

  if (tracking.returnOriginal) {
    return obj;
  }

  return newObj;
};
/**
 * Takes an update object or array and iterates the keys of it, then
 * sets data on the target object or array at the specified path with
 * the corresponding value from the path key, effectively doing
 * multiple set() operations in a single call. This will directly
 * modify the "obj" object. If you need immutable updates, use
 * updateImmutable() instead.
 * @param {Object|Array} obj The object to operate on.
 * @param {Object|Array} updateData The update data to apply with
 * keys as string paths.
 * @param {Object=} options The options object.
 * @returns {*} The object with the modified data.
 */


var update = function update(obj, updateData) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var newObj = obj;

  for (var path in updateData) {
    if (updateData.hasOwnProperty(path)) {
      var data = updateData[path];
      newObj = set(newObj, path, data, options);
    }
  }

  return newObj;
};
/**
 * If options.immutable === true then return a new de-referenced
 * instance of the passed object/array. If immutable is false
 * then simply return the same `obj` that was passed.
 * @param {*} obj The object or array to decouple.
 * @param {Object=} options The options object that has the immutable
 * key with a boolean value.
 * @returns {*} The new decoupled instance (if immutable is true)
 * or the original `obj` if immutable is false.
 */


var decouple = function decouple(obj) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  if (!options.immutable) {
    return obj;
  }

  return _newInstance(obj);
};
/**
 * Push a value to an array on an object for the specified path.
 * @param {Object|Array} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @param {Object=} options An options object.
 * @returns {Object|Array} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */


var pushVal = function pushVal(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (obj === undefined || obj === null || path === undefined) {
    return obj;
  } // Clean the path


  path = clean(path);
  var pathParts = split(path);
  var part = pathParts.shift();
  if (part === "__proto__") return obj;

  if (pathParts.length) {
    // Generate the path part in the object if it does not already exist
    obj[part] = decouple(obj[part], options) || {}; // Recurse

    pushVal(obj[part], pathParts.join("."), val, options);
  } else if (part) {
    // We have found the target array, push the value
    obj[part] = decouple(obj[part], options) || [];

    if (!(obj[part] instanceof Array)) {
      throw "Cannot push to a path whose leaf node is not an array!";
    }

    obj[part].push(val);
  } else {
    // We have found the target array, push the value
    obj = decouple(obj, options) || [];

    if (!(obj instanceof Array)) {
      throw "Cannot push to a path whose leaf node is not an array!";
    }

    obj.push(val);
  }

  return decouple(obj, options);
};
/**
 * Pull a value to from an array at the specified path. Removes the first
 * matching value, not every matching value.
 * @param {Object|Array} obj The object to update.
 * @param {String} path The path to the array to pull from.
 * @param {*} val The value to pull from the array.
 * @param {Object=} options An options object.
 * @returns {Object|Array} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */


var pullVal = function pullVal(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {
    strict: true
  };

  if (obj === undefined || obj === null || path === undefined) {
    return obj;
  } // Clean the path


  path = clean(path);
  var pathParts = split(path);
  var part = pathParts.shift();
  if (part === "__proto__") return obj;

  if (pathParts.length) {
    // Generate the path part in the object if it does not already exist
    obj[part] = decouple(obj[part], options) || {}; // Recurse - we don't need to assign obj[part] the result of this call because
    // we are modifying by reference since we haven't reached the furthest path
    // part (leaf) node yet

    pullVal(obj[part], pathParts.join("."), val, options);
  } else if (part) {
    obj[part] = decouple(obj[part], options) || []; // Recurse - this is the leaf node so assign the response to obj[part] in
    // case it is set to an immutable response

    obj[part] = pullVal(obj[part], "", val, options);
  } else {
    // The target array is the root object, pull the value
    obj = decouple(obj, options) || [];

    if (!(obj instanceof Array)) {
      throw "Cannot pull from a path whose leaf node is not an array!";
    }

    var index = -1; // Find the index of the passed value

    if (options.strict === true) {
      index = obj.indexOf(val);
    } else {
      // Do a non-strict check
      index = obj.findIndex(function (item) {
        return match(item, val);
      });
    }

    if (index > -1) {
      // Remove the item from the array
      obj.splice(index, 1);
    }
  }

  return decouple(obj, options);
};
/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {String} The path to the furthest non-undefined value.
 */


var furthest = function furthest(obj, path) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var internalPath = path,
      objPart;
  options = _objectSpread({
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

  if ((0, _typeof2["default"])(obj) !== "object") {
    return finalPath.join(".");
  } // Path has no dot-notation, return key/value


  if (isNonCompositePath(internalPath)) {
    if (obj[internalPath] !== undefined) {
      return internalPath;
    }

    return finalPath.join(".");
  }

  var pathParts = split(internalPath);
  objPart = obj;

  for (var i = 0; i < pathParts.length; i++) {
    var pathPart = pathParts[i];
    objPart = objPart[options.transformKey(unEscape(pathPart))];

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
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {Object=} options Optional options object.
 * @returns {Object|Array} The result of the traversal.
 */


var values = function values(obj, path) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var internalPath = clean(path);
  var pathParts = split(internalPath);
  var currentPath = [];
  var valueData = {};
  options = _objectSpread({
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
 * @param {Object|Array} obj The object to scan.
 * @param {Array=} finalArr An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param {Object=} options An options object.
 * @returns {Array<String>} An array containing path strings.
 */


var flatten = function flatten(obj) {
  var finalArr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var parentPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var objCache = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
  options = _objectSpread({
    "transformRead": returnWhatWasGiven,
    "transformKey": returnWhatWasGiven,
    "transformWrite": returnWhatWasGiven
  }, options);
  var transformedObj = options.transformRead(obj); // Check that we haven't visited this object before (avoid infinite recursion)

  if (objCache.indexOf(transformedObj) > -1) {
    return finalArr;
  } // Add object to cache to make sure we don't traverse it twice


  objCache.push(transformedObj);

  var currentPath = function currentPath(i) {
    var tKey = options.transformKey(i);
    return parentPath ? parentPath + "." + tKey : tKey;
  };

  for (var i in transformedObj) {
    if (transformedObj.hasOwnProperty(i)) {
      if (options.ignore && options.ignore.test(i)) {
        continue;
      }

      if ((0, _typeof2["default"])(transformedObj[i]) === "object" && transformedObj[i] !== null) {
        flatten(transformedObj[i], finalArr, currentPath(i), options, objCache);
      }

      finalArr.push(currentPath(i));
    }
  }

  return finalArr;
};
/**
 * Takes an object and finds all paths, then returns the paths as keys
 * and the values of each path as the values.
 * @param {Object|Array} obj The object to scan.
 * @param {Object=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly).
 * @param {Object=} options An options object.
 * @returns {Object|Array} An object containing path keys and their values.
 */


var flattenValues = function flattenValues(obj) {
  var finalObj = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var parentPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  var objCache = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];
  options = _objectSpread({
    "transformRead": returnWhatWasGiven,
    "transformKey": returnWhatWasGiven,
    "transformWrite": returnWhatWasGiven
  }, options);
  var transformedObj = options.transformRead(obj); // Check that we haven't visited this object before (avoid infinite recursion)

  if (objCache.indexOf(transformedObj) > -1) {
    return finalObj;
  } // Add object to cache to make sure we don't traverse it twice


  objCache.push(transformedObj);

  var currentPath = function currentPath(i, info) {
    var tKey = options.transformKey(i, info);
    return parentPath ? parentPath + "." + tKey : tKey;
  };

  for (var i in transformedObj) {
    if (transformedObj.hasOwnProperty(i)) {
      var _type = (0, _typeof2["default"])(transformedObj[i]);

      var info = {
        type: _type,
        isArrayIndex: Array.isArray(transformedObj),
        isFlat: _type !== "object" || transformedObj[i] instanceof Date || transformedObj[i] instanceof RegExp
      };
      var pathKey = currentPath(i, info);

      if (!info.isFlat) {
        if (transformedObj[i] !== null) {
          flattenValues(transformedObj[i], finalObj, pathKey, options, objCache);
        }
      } else if (options.leavesOnly) {
        // Found leaf node!
        finalObj[pathKey] = options.transformWrite(transformedObj[i]);
      }

      if (!options.leavesOnly) {
        finalObj[pathKey] = options.transformWrite(transformedObj[i]);
      }
    }
  }

  return finalObj;
};
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {...String} args args Path to join.
 * @returns {String} A final path string.
 */


var join = function join() {
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
 * @param {...String} args Path to join.
 * @returns {String} A final path string.
 */


var joinEscaped = function joinEscaped() {
  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  var escapedArgs = args.map(function (item) {
    return escape(item);
  });
  return join.apply(void 0, (0, _toConsumableArray2["default"])(escapedArgs));
};
/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {Object|Array} obj The object to count key leaf nodes for.
 * @param {Array=} objCache Do not use. Internal array to track
 * visited leafs.
 * @returns {Number} The number of keys.
 */


var countLeafNodes = function countLeafNodes(obj) {
  var objCache = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var totalKeys = 0; // Add object to cache to make sure we don't traverse it twice

  objCache.push(obj);

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (obj[i] !== undefined) {
        if ((0, _typeof2["default"])(obj[i]) !== "object" || objCache.indexOf(obj[i]) > -1) {
          totalKeys++;
        } else {
          totalKeys += countLeafNodes(obj[i], objCache);
        }
      }
    }
  }

  return totalKeys;
};
/**
 * Finds all the leaf nodes for a given object and returns an array of paths
 * to them. This is different from `flatten()` in that it only includes leaf
 * nodes and will not include every intermediary path traversed to get to a
 * leaf node.
 * @param {Object|Array} obj The object to traverse.
 * @param {String} [parentPath=""] The path to use as a root/base path to
 * start scanning for leaf nodes under.
 * @param {Object} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {[]}
 */


var leafNodes = function leafNodes(obj) {
  var parentPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
  var objCache = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var paths = []; // Add object to cache to make sure we don't traverse it twice

  objCache.push(obj);

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (obj[i] !== undefined) {
        var currentPath = join(parentPath, i);

        if ((0, _typeof2["default"])(obj[i]) !== "object" || objCache.indexOf(obj[i]) > -1) {
          paths.push(currentPath);
        } else {
          paths.push.apply(paths, (0, _toConsumableArray2["default"])(leafNodes(obj[i], currentPath, objCache)));
        }
      }
    }
  }

  return paths;
};
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths. MAY NOT BE INFINITE RECURSION SAFE.
 * @param {Object|Array} testKeys The object describing the paths to test for.
 * @param {Object|Array} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */


var hasMatchingPathsInObject = function hasMatchingPathsInObject(testKeys, testObj) {
  var result = true;

  for (var i in testKeys) {
    if (testKeys.hasOwnProperty(i)) {
      if (testObj[i] === undefined) {
        return false;
      }

      if ((0, _typeof2["default"])(testKeys[i]) === "object" && testKeys[i] !== null) {
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
 * MAY NOT BE INFINITE RECURSION SAFE.
 * @param {Object|Array} testKeys The object describing the paths to test for.
 * @param {Object|Array} testObj The object to test paths against.
 * @returns {Object<matchedKeys<Number>, matchedKeyCount<Number>, totalKeyCount<Number>>} Stats on the matched keys.
 */


var countMatchingPathsInObject = function countMatchingPathsInObject(testKeys, testObj) {
  var matchedKeys = {};
  var matchData,
      matchedKeyCount = 0,
      totalKeyCount = 0;

  for (var i in testObj) {
    if (testObj.hasOwnProperty(i)) {
      if ((0, _typeof2["default"])(testObj[i]) === "object" && testObj[i] !== null) {
        // The test / query object key is an object, recurse
        matchData = countMatchingPathsInObject(testKeys[i], testObj[i]);
        matchedKeys[i] = matchData.matchedKeys;
        totalKeyCount += matchData.totalKeyCount;
        matchedKeyCount += matchData.matchedKeyCount;
      } else {
        // The test / query object has a property that is not an object so add it as a key
        totalKeyCount++; // Check if the test keys also have this key and it is also not an object

        if (testKeys && testKeys[i] && ((0, _typeof2["default"])(testKeys[i]) !== "object" || testKeys[i] === null)) {
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
/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param {*} item The item to get the type of.
 * @returns {string|"undefined"|"object"|"boolean"|"number"|"string"|"function"|"symbol"|"null"|"array"}
 */


var type = function type(item) {
  if (item === null) {
    return 'null';
  }

  if (Array.isArray(item)) {
    return 'array';
  }

  return (0, _typeof2["default"])(item);
};
/**
 * Determines if the query data exists anywhere inside the source
 * data. Will recurse into arrays and objects to find query.
 * @param {*} source The source data to check.
 * @param {*} query The query data to find.
 * @returns {Boolean} True if query was matched, false if not.
 */


var match = function match(source, query) {
  var sourceType = (0, _typeof2["default"])(source);
  var queryType = (0, _typeof2["default"])(query);

  if (sourceType !== queryType) {
    return false;
  }

  if (sourceType !== "object" || source === null) {
    // Simple test
    return source === query;
  } // The source is an object-like (array or object) structure


  var entries = Object.entries(query);
  var foundNonMatch = entries.find(function (_ref3) {
    var _ref4 = (0, _slicedToArray2["default"])(_ref3, 2),
        key = _ref4[0],
        val = _ref4[1];

    // Recurse if type is array or object
    if ((0, _typeof2["default"])(val) === "object" && val !== null) {
      return !match(source[key], val);
    }

    return source[key] !== val;
  });
  return !foundNonMatch;
};
/**
 * @typedef {object} FindOptionsObject
 * @property {number} [maxDepth=Infinity] The maximum depth to scan inside
 * the source object for matching data.
 * @property {number} [currentDepth=0] The current depth of the
 * operation scan.
 * @property {boolean} [includeRoot=true] If true, will include the
 * root source object if it matches the query.
 */

/**
 * Finds all items that matches the structure of `query` and
 * returns the path to them as an array of strings.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsObject} [options] Options object.
 * @param {String=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<Boolean> and path<Array>.
 */


var findPath = function findPath(source, query) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
  };
  var parentPath = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
  var resultArr = [];
  var sourceType = (0, _typeof2["default"])(source);
  options = _objectSpread({
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
  }, options);

  if (options.currentDepth !== 0 || options.currentDepth === 0 && options.includeRoot) {
    if (match(source, query)) {
      resultArr.push(parentPath);
    }
  }

  options.currentDepth++;

  if (options.currentDepth <= options.maxDepth && sourceType === "object") {
    var entries = Object.entries(source);
    entries.forEach(function (_ref5) {
      var _ref6 = (0, _slicedToArray2["default"])(_ref5, 2),
          key = _ref6[0],
          val = _ref6[1];

      // Recurse down object to find more instances
      var result = findPath(val, query, options, join(parentPath, key));

      if (result.match) {
        resultArr.push.apply(resultArr, (0, _toConsumableArray2["default"])(result.path));
      }
    });
  }

  return {
    match: resultArr.length > 0,
    path: resultArr
  };
};
/**
 * Finds the first item that matches the structure of `query`
 * and returns the path to it.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsObject} [options] Options object.
 * @param {String=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<Boolean> and path<String>.
 */


var findOnePath = function findOnePath(source, query) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
  };
  var parentPath = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
  var sourceType = (0, _typeof2["default"])(source);
  options = _objectSpread({
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
  }, options);

  if (options.currentDepth !== 0 || options.currentDepth === 0 && options.includeRoot) {
    if (match(source, query)) {
      return {
        match: true,
        path: parentPath
      };
    }
  }

  options.currentDepth++;

  if (options.currentDepth <= options.maxDepth && sourceType === "object" && source !== null) {
    var entries = Object.entries(source);

    for (var i = 0; i < entries.length; i++) {
      var _entries$i = (0, _slicedToArray2["default"])(entries[i], 2),
          key = _entries$i[0],
          val = _entries$i[1]; // Recurse down object to find more instances


      var subPath = join(parentPath, key);
      var result = findOnePath(val, query, options, subPath);

      if (result.match) {
        return result;
      }
    }
  }

  return {
    match: false
  };
};
/**
 * Returns a deduplicated array of strings.
 * @param {Array<String>} keys An array of strings to deduplicate.
 * @returns {Array<String>} The deduplicated array.
 */


var keyDedup = function keyDedup(keys) {
  return keys.filter(function (elem, pos, arr) {
    return arr.indexOf(elem) === pos;
  });
};
/**
 * Compares two provided objects / arrays and returns an array of
 * dot-notation paths to the fields that hold different values.
 * @param {Object|Array} obj1 The first object / array to compare.
 * @param {Object|Array} obj2 The second object / array to compare.
 * @param {String=""} basePath The base path from which to check for
 * differences. Differences outside the base path will not be
 * returned as part of the array of differences. Leave blank to check
 * for all differences between the two objects to compare.
 * @param {Boolean=false} strict If strict is true, diff uses strict
 * equality to determine difference rather than non-strict equality;
 * effectively (=== is strict, == is non-strict).
 * @param {Number=Infinity} maxDepth Specifies the maximum number of
 * path sub-trees to walk down before returning what we have found.
 * For instance, if set to 2, a diff would only check down,
 * "someFieldName.anotherField", or "user.name" and would not go
 * further down than two fields. If anything in the trees further
 * down than this level have changed, the change will not be detected
 * and the path will not be included in the resulting diff array.
 * @param {String=""} parentPath Used internally only.
 * @returns {Array} An array of strings, each string is a path to a
 * field that holds a different value between the two objects being
 * compared.
 */


var diff = function diff(obj1, obj2) {
  var basePath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
  var strict = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var maxDepth = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : Infinity;
  var parentPath = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : "";
  var objCache = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : [];
  var paths = [];

  if (basePath instanceof Array) {
    // We were given an array of paths, check each path
    return basePath.reduce(function (arr, individualPath) {
      // Here we find any path that has a *non-equal* result which
      // returns true and then returns the index as a positive integer
      // that is not -1. If -1 is returned then no non-equal matches
      // were found
      var result = diff(obj1, obj2, individualPath, strict, maxDepth, parentPath, objCache);

      if (result && result.length) {
        arr.push.apply(arr, (0, _toConsumableArray2["default"])(result));
      }

      return arr;
    }, []);
  }

  var currentPath = join(parentPath, basePath);
  var val1 = get(obj1, basePath);
  var val2 = get(obj2, basePath);
  var type1 = type(val1);
  var type2 = type(val2);

  if (type1 !== type2) {
    // Difference in source and comparison types
    paths.push(currentPath);
  } else if (type1 === "array" && val1.length !== val2.length) {
    // Difference in source and comparison types
    paths.push(currentPath);
  }

  var pathParts = currentPath.split(".");
  var hasParts = pathParts[0] !== "";

  if ((!hasParts || pathParts.length < maxDepth) && (0, _typeof2["default"])(val1) === "object" && val1 !== null) {
    // Check that we haven't visited this object before (avoid infinite recursion)
    if (objCache.indexOf(val1) > -1 || objCache.indexOf(val2) > -1) {
      return paths;
    }

    objCache.push(val1);
    objCache.push(val2); // Grab composite of all keys on val1 and val2

    var val1Keys = Object.keys(val1);
    var val2Keys = (0, _typeof2["default"])(val2) === "object" && val2 !== null ? Object.keys(val2) : [];
    var compositeKeys = keyDedup(val1Keys.concat(val2Keys));
    return compositeKeys.reduce(function (arr, key) {
      var result = diff(val1, val2, key, strict, maxDepth, currentPath, objCache);

      if (result && result.length) {
        arr.push.apply(arr, (0, _toConsumableArray2["default"])(result));
      }

      return arr;
    }, paths);
  }

  if (strict && val1 !== val2 || !strict && val1 != val2) {
    paths.push(currentPath);
  }

  return keyDedup(paths);
};
/**
 * A boolean check to see if the values at the given path or paths
 * are the same in both given objects.
 * @param {*} obj1 The first object to check values in.
 * @param {*} obj2 The second object to check values in.
 * @param {Array<String>|String}path A path or array of paths to check
 * values in. If this is an array, all values at the paths in the array
 * must be the same for the function to provide a true result.
 * @param {Boolean} deep If true will traverse all objects and arrays
 * to check for equality. Defaults to false.
 * @param {Boolean} strict If true, values must be strict-equal.
 * Defaults to false.
 * @returns {Boolean} True if path values match, false if not.
 */


var isEqual = function isEqual(obj1, obj2, path) {
  var deep = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var strict = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  if (path instanceof Array) {
    // We were given an array of paths, check each path
    return path.findIndex(function (individualPath) {
      // Here we find any path that has a *non-equal* result which
      // returns true and then returns the index as a positive integer
      // that is not -1. If -1 is returned then no non-equal matches
      // were found
      return isNotEqual(obj1, obj2, individualPath, deep, strict);
    }) === -1;
  }

  var val1 = get(obj1, path);
  var val2 = get(obj2, path);

  if (deep) {
    if ((0, _typeof2["default"])(val1) === "object" && val1 !== null) {
      // TODO: This probably needs a composite key array of val1 and val2 keys
      //  just as we do in the diff() function
      return Object.keys(val1).findIndex(function (key) {
        return isNotEqual(val1, val2, key, deep, strict);
      }) === -1;
    }
  }

  return strict && val1 === val2 || !strict && val1 == val2;
};
/**
 * A boolean check to see if the values at the given path or paths
 * are different in both given objects.
 * @param {*} obj1 The first object to check values in.
 * @param {*} obj2 The second object to check values in.
 * @param {Array<String>|String}path A path or array of paths to
 * check values in. If this is an array, all values at the paths
 * in the array must be different for the function to provide a
 * true result.
 * @param {Boolean} deep If true will traverse all objects and arrays
 * to check for inequality. Defaults to false.
 * @param {Boolean} strict If true, values must be strict-not-equal.
 * Defaults to false.
 * @returns {Boolean} True if path values differ, false if not.
 */


var isNotEqual = function isNotEqual(obj1, obj2, path) {
  var deep = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var strict = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;
  return !isEqual(obj1, obj2, path, deep, strict);
};
/**
 * Same as set() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {Object=} options The options object.
 * @returns {*} The new object with the modified data.
 */


var setImmutable = function setImmutable(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  return set(obj, path, val, _objectSpread(_objectSpread({}, options), {}, {
    immutable: true
  }));
};
/**
 * Same as pushVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {Object=} options The options object.
 * @returns {*} The new object with the modified data.
 */


var pushValImmutable = function pushValImmutable(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  return pushVal(obj, path, val, _objectSpread(_objectSpread({}, options), {}, {
    immutable: true
  }));
};
/**
 * Same as pullVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {Object=} options The options object.
 * @returns {*} The new object with the modified data.
 */


var pullValImmutable = function pullValImmutable(obj, path, val) {
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  return pullVal(obj, path, val, _objectSpread(_objectSpread({}, options), {}, {
    immutable: true
  }));
};
/**
 * Same as unSet() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {Object|Array} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {Object=} options The options object.
 * @returns {*} The new object with the modified data.
 */


var unSetImmutable = function unSetImmutable(obj, path) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return unSet(obj, path, _objectSpread(_objectSpread({}, options), {}, {
    immutable: true
  }));
};
/**
 * Same as update() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {Object|Array} obj The object to operate on.
 * @param {Object|Array} updateData The update data to apply with
 * keys as string paths.
 * @param {Object=} options The options object.
 * @returns {*} The new object with the modified data.
 */


var updateImmutable = function updateImmutable(obj, updateData, options) {
  return update(obj, updateData, _objectSpread(_objectSpread({}, options), {}, {
    immutable: true
  }));
};
/**
 * Gets the values of the paths in pathArr and returns them as an object
 * with each key matching the path and the value matching the value from
 * obj that was at that path.
 * @param {Object} obj The object to operate on.
 * @param {Array<String>} pathArr Array of path strings.
 * @returns {*} The new object.
 */


var distill = function distill(obj, pathArr) {
  return pathArr.reduce(function (newObj, path) {
    newObj[path] = get(obj, path);
    return newObj;
  }, {});
};
/**
 * Chops a `path` string down to the given `level`. Given a `path` string
 * like "foo.bar.ram.you.too", chop will remove any path parts below
 * the given `level`. If we pass 2 as the `level` with that given `path`,
 * the result will be "foo.bar" as foo is level 1 and bar is level 2.
 * If the `path` is shorter than the given `level`, it is returned intact.
 * @param {String} path The path to operate on.
 * @param {Number} level The maximum level of a path.
 * @returns {String} The new path string.
 */


var chop = function chop(path, level) {
  var parts = split(path);

  if (parts.length > level) {
    parts.length = level;
  }

  return join.apply(void 0, (0, _toConsumableArray2["default"])(parts));
};

module.exports = {
  wildcardToZero: wildcardToZero,
  numberToWildcard: numberToWildcard,
  clean: clean,
  decouple: decouple,
  split: split,
  escape: escape,
  get: get,
  set: set,
  setImmutable: setImmutable,
  unSet: unSet,
  unSetImmutable: unSetImmutable,
  pushValImmutable: pushValImmutable,
  pushVal: pushVal,
  pullValImmutable: pullValImmutable,
  pullVal: pullVal,
  furthest: furthest,
  values: values,
  flatten: flatten,
  flattenValues: flattenValues,
  join: join,
  joinEscaped: joinEscaped,
  up: up,
  down: down,
  push: push,
  pop: pop,
  shift: shift,
  countLeafNodes: countLeafNodes,
  hasMatchingPathsInObject: hasMatchingPathsInObject,
  countMatchingPathsInObject: countMatchingPathsInObject,
  findOnePath: findOnePath,
  findPath: findPath,
  type: type,
  match: match,
  isEqual: isEqual,
  isNotEqual: isNotEqual,
  leafNodes: leafNodes,
  diff: diff,
  update: update,
  updateImmutable: updateImmutable,
  distill: distill,
  chop: chop
};