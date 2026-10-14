"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merge = exports.chop = exports.distill = exports.unSetImmutable = exports.pullValImmutable = exports.pushValImmutable = exports.setImmutable = exports.isNotEqual = exports.isEqual = exports.diff = exports.diffValues = exports.keyDedup = exports.findOnePath = exports.findPath = exports.match = exports.type = exports.countMatchingPathsInObject = exports.hasMatchingPathsInObject = exports.leafNodes = exports.countLeafNodes = exports.joinEscaped = exports.join = exports.flattenValues = exports.flatten = exports.values = exports.furthest = exports.splicePath = exports.pullVal = exports.pushVal = exports.decouple = exports.updateImmutable = exports.update = exports.unSet = exports.set = exports.getMany = exports.get = exports.unEscape = exports.escape = exports.split = exports.clean = exports.numberToWildcard = exports.wildcardToZero = exports.returnWhatWasGiven = exports.shift = exports.push = exports.pop = exports.down = exports.up = exports.isNonCompositePath = exports.isCompositePath = void 0;
exports.traverse = exports.query = exports.mergeImmutable = void 0;
/**
 * @typedef {object} FindOptionsType
 * @property {number} [maxDepth=Infinity] The maximum depth to scan inside
 * the source object for matching data.
 * @property {number} [currentDepth=0] The current depth of the
 * operation scan.
 * @property {boolean} [includeRoot=true] If true, will include the
 * root source object if it matches the query.
 */
/**
 * Arrays longer than this are copied by their existing indexes only, so
 * a sparse array with a huge length (e.g. one created by setting
 * "arr.4000000000") cannot exhaust memory when it is copied.
 * @private
 */
const SPARSE_COPY_LENGTH = 1000000;
/**
 * Determines if writing to the given key would modify the prototype of
 * an object rather than the object itself.
 * @param {*} key The key to check.
 * @returns {boolean} True if the key must not be written to.
 * @private
 */
const _isUnsafeKey = (key) => key === "__proto__";
/**
 * Checks if the object has its own property with the given key without
 * relying on the object's own hasOwnProperty() which may have been
 * overridden by data or may not exist at all (Object.create(null)).
 * @param {object} obj The object to check.
 * @param {PropertyKey} key The key to check for.
 * @returns {boolean} True if the object has its own property.
 * @private
 */
const _hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
/**
 * Determines if the value is an object or array that can be traversed.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is a non-null object.
 * @private
 */
const _isObjectLike = (val) => typeof val === "object" && val !== null;
/**
 * Determines if the value is a plain object (created via an object
 * literal, JSON.parse() or Object.create(null)) rather than an array,
 * a class instance or a built-in like Date or Map.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is a plain object.
 * @private
 */
const _isPlainObject = (val) => {
    if (!_isObjectLike(val) || Array.isArray(val)) {
        return false;
    }
    const proto = Object.getPrototypeOf(val);
    // Plain objects from another realm (e.g. an iframe) have a different
    // Object.prototype so check the shape of the chain instead
    return proto === null || Object.getPrototypeOf(proto) === null;
};
/**
 * Determines if the key is a canonical array index e.g. "0" or "12" but
 * not "-1", "01" or "1.5".
 * @param {string} key The key to check.
 * @returns {boolean} True if the key is an array index.
 * @private
 */
const _isArrayIndex = (key) => /^(?:0|[1-9]\d*)$/.test(key) && Number(key) < 4294967295;
/**
 * Sets a value as an own property of the object. Plain assignment of a
 * "__proto__" key would change the prototype of the object instead, so
 * that key is defined explicitly.
 * @param {ObjectType} obj The object to set the value on.
 * @param {string} key The key to set.
 * @param {*} val The value to set.
 * @private
 */
const _setOwn = (obj, key, val) => {
    if (key === "__proto__") {
        Object.defineProperty(obj, key, { value: val, writable: true, enumerable: true, configurable: true });
        return;
    }
    obj[key] = val;
};
/**
 * Copies every own key / value of the source object onto the target
 * object as own properties.
 * @param {ObjectType} target The object to copy to.
 * @param {ObjectType} source The object to copy from.
 * @private
 */
const _assignOwn = (target, source) => {
    Object.keys(source).forEach((key) => _setOwn(target, key, source[key]));
};
/**
 * Throws if the path is not a string.
 * @param {*} path The path to check.
 * @private
 */
const _assertPathIsString = (path) => {
    if (typeof path !== "string") {
        throw new Error("Path argument must be a string");
    }
};
/**
 * Creates a new instance of "item" that is dereferenced. Useful
 * when you want to return a new version of "item" with the same
 * data for immutable data structures. Primitives and functions are
 * returned as they are.
 * @param {*} item The item to mimic.
 * @returns {*} A new dereferenced version of "item".
 * @private
 */
const _newInstance = (item) => {
    if (Array.isArray(item)) {
        if (item.length <= SPARSE_COPY_LENGTH) {
            return item.slice();
        }
        const newArr = new Array(item.length);
        Object.keys(item).forEach((key) => {
            newArr[key] = item[key];
        });
        return newArr;
    }
    if (!_isObjectLike(item)) {
        return item;
    }
    // Built-ins that keep their data in internal slots need their own
    // constructor to be copied
    if (item instanceof Date)
        return new Date(item.getTime());
    if (item instanceof RegExp)
        return new RegExp(item);
    if (item instanceof Map)
        return new Map(item);
    if (item instanceof Set)
        return new Set(item);
    const proto = Object.getPrototypeOf(item);
    // Object spread compiles to Object.assign() which would turn an own
    // "__proto__" key (e.g. from JSON.parse()) into a prototype change
    if (proto === Object.prototype && !_hasOwn(item, "__proto__")) {
        return Object.assign({}, item);
    }
    // Keep the prototype of class instances and objects without one
    return Object.defineProperties(Object.create(proto), Object.getOwnPropertyDescriptors(item));
};
/**
 * Determines if the given path points to a root leaf node (has no delimiter)
 * or contains a dot delimiter so will drill down before reaching a leaf node.
 * If it has a delimiter, it is called a "composite" path.
 * @param {string} path The path to evaluate.
 * @returns {boolean} True if delimiter found, false if not.
 */
const isCompositePath = (path) => {
    return (0, exports.split)(path).length > 1;
};
exports.isCompositePath = isCompositePath;
/**
 * Provides the opposite of `isCompositePath()`. If a delimiter is found, this
 * function returns false.
 * @param {string} path The path to evaluate.
 * @returns {boolean} False if delimiter found, true if not.
 */
const isNonCompositePath = (path) => {
    return !(0, exports.isCompositePath)(path);
};
exports.isNonCompositePath = isNonCompositePath;
/**
 * Returns the given path after removing the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * move up.
 * @returns {string} The new path string.
 */
const up = (path, levels = 1) => {
    const parts = (0, exports.split)(path);
    for (let i = 0; i < levels; i++) {
        parts.pop();
    }
    return parts.join(".");
};
exports.up = up;
/**
 * Returns the given path after removing the first
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "bar.thing".
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * move down.
 * @returns {string} The new path string.
 */
const down = (path, levels = 1) => {
    const parts = (0, exports.split)(path);
    for (let i = 0; i < levels; i++) {
        parts.shift();
    }
    return parts.join(".");
};
exports.down = down;
/**
 * Returns the last leaf from the path. E.g.
 * "foo.bar.thing" returns "thing".
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * pop.
 * @returns {string} The new path string.
 */
const pop = (path, levels = 1) => {
    const parts = (0, exports.split)(path);
    let part;
    for (let i = 0; i < levels; i++) {
        part = parts.pop();
    }
    return part || "";
};
exports.pop = pop;
/**
 * Adds a leaf to the end of the path. E.g.
 * pushing "goo" to path "foo.bar.thing" returns
 * "foo.bar.thing.goo". A blank path or leaf does
 * not add a delimiter.
 * @param {string} path The path to operate on.
 * @param {string} val The string value to push
 * to the end of the path.
 * @returns {string} The new path string.
 */
const push = (path, val = "") => {
    return (0, exports.join)(path, val);
};
exports.push = push;
/**
 * Returns the first leaf from the path. E.g.
 * "foo.bar.thing" returns "foo".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * shift.
 * @returns {string} The new path string.
 */
const shift = (path, levels = 1) => {
    const parts = (0, exports.split)(path);
    let part;
    for (let i = 0; i < levels; i++) {
        part = parts.shift();
    }
    return part || "";
};
exports.shift = shift;
/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {*} The passed argument.
 */
const returnWhatWasGiven = (val, currentObj) => val;
exports.returnWhatWasGiven = returnWhatWasGiven;
/**
 * Converts any key matching the wildcard to a zero.
 * @param {string} key The key to test.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {string} The key.
 */
const wildcardToZero = (key, currentObj) => {
    return key === "$" ? "0" : key;
};
exports.wildcardToZero = wildcardToZero;
/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {string} key The key to test.
 * @returns {string} The original key or a wildcard.
 */
const numberToWildcard = (key) => {
    // Check if the key is a number
    if (String(parseInt(key, 10)) === key) {
        // The key is a number, convert to a wildcard
        return "$";
    }
    return key;
};
exports.numberToWildcard = numberToWildcard;
/**
 * Removes leading period (.) from string and returns new string.
 * @param {string} str The string to clean.
 * @returns {*} The cleaned string.
 */
const clean = (str) => {
    if (!str) {
        return str;
    }
    if (str.substr(0, 1) === ".") {
        str = str.substr(1, str.length - 1);
    }
    return str;
};
exports.clean = clean;
/**
 * Splits a path by period character, taking into account
 * escaped period characters. Escape sequences are kept intact
 * in each part, use `unEscape()` to get the original key.
 * @param {string} path The path to split into an array.
 * @return {Array<string>} The component parts of the path, split
 * by period character.
 */
const split = (path) => {
    // Nothing is escaped so a plain split is enough
    if (path.indexOf("\\") === -1) {
        return path.split(".");
    }
    const parts = [];
    let part = "";
    for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === "\\" && i < path.length - 1) {
            // Keep the escape sequence and skip the escaped character
            // so an escaped period is not treated as a delimiter
            part += char + path[i + 1];
            i++;
        }
        else if (char === ".") {
            parts.push(part);
            part = "";
        }
        else {
            part += char;
        }
    }
    parts.push(part);
    return parts;
};
exports.split = split;
/**
 * Escapes any periods (and backslashes) in the passed string so
 * they will not be identified as part of a path. Useful if you have
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
 * @param {string} str The string to escape periods in.
 * @return {string} The escaped string.
 */
const escape = (str) => {
    return str.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
};
exports.escape = escape;
/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value. A backslash followed
 * by any other character is left as it is.
 * @param {string} str The string to unescape.
 * @returns {string} The unescaped string.
 */
const unEscape = (str) => {
    return str.replace(/\\([.\\])/g, "$1");
};
exports.unEscape = unEscape;
/**
 * The implementation of get(). The options object is shared and mutated
 * by recursive calls (and getMany()) during a single top-level call so
 * wildcard results and path data can be collected.
 * @private
 */
const _get = (obj, path, defaultVal, options) => {
    let objPart;
    if (path instanceof Array) {
        return path.map((individualPath) => {
            return _get(obj, individualPath, defaultVal, Object.assign({}, options));
        });
    }
    options.transformRead = options.transformRead || exports.returnWhatWasGiven;
    options.transformKey = options.transformKey || exports.returnWhatWasGiven;
    options.transformWrite = options.transformWrite || exports.returnWhatWasGiven;
    // No object data, return default data
    if (obj === undefined || obj === null) {
        return defaultVal;
    }
    // No path string, return the base obj
    if (!path) {
        return obj;
    }
    _assertPathIsString(path);
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    // Path has no dot-notation, return key/value
    if (pathParts.length === 1) {
        const key = options.transformKey((0, exports.unEscape)(pathParts[0]), obj);
        // @ts-ignore
        return obj[key] !== undefined ? obj[key] : defaultVal;
    }
    if (typeof obj !== "object") {
        return defaultVal;
    }
    objPart = obj;
    for (let i = 0; i < pathParts.length; i++) {
        const pathPart = pathParts[i];
        const transformedKey = options.transformKey((0, exports.unEscape)(pathPart), objPart);
        options.pathRoot = (0, exports.join)(options.pathRoot || "", pathPart);
        // @ts-ignore
        objPart = objPart[transformedKey];
        const isPartAnArray = objPart instanceof Array;
        if (isPartAnArray && options.wildcardExpansion === true) {
            const nextKey = options.transformKey((0, exports.unEscape)(pathParts[i + 1] || ""), objPart);
            if (nextKey === "$") {
                // Define an array to store our results in down the tree
                options.expandedResult = options.expandedResult || [];
                // The key is a wildcard and wildcardExpansion is enabled
                objPart.forEach((arrItem) => {
                    const innerKey = pathParts.slice(i + 2).join(".");
                    if (innerKey === "") {
                        // @ts-ignore
                        options.expandedResult.push(arrItem);
                    }
                    else {
                        const innerResult = _get(arrItem, innerKey, defaultVal, options);
                        if (innerKey.indexOf(".$") === -1) {
                            // @ts-ignore
                            options.expandedResult.push(innerResult);
                        }
                    }
                });
                return options.expandedResult.length !== 0 ? options.expandedResult : defaultVal;
            }
        }
        if (isPartAnArray && options.arrayTraversal === true) {
            // The data is an array and we have arrayTraversal enabled
            // Check for auto-expansion
            if (options.arrayExpansion === true) {
                return _getMany(objPart, pathParts.slice(i + 1).join("."), defaultVal, options);
            }
            // Loop the array items and return the first non-undefined
            // value from any array item leaf node that matches the path
            for (let objPartIndex = 0; objPartIndex < objPart.length; objPartIndex++) {
                const arrItem = objPart[objPartIndex];
                const innerResult = _get(arrItem, pathParts.slice(i + 1).join("."), defaultVal, options);
                if (innerResult !== undefined)
                    return innerResult;
            }
            return defaultVal;
        }
        else if ((!objPart || typeof objPart !== "object") && i !== pathParts.length - 1) {
            // The path terminated in the object before we reached
            // the end node we wanted so make sure we return undefined
            return defaultVal;
        }
    }
    return objPart !== undefined ? objPart : defaultVal;
};
/**
 * Gets a single value from the passed object and given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string|string[]} path The path to retrieve data from. If
 * an array of paths is passed, an array of values is returned.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object. It is
 * not modified, so it is safe to reuse between calls.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */
const get = (obj, path, defaultVal = undefined, options = {}) => {
    return _get(obj, path, defaultVal, Object.assign({}, options));
};
exports.get = get;
/**
 * The implementation of getMany(), see _get() for why the options
 * object is shared.
 * @private
 */
const _getMany = (data, path, defaultVal, options) => {
    var _a, _b;
    const isDataAnArray = data instanceof Array;
    const pathRoot = options.pathRoot || "";
    if (!isDataAnArray) {
        const innerResult = _get(data, path, defaultVal, options);
        const isInnerResultAnArray = innerResult instanceof Array;
        (_b = (_a = options.pathData) === null || _a === void 0 ? void 0 : _a.directPaths) === null || _b === void 0 ? void 0 : _b.push((0, exports.join)(pathRoot, path));
        if (isInnerResultAnArray)
            return innerResult;
        // _get() only returns undefined when there is no default value
        if (innerResult === undefined)
            return [];
        return [innerResult];
    }
    const parts = (0, exports.split)(path);
    const firstPart = parts[0];
    const firstKey = (0, exports.unEscape)(firstPart);
    const pathRemainder = parts.slice(1).join(".");
    const resultArr = data.reduce((innerResult, arrItem, arrIndex) => {
        var _a, _b;
        const itemRoot = (0, exports.join)(pathRoot, String(arrIndex));
        const isArrItemAnArray = _isObjectLike(arrItem) && arrItem[firstKey] instanceof Array;
        if (isArrItemAnArray) {
            options.pathRoot = (0, exports.join)(itemRoot, firstPart);
            const recurseResult = _getMany(arrItem[firstKey], pathRemainder, defaultVal, options);
            innerResult.push(...recurseResult);
            return innerResult;
        }
        // Reset the root so paths recorded for this item don't include
        // the paths walked while getting data from previous items
        options.pathRoot = itemRoot;
        const val = _get(arrItem, path, defaultVal, options);
        if (val !== undefined) {
            (_b = (_a = options.pathData) === null || _a === void 0 ? void 0 : _a.directPaths) === null || _b === void 0 ? void 0 : _b.push((0, exports.join)(itemRoot, path));
            innerResult.push(val);
        }
        return innerResult;
    }, []);
    if (resultArr.length === 0 && defaultVal !== undefined)
        return [defaultVal];
    return resultArr;
};
/**
 * Gets multiple values from the passed arr and given path.
 * @param {ObjectType} data The array or object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object. It is
 * not modified, so it is safe to reuse between calls.
 * @returns {Array}
 */
const getMany = (data, path, defaultVal = undefined, options = {}) => {
    return _getMany(data, path, defaultVal, Object.assign({}, options));
};
exports.getMany = getMany;
/**
 * Sets a single value on the passed object and given path. This
 * will directly modify the "obj" object. If you need immutable
 * updates, use setImmutable() instead.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to set data on.
 * @param {*} val The value to assign to the obj at the path.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The object with the value set, or undefined if the
 * object or path is missing.
 */
const set = (obj, path, val, options = {}) => {
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    // No object data
    if (obj === undefined || obj === null) {
        return;
    }
    // No path string
    if (!path) {
        return;
    }
    _assertPathIsString(path);
    if (typeof obj !== "object") {
        return;
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const key = transformKey((0, exports.unEscape)(pathParts.shift()));
    // Do not allow prototype pollution
    if (_isUnsafeKey(key)) {
        return obj;
    }
    const newObj = (0, exports.decouple)(obj, options);
    if (!pathParts.length) {
        newObj[key] = val;
        return newObj;
    }
    let childPart = newObj[key];
    if (!_isObjectLike(childPart)) {
        // Create the missing path part, an array if the next key is an
        // array index or an object otherwise
        childPart = _isArrayIndex(transformKey((0, exports.unEscape)(pathParts[0]))) ? [] : {};
    }
    newObj[key] = (0, exports.set)(childPart, pathParts.join("."), val, options);
    return newObj;
};
exports.set = set;
/**
 * Deletes a key from an object by the given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to delete.
 * @param {SetOptionsType} [options] The options object.
 * @param {Object=} tracking Do not use.
 */
const unSet = (obj, path, options = {}, tracking = {}) => {
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    // No object data
    if (obj === undefined || obj === null) {
        return;
    }
    // No path string
    if (!path) {
        return;
    }
    _assertPathIsString(path);
    if (typeof obj !== "object") {
        return;
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const key = transformKey((0, exports.unEscape)(pathParts.shift()));
    // Do not allow prototype pollution
    if (_isUnsafeKey(key)) {
        tracking.returnOriginal = true;
        return obj;
    }
    if (!pathParts.length) {
        if (!_hasOwn(obj, key)) {
            tracking.returnOriginal = true;
            return obj;
        }
        const newObj = (0, exports.decouple)(obj, options);
        delete newObj[key];
        return newObj;
    }
    const childPart = obj[key];
    if (!_isObjectLike(childPart)) {
        // No child object to traverse, nothing to unset!
        tracking.returnOriginal = true;
        return obj;
    }
    const newChildPart = (0, exports.unSet)(childPart, pathParts.join("."), options, tracking);
    if (tracking.returnOriginal) {
        return obj;
    }
    const newObj = (0, exports.decouple)(obj, options);
    newObj[key] = newChildPart;
    return newObj;
};
exports.unSet = unSet;
/**
 * Takes an update object or array and iterates the keys of it, then
 * sets data on the target object or array at the specified path with
 * the corresponding value from the path key, effectively doing
 * multiple set() operations in a single call. This will directly
 * modify the "obj" object. If you need immutable updates, use
 * updateImmutable() instead.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param {SetOptionsType} options The options object.
 * @returns {*} The object with the modified data.
 */
const update = (obj, basePath = "", updateData, options = {}) => {
    let newObj = obj;
    for (let path in updateData) {
        if (_hasOwn(updateData, path)) {
            // @ts-ignore
            const data = updateData[path];
            newObj = (0, exports.set)(newObj, (0, exports.join)(basePath, path), data, options);
        }
    }
    return newObj;
};
exports.update = update;
/**
 * Same as update() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
const updateImmutable = (obj, basePath = "", updateData, options = {}) => {
    return (0, exports.update)(obj, basePath, updateData, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.updateImmutable = updateImmutable;
/**
 * If `options.immutable` === true then return a new de-referenced
 * instance of the passed object/array. If immutable is false
 * then simply return the same `obj` that was passed. Class instances
 * keep their prototype and Dates, RegExps, Maps and Sets are copied
 * with their data. Primitives and functions are returned as they are.
 * @param {*} obj The object or array to decouple.
 * @param {OptionsType} [options] The options object.
 * @param {boolean} options.immutable
 * @returns {*} The new decoupled instance (if immutable is true)
 * or the original `obj` if immutable is false.
 */
const decouple = (obj, options = {}) => {
    if (!options.immutable) {
        return obj;
    }
    return _newInstance(obj);
};
exports.decouple = decouple;
/**
 * Push a value to an array on an object for the specified path.
 * @param {ObjectType} obj The object to update.
 * @param {string} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */
const pushVal = (obj, path, val, options = {}) => {
    if (obj === undefined || obj === null || path === undefined) {
        return obj;
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const part = pathParts.shift();
    if (!part) {
        // The root is the target array, push the value
        const newArr = (0, exports.decouple)(obj, options);
        if (!(newArr instanceof Array)) {
            throw new Error("Cannot push to a path whose leaf node is not an array!");
        }
        newArr.push(val);
        return newArr;
    }
    if (!_isObjectLike(obj)) {
        return obj;
    }
    const key = (0, exports.unEscape)(part);
    // Do not allow prototype pollution
    if (_isUnsafeKey(key)) {
        return obj;
    }
    const newObj = (0, exports.decouple)(obj, options);
    const childPart = newObj[key];
    if (pathParts.length) {
        // Generate the path part in the object if it does not already exist
        newObj[key] = (0, exports.pushVal)(_isObjectLike(childPart) ? childPart : {}, pathParts.join("."), val, options);
    }
    else {
        // We have found the target array, create it if it doesn't exist
        newObj[key] = (0, exports.pushVal)(childPart === undefined ? [] : childPart, "", val, options);
    }
    return newObj;
};
exports.pushVal = pushVal;
/**
 * Pull a value to from an array at the specified path. Removes the first
 * matching value, not every matching value. If the path does not exist
 * nothing is changed.
 * @param {ObjectType} obj The object to update.
 * @param {string} path The path to the array to pull from.
 * @param {*} val The value to pull from the array.
 * @param {OptionsType} [options] An options object. Values are matched
 * with strict equality unless `options.strict` is false, in which case
 * the first item matching the structure of `val` is removed.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having removed the newly pulled value.
 */
const pullVal = (obj, path, val, options = {}) => {
    if (obj === undefined || obj === null || path === undefined) {
        return obj;
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const part = pathParts.shift();
    if (!part) {
        // The target array is the root object, pull the value
        if (!(obj instanceof Array)) {
            throw new Error("Cannot pull from a path whose leaf node is not an array!");
        }
        // Find the index of the passed value
        const index = options.strict === false ? obj.findIndex((item) => (0, exports.match)(item, val)) : obj.indexOf(val);
        if (index === -1) {
            return obj;
        }
        // Remove the item from the array
        const newArr = (0, exports.decouple)(obj, options);
        newArr.splice(index, 1);
        return newArr;
    }
    const key = (0, exports.unEscape)(part);
    // Do not allow prototype pollution
    if (_isUnsafeKey(key)) {
        return obj;
    }
    const childPart = obj[key];
    // The path does not exist so there is nothing to pull from
    if (childPart === undefined || (pathParts.length && !_isObjectLike(childPart))) {
        return obj;
    }
    const newChildPart = (0, exports.pullVal)(childPart, pathParts.join("."), val, options);
    // Nothing changed or the change was made in place
    if (newChildPart === childPart) {
        return obj;
    }
    const newObj = (0, exports.decouple)(obj, options);
    newObj[key] = newChildPart;
    return newObj;
};
exports.pullVal = pullVal;
/**
 * Inserts or deletes from/into the array at the specified path. If the
 * path does not exist nothing is changed.
 * @param {ObjectType} obj The object to update.
 * @param {string} path The path to the array to operate on.
 * @param {number} start The index to operate from.
 * @param {number} deleteCount The number of items to delete.
 * @param {any[]} itemsToAdd The items to add to the array or an empty array
 * if no items are to be added.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having inserted or removed based on splice.
 */
const splicePath = (obj, path, start, deleteCount, itemsToAdd = [], options = {}) => {
    if (obj === undefined || obj === null || path === undefined) {
        return obj;
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const part = pathParts.shift();
    if (!part) {
        // We've reached our destination leaf node
        if (!(obj instanceof Array)) {
            throw new Error("Cannot splice from a path whose leaf node is not an array!");
        }
        const newArr = (0, exports.decouple)(obj, options);
        newArr.splice(start, deleteCount, ...itemsToAdd);
        return newArr;
    }
    const key = (0, exports.unEscape)(part);
    // Do not allow prototype pollution
    if (_isUnsafeKey(key)) {
        return obj;
    }
    const childPart = obj[key];
    // The path does not exist so there is nothing to splice
    if (childPart === undefined || (pathParts.length && !_isObjectLike(childPart))) {
        return obj;
    }
    const newObj = (0, exports.decouple)(obj, options);
    newObj[key] = (0, exports.splicePath)(childPart, pathParts.join("."), start, deleteCount, itemsToAdd, options);
    return newObj;
};
exports.splicePath = splicePath;
/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {string} The path to the furthest non-undefined value.
 */
const furthest = (obj, path, options = {}) => {
    const transformKey = options.transformKey || exports.wildcardToZero;
    const finalPath = [];
    // No path string, return the base obj
    if (!path) {
        return "";
    }
    _assertPathIsString(path);
    if (!_isObjectLike(obj)) {
        return "";
    }
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    let objPart = obj;
    for (let i = 0; i < pathParts.length; i++) {
        const pathPart = pathParts[i];
        // Stop at values that can't be traversed instead of reading from them
        objPart = _isObjectLike(objPart) ? objPart[transformKey((0, exports.unEscape)(pathPart))] : undefined;
        if (objPart === undefined) {
            break;
        }
        finalPath.push(pathPart);
    }
    return finalPath.join(".");
};
exports.furthest = furthest;
/**
 * Traverses the object by the given path and returns an object where
 * each key is a path pointing to a leaf node and contains the value
 * from the leaf node from the overall object in the obj argument,
 * essentially providing all available paths in an object and all the
 * values for each path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {ObjectType} The result of the traversal.
 */
const values = (obj, path, options = {}) => {
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    const pathParts = (0, exports.split)((0, exports.clean)(path));
    const currentPath = [];
    const valueData = {};
    for (let i = 0; i < pathParts.length; i++) {
        currentPath.push(transformKey(pathParts[i]));
        const tmpPath = currentPath.join(".");
        _setOwn(valueData, tmpPath, (0, exports.get)(obj, tmpPath));
    }
    return valueData;
};
exports.values = values;
/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings. Keys are escaped so each path can be passed to
 * get() or set().
 * @param obj The object to scan.
 * @param finalArr An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param [options] An options object.
 * @param [objCache] Internal, do not use.
 * @returns An array containing path strings.
 */
const flatten = (obj, finalArr = [], parentPath = "", options = {}, objCache = []) => {
    const transformRead = options.transformRead || exports.returnWhatWasGiven;
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    const transformedObj = transformRead(obj);
    // Check that this object isn't one of its own ancestors (avoid infinite recursion)
    if (objCache.indexOf(transformedObj) > -1) {
        return finalArr;
    }
    const ancestors = [...objCache, transformedObj];
    for (const i in transformedObj) {
        if (!_hasOwn(transformedObj, i))
            continue;
        if (options.ignore && options.ignore.test(i)) {
            continue;
        }
        const pathToChild = (0, exports.join)(parentPath, (0, exports.escape)(String(transformKey(i))));
        const childObj = transformedObj[i];
        finalArr.push(pathToChild);
        if (_isObjectLike(childObj)) {
            (0, exports.flatten)(childObj, finalArr, pathToChild, options, ancestors);
        }
    }
    return finalArr;
};
exports.flatten = flatten;
/**
 * Takes an object and finds all paths, then returns the paths as keys
 * and the values of each path as the values. Keys are escaped so each
 * path can be passed to get() or set().
 * @param {ObjectType} obj The object to scan.
 * @param {Object=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly).
 * @param {string=} parentPath The path of the parent object. (Do not
 * pass this in directly).
 * @param {OptionsType} [options] An options object.
 * @param {any[]} [objCache] Internal, do not use.
 * @returns {ObjectType} An object containing path keys and their values.
 */
const flattenValues = (obj, finalObj = {}, parentPath = "", options = {}, objCache = []) => {
    const transformRead = options.transformRead || exports.returnWhatWasGiven;
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    const transformWrite = options.transformWrite || exports.returnWhatWasGiven;
    const transformedObj = transformRead(obj);
    // Check that this object isn't one of its own ancestors (avoid infinite recursion)
    if (objCache.indexOf(transformedObj) > -1) {
        return finalObj;
    }
    const ancestors = [...objCache, transformedObj];
    const currentPath = (i, info) => {
        const tKey = (0, exports.escape)(String(transformKey(i, info)));
        return parentPath ? parentPath + "." + tKey : tKey;
    };
    for (const i in transformedObj) {
        if (!_hasOwn(transformedObj, i))
            continue;
        const value = transformedObj[i];
        const type = typeof value;
        const info = {
            type,
            isArrayIndex: Array.isArray(transformedObj),
            isFlat: type !== "object" || value === null || value instanceof Date || value instanceof RegExp
        };
        const pathKey = currentPath(i, info);
        if (!info.isFlat) {
            (0, exports.flattenValues)(value, finalObj, pathKey, options, ancestors);
        }
        else if (options.leavesOnly) {
            // Found leaf node!
            _setOwn(finalObj, pathKey, transformWrite(value));
        }
        if (!options.leavesOnly) {
            _setOwn(finalObj, pathKey, transformWrite(value));
        }
    }
    return finalObj;
};
exports.flattenValues = flattenValues;
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param  args args Path to join.
 * @returns  A final path string.
 */
const join = (...args) => {
    return args.reduce((arr, item) => {
        if (item !== undefined && String(item)) {
            // @ts-ignore
            arr.push(item);
        }
        return arr;
    }, []).join(".");
};
exports.join = join;
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {...string} args Path to join.
 * @returns {string} A final path string.
 */
const joinEscaped = (...args) => {
    const escapedArgs = args.map((item) => {
        return (0, exports.escape)(item);
    });
    return (0, exports.join)(...escapedArgs);
};
exports.joinEscaped = joinEscaped;
/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {ObjectType} obj The object to count key leaf nodes for.
 * @param {Array=} objCache Do not use. Internal array to track
 * visited leafs.
 * @returns {number} The number of keys.
 */
const countLeafNodes = (obj, objCache = []) => {
    let totalKeys = 0;
    // Track ancestors so cyclic references are counted as leaf nodes
    // rather than recursed into forever
    const ancestors = [...objCache, obj];
    for (const i in obj) {
        if (!_hasOwn(obj, i) || obj[i] === undefined)
            continue;
        if (!_isObjectLike(obj[i]) || ancestors.indexOf(obj[i]) > -1) {
            totalKeys++;
        }
        else {
            totalKeys += (0, exports.countLeafNodes)(obj[i], ancestors);
        }
    }
    return totalKeys;
};
exports.countLeafNodes = countLeafNodes;
/**
 * Finds all the leaf nodes for a given object and returns an array of paths
 * to them. This is different from `flatten()` in that it only includes leaf
 * nodes and will not include every intermediary path traversed to get to a
 * leaf node. Keys are escaped so each path can be passed to get() or set().
 * @param {ObjectType} obj The object to traverse.
 * @param {string} [parentPath=""] The path to use as a root/base path to
 * start scanning for leaf nodes under.
 * @param {any[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {[]}
 */
const leafNodes = (obj, parentPath = "", objCache = []) => {
    const paths = [];
    // Track ancestors so cyclic references are treated as leaf nodes
    // rather than recursed into forever
    const ancestors = [...objCache, obj];
    for (const i in obj) {
        if (!_hasOwn(obj, i) || obj[i] === undefined)
            continue;
        const currentPath = (0, exports.join)(parentPath, (0, exports.escape)(i));
        if (!_isObjectLike(obj[i]) || ancestors.indexOf(obj[i]) > -1) {
            paths.push(currentPath);
        }
        else {
            paths.push(...(0, exports.leafNodes)(obj[i], currentPath, ancestors));
        }
    }
    return paths;
};
exports.leafNodes = leafNodes;
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths. Only own properties are considered.
 * MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {boolean} True if the object paths exist.
 */
const hasMatchingPathsInObject = (testKeys, testObj) => {
    for (const i in testKeys) {
        if (!_hasOwn(testKeys, i))
            continue;
        if (!_isObjectLike(testObj) || !_hasOwn(testObj, i) || testObj[i] === undefined) {
            return false;
        }
        // Recurse object
        if (_isObjectLike(testKeys[i]) && !(0, exports.hasMatchingPathsInObject)(testKeys[i], testObj[i])) {
            return false;
        }
    }
    return true;
};
exports.hasMatchingPathsInObject = hasMatchingPathsInObject;
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * Only own properties are considered.
 * MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {{matchedKeys: ObjectType, matchedKeyCount: number, totalKeyCount: number}} Stats on the matched keys.
 */
const countMatchingPathsInObject = (testKeys, testObj) => {
    const matchedKeys = {};
    let matchData, matchedKeyCount = 0, totalKeyCount = 0;
    for (const i in testObj) {
        if (!_hasOwn(testObj, i))
            continue;
        const testKey = _isObjectLike(testKeys) && _hasOwn(testKeys, i) ? testKeys[i] : undefined;
        if (_isObjectLike(testObj[i])) {
            // The test / query object key is an object, recurse
            matchData = (0, exports.countMatchingPathsInObject)(testKey, testObj[i]);
            _setOwn(matchedKeys, i, matchData.matchedKeys);
            totalKeyCount += matchData.totalKeyCount;
            matchedKeyCount += matchData.matchedKeyCount;
        }
        else {
            // The test / query object has a property that is not an object so add it as a key
            totalKeyCount++;
            // Check if the test keys also have this key and it is also not an object
            if (testKey && !_isObjectLike(testKey)) {
                _setOwn(matchedKeys, i, true);
                matchedKeyCount++;
            }
            else {
                _setOwn(matchedKeys, i, false);
            }
        }
    }
    return {
        matchedKeys,
        matchedKeyCount,
        totalKeyCount
    };
};
exports.countMatchingPathsInObject = countMatchingPathsInObject;
/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param item The item to get the type of.
 * @returns The string name of the type.
 */
const type = (item) => {
    if (item === null) {
        return "null";
    }
    if (Array.isArray(item)) {
        return "array";
    }
    return typeof item;
};
exports.type = type;
/**
 * Determines if the query data exists anywhere inside the source
 * data. Will recurse into arrays and objects to find query.
 * @param {*} source The source data to check.
 * @param {*} query The query data to find.
 * @param {OptionsType} [options] An options object.
 * @returns {boolean} True if query was matched, false if not.
 */
const match = (source, query, options = {}) => {
    const sourceType = typeof source;
    const queryType = typeof query;
    if (sourceType !== queryType) {
        return false;
    }
    if (sourceType !== "object" || source === null || query === null) {
        // Simple test
        return source === query;
    }
    // The source is an object-like (array or object) structure
    const entries = Object.entries(query);
    const foundNonMatch = entries.find(([key, val]) => {
        // Recurse if type is array or object
        if (typeof val === "object" && val !== null) {
            return !(0, exports.match)(source[key], val);
        }
        return source[key] !== val;
    });
    return !foundNonMatch;
};
exports.match = match;
/**
 * Finds all items in `source` that match the structure of `query` and
 * returns the path to them as an array of strings. Keys are escaped so
 * each path can be passed to get() or set().
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {string=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @param {any[]} [objCache=[]] Do not use. Internal usage to check for
 * cyclic structures.
 * @returns {Object} Contains match<Boolean> and path<Array>.
 */
const findPath = (source, query, options = {
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
}, parentPath = "", objCache = []) => {
    const resultArr = [];
    options = Object.assign({ maxDepth: Infinity, currentDepth: 0, includeRoot: true }, options);
    if (options.currentDepth !== 0 || (options.currentDepth === 0 && options.includeRoot)) {
        if ((0, exports.match)(source, query)) {
            resultArr.push(parentPath);
        }
    }
    // @ts-ignore
    options.currentDepth++;
    // Don't recurse into an object that is one of its own ancestors (avoid infinite recursion)
    // @ts-ignore
    if (options.currentDepth <= options.maxDepth && _isObjectLike(source) && objCache.indexOf(source) === -1) {
        const ancestors = [...objCache, source];
        for (let key in source) {
            if (_hasOwn(source, key)) {
                const val = source[key];
                // Recurse down object to find more instances
                const result = (0, exports.findPath)(val, query, options, (0, exports.join)(parentPath, (0, exports.escape)(key)), ancestors);
                if (result.match) {
                    resultArr.push(...result.path);
                }
            }
        }
    }
    return { match: resultArr.length > 0, path: resultArr };
};
exports.findPath = findPath;
/**
 * Finds the first item that matches the structure of `query`
 * and returns the path to it. Keys are escaped so the path can be
 * passed to get() or set().
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {string=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @param {any[]} [objCache=[]] Do not use. Internal usage to check for
 * cyclic structures.
 * @returns {Object} Contains match<boolean> and path<string>.
 */
const findOnePath = (source, query, options = {
    maxDepth: Infinity,
    currentDepth: 0,
    includeRoot: true
}, parentPath = "", objCache = []) => {
    options = Object.assign({ maxDepth: Infinity, currentDepth: 0, includeRoot: true }, options);
    if (options.currentDepth !== 0 || (options.currentDepth === 0 && options.includeRoot)) {
        if ((0, exports.match)(source, query)) {
            return {
                match: true,
                path: parentPath
            };
        }
    }
    // @ts-ignore
    options.currentDepth++;
    // Don't recurse into an object that is one of its own ancestors (avoid infinite recursion)
    // @ts-ignore
    if (options.currentDepth <= options.maxDepth && _isObjectLike(source) && objCache.indexOf(source) === -1) {
        const ancestors = [...objCache, source];
        for (let key in source) {
            if (_hasOwn(source, key)) {
                const val = source[key];
                // Recurse down object to find more instances
                const subPath = (0, exports.join)(parentPath, (0, exports.escape)(key));
                const result = (0, exports.findOnePath)(val, query, options, subPath, ancestors);
                if (result.match) {
                    return result;
                }
            }
        }
    }
    return { match: false };
};
exports.findOnePath = findOnePath;
/**
 * Returns a deduplicated array of strings.
 * @param {string[]} keys An array of strings to deduplicate.
 * @returns {string[]} The deduplicated array.
 */
const keyDedup = (keys) => {
    return Array.from(new Set(keys));
};
exports.keyDedup = keyDedup;
/**
 * Determines the kind of difference between two values, if any.
 * @param {*} val1 The first value.
 * @param {*} val2 The second value.
 * @param {ValueType} type1 The type of the first value.
 * @param {ValueType} type2 The type of the second value.
 * @param {boolean} strict If true, uses strict equality. The values must
 * not be the same value when strict is true.
 * @returns {DifferenceType|undefined} The kind of difference or
 * undefined if the values are equal.
 * @private
 */
const _difference = (val1, val2, type1, type2, strict) => {
    if (!strict) {
        return val1 != val2 ? "value" : undefined;
    }
    if (type1 !== type2) {
        return val1 != val2 ? "both" : "type";
    }
    // diffValues() never compares a value with itself, so in strict mode
    // values of the same type are always different here
    return "value";
};
/**
 * Compares two provided objects / arrays and returns and object
 * where the keys are dot-notation paths and the values are any
 * differences.
 *
 * e.g.
 * {
 *    "path.to.new.value": {
 *        "val1": "the value from obj1",
 *        "val2": "the value from obj2",
 *        "type1": "string", // the value type from obj1 (see ValueType for supported values)
 *        "type2": "string", // the value type from obj2 (see ValueType for supported values)
 *        "difference": "value" // (see DifferenceType for supported values)
 *    }
 * }
 *
 * If a field changes between an object / array and another type, the
 * field itself is reported as well as any leaf paths inside it. The
 * same paths are reported whichever object is passed first. Keys in
 * the returned paths are escaped so each path can be passed to get().
 *
 * If you only want an array of paths to values that have changed
 * see the `diff()` function instead.
 * @param {ObjectType} obj1 The first object / array to compare.
 * @param {ObjectType} obj2 The second object / array to compare.
 * @param {DiffOptionsType} [options] Options object
 * @param {string|string[]} options.basePath="" The base path from which to check for
 * differences. Differences outside the base path will not be
 * returned as part of the array of differences. Leave blank to check
 * for all differences between the two objects to compare.
 * @param {boolean} options.strict=false If strict is true, diff uses strict
 * equality to determine difference rather than non-strict equality;
 * effectively (=== is strict, == is non-strict).
 * @param {number} options.maxDepth=Infinity Specifies the maximum number of
 * path subtrees to walk down before returning what we have found.
 * For instance, if set to 2, a diff would only check down,
 * "someFieldName.anotherField", or "user.name" and would not go
 * further down than two fields. If anything in the trees further
 * down than this level have changed, the change will not be detected
 * and the path will not be included in the resulting diff array.
 * @param {boolean} options.exclusive=false If true, only examines obj2's
 * data against obj1 rather than diffing against each other. Especially
 * useful if obj2 is a partial of obj1, and you only need to know what
 * parts of the partial have changed against obj1.
 * @param {string} parentPath="" Used internally only.
 * @param {any[]} objCache=[] Used internally only.
 * @returns {Record<string, DiffValue>} An object where each key is a path to a
 * field that holds a different value between the two objects being
 * compared and the value of each key is an object holding details of
 * the difference.
 */
const diffValues = (obj1, obj2, options = {}, parentPath = "", objCache = []) => {
    // Default the various options values without modifying the caller's object
    const basePath = options.basePath || "";
    const strict = options.strict === true;
    const maxDepth = options.maxDepth === undefined ? Infinity : options.maxDepth;
    const exclusive = options.exclusive === true;
    const paths = {};
    if (basePath instanceof Array) {
        // We were given an array of paths, check each path
        basePath.forEach((individualPath) => {
            _assignOwn(paths, (0, exports.diffValues)(obj1, obj2, { basePath: individualPath, strict, maxDepth, exclusive }, parentPath, objCache));
        });
        return paths;
    }
    const currentPath = (0, exports.join)(parentPath, basePath);
    const val1 = (0, exports.get)(obj1, basePath);
    const val2 = (0, exports.get)(obj2, basePath);
    // The same value or reference can't contain any differences
    if (val1 === val2) {
        return paths;
    }
    const type1 = (0, exports.type)(val1);
    const type2 = (0, exports.type)(val2);
    if (type1 !== type2) {
        // Difference in source and comparison types
        const difference = _difference(val1, val2, type1, type2, strict);
        if (difference) {
            _setOwn(paths, currentPath, { val1, val2, type1, type2, difference });
        }
    }
    else if (type1 === "array" && val1.length !== val2.length) {
        // Difference in source and comparison content
        _setOwn(paths, currentPath, { val1, val2, type1, type2, difference: "value" });
    }
    const pathParts = (0, exports.split)(currentPath);
    const hasParts = pathParts[0] !== "";
    if ((!hasParts || pathParts.length < maxDepth) && (_isObjectLike(val1) || _isObjectLike(val2))) {
        // Check that neither object is one of its own ancestors (avoid infinite recursion)
        if (objCache.indexOf(val1) > -1 || objCache.indexOf(val2) > -1) {
            return paths;
        }
        const ancestors = objCache.concat([val1, val2].filter(_isObjectLike));
        // Grab keys from val1 and val2
        const val1Keys = _isObjectLike(val1) ? Object.keys(val1) : [];
        const val2Keys = _isObjectLike(val2) ? Object.keys(val2) : [];
        // In exclusive mode use only the keys from val2, otherwise combine val1 keys
        // and val2 keys so we diff both objects against each other
        const compositeKeys = exclusive ? val2Keys : (0, exports.keyDedup)(val1Keys.concat(val2Keys));
        compositeKeys.forEach((key) => {
            _assignOwn(paths, (0, exports.diffValues)(val1, val2, { basePath: (0, exports.escape)(key), strict, maxDepth, exclusive }, currentPath, ancestors));
        });
        return paths;
    }
    const difference = _difference(val1, val2, type1, type2, strict);
    if (difference) {
        _setOwn(paths, currentPath, { val1, val2, type1, type2, difference });
    }
    return paths;
};
exports.diffValues = diffValues;
/**
 * Compares two provided objects / arrays and returns an array of
 * dot-notation paths to the fields that hold different values.
 * @param {ObjectType} obj1 The first object / array to compare.
 * @param {ObjectType} obj2 The second object / array to compare.
 * @param {DiffOptionsType} [options] Options object
 * @param {string|string[]} options.basePath="" The base path from which to check for
 * differences. Differences outside the base path will not be
 * returned as part of the array of differences. Leave blank to check
 * for all differences between the two objects to compare.
 * @param {boolean} options.strict=false If strict is true, diff uses strict
 * equality to determine difference rather than non-strict equality;
 * effectively (=== is strict, == is non-strict).
 * @param {number} options.maxDepth=Infinity Specifies the maximum number of
 * path subtrees to walk down before returning what we have found.
 * For instance, if set to 2, a diff would only check down,
 * "someFieldName.anotherField", or "user.name" and would not go
 * further down than two fields. If anything in the trees further
 * down than this level have changed, the change will not be detected
 * and the path will not be included in the resulting diff array.
 * @param {boolean} options.exclusive=false If true, only examines obj2's
 * data against obj1 rather than diffing against each other. Especially
 * useful if obj2 is a partial of obj1, and you only need to know what
 * parts of the partial have changed against obj1.
 * @param {string} parentPath="" Used internally only.
 * @param {any[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {Array} An array of strings, each string is a path to a
 * field that holds a different value between the two objects being
 * compared.
 */
const diff = (obj1, obj2, options = {}, parentPath = "", objCache = []) => {
    return Object.keys((0, exports.diffValues)(obj1, obj2, options, parentPath, objCache));
};
exports.diff = diff;
/**
 * Compares two values with strict or non-strict equality.
 * @private
 */
const _isValueEqual = (val1, val2, strict) => {
    return strict ? val1 === val2 : val1 == val2;
};
/**
 * Compares two values structurally, recursing into objects and arrays.
 * @param {*} val1 The first value.
 * @param {*} val2 The second value.
 * @param {boolean} strict If true, leaf values must be strict-equal.
 * @param {any[]} ancestors The objects currently being compared further
 * up the tree, used to detect cycles.
 * @returns {boolean} True if the values are deeply equal.
 * @private
 */
const _isDeepEqual = (val1, val2, strict, ancestors) => {
    if (!_isObjectLike(val1) || !_isObjectLike(val2)) {
        // An object can never be deeply equal to a primitive
        return _isObjectLike(val1) === _isObjectLike(val2) && _isValueEqual(val1, val2, strict);
    }
    if (val1 === val2) {
        return true;
    }
    // Arrays, plain objects, Dates etc. are never equal to each other
    if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
        return false;
    }
    if (val1 instanceof Date) {
        return val1.getTime() === val2.getTime();
    }
    if (val1 instanceof RegExp) {
        return String(val1) === String(val2);
    }
    // These objects are already being compared further up the tree, the
    // rest of that comparison decides if they are equal
    if (ancestors.indexOf(val1) > -1 || ancestors.indexOf(val2) > -1) {
        return true;
    }
    const nextAncestors = [...ancestors, val1, val2];
    return (0, exports.keyDedup)(Object.keys(val1).concat(Object.keys(val2))).every((key) => {
        return _isDeepEqual(val1[key], val2[key], strict, nextAncestors);
    });
};
/**
 * A boolean check to see if the values at the given path or paths
 * are the same in both given objects.
 * @param {*} obj1 The first object to check values in.
 * @param {*} obj2 The second object to check values in.
 * @param {Array<string>|string}path A path or array of paths to check
 * values in. If this is an array, all values at the paths in the array
 * must be the same for the function to provide a true result.
 * @param {boolean} deep If true will traverse all objects and arrays
 * to check for equality, keys from both objects are compared. Defaults
 * to false.
 * @param {boolean} strict If true, values must be strict-equal.
 * Defaults to false.
 * @returns {boolean} True if path values match, false if not.
 */
const isEqual = (obj1, obj2, path, deep = false, strict = false) => {
    if (path instanceof Array) {
        // We were given an array of paths, check each path
        return path.findIndex((individualPath) => {
            // Here we find any path that has a *non-equal* result which
            // returns true and then returns the index as a positive integer
            // that is not -1. If -1 is returned then no non-equal matches
            // were found
            return (0, exports.isNotEqual)(obj1, obj2, individualPath, deep, strict);
        }) === -1;
    }
    const val1 = (0, exports.get)(obj1, path);
    const val2 = (0, exports.get)(obj2, path);
    if (deep) {
        return _isDeepEqual(val1, val2, strict, []);
    }
    return _isValueEqual(val1, val2, strict);
};
exports.isEqual = isEqual;
/**
 * A boolean check to see if the values at the given path or paths
 * are different in both given objects.
 * @param {*} obj1 The first object to check values in.
 * @param {*} obj2 The second object to check values in.
 * @param {Array<string>|string}path A path or array of paths to
 * check values in. If this is an array, all values at the paths
 * in the array must be different for the function to provide a
 * true result.
 * @param {boolean} deep If true will traverse all objects and arrays
 * to check for inequality. Defaults to false.
 * @param {boolean} strict If true, values must be strict-not-equal.
 * Defaults to false.
 * @returns {boolean} True if path values differ, false if not.
 */
const isNotEqual = (obj1, obj2, path, deep = false, strict = false) => {
    return !(0, exports.isEqual)(obj1, obj2, path, deep, strict);
};
exports.isNotEqual = isNotEqual;
/**
 * Same as set() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
const setImmutable = (obj, path, val, options = {}) => {
    return (0, exports.set)(obj, path, val, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.setImmutable = setImmutable;
/**
 * Same as pushVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
const pushValImmutable = (obj, path, val, options = {}) => {
    return (0, exports.pushVal)(obj, path, val, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.pushValImmutable = pushValImmutable;
/**
 * Same as pullVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
const pullValImmutable = (obj, path, val, options = {}) => {
    return (0, exports.pullVal)(obj, path, val, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.pullValImmutable = pullValImmutable;
/**
 * Same as unSet() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
const unSetImmutable = (obj, path, options = {}) => {
    return (0, exports.unSet)(obj, path, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.unSetImmutable = unSetImmutable;
/**
 * Gets the values of the paths in pathArr and returns them as an object
 * with each key matching the path and the value matching the value from
 * obj that was at that path.
 * @param {Object} obj The object to operate on.
 * @param {Array<string>} pathArr Array of path strings.
 * @returns {*} The new object.
 */
const distill = (obj, pathArr) => {
    return pathArr.reduce((newObj, path) => {
        _setOwn(newObj, path, (0, exports.get)(obj, path));
        return newObj;
    }, {});
};
exports.distill = distill;
/**
 * Chops a `path` string down to the given `level`. Given a `path` string
 * like "foo.bar.ram.you.too", chop will remove any path parts below
 * the given `level`. If we pass 2 as the `level` with that given `path`,
 * the result will be "foo.bar" as foo is level 1 and bar is level 2.
 * If the `path` is shorter than the given `level`, it is returned intact.
 * @param {string} path The path to operate on.
 * @param {number} level The maximum level of a path.
 * @returns {string} The new path string.
 */
const chop = (path, level) => {
    const parts = (0, exports.split)(path);
    if (parts.length > level) {
        parts.length = level;
    }
    return (0, exports.join)(...parts);
};
exports.chop = chop;
/**
 * Merges two objects like a "deep spread". If both obj1 and obj2 contain a leaf node
 * the value from obj2 will be used. Plain objects and arrays are merged recursively,
 * any other value (including Dates and class instances) from obj2 replaces the value
 * in obj1. "__proto__" keys in obj2 are ignored.
 * @param obj1
 * @param obj2
 * @param options
 */
const merge = (obj1, obj2, options = {}) => {
    const newObj = (0, exports.decouple)(obj1, options);
    if (!_isObjectLike(obj2)) {
        return newObj;
    }
    Object.entries(obj2).forEach(([key, val]) => {
        // Do not allow prototype pollution
        if (_isUnsafeKey(key))
            return;
        if (options.ignoreUndefined && val === undefined)
            return;
        // Only merge into an own value, an inherited one (e.g. "constructor")
        // must never be traversed
        const existing = _hasOwn(newObj, key) ? newObj[key] : undefined;
        if (Array.isArray(val)) {
            newObj[key] = (0, exports.merge)(Array.isArray(existing) ? existing : [], val, options);
        }
        else if (_isPlainObject(val)) {
            newObj[key] = (0, exports.merge)(_isPlainObject(existing) ? existing : {}, val, options);
        }
        else {
            // Non-recursive type
            newObj[key] = val;
        }
    });
    return newObj;
};
exports.merge = merge;
const mergeImmutable = (obj1, obj2, options = {}) => {
    return (0, exports.merge)(obj1, obj2, Object.assign(Object.assign({}, options), { immutable: true }));
};
exports.mergeImmutable = mergeImmutable;
const $in = (value, criteria) => {
    if (typeof criteria === "function") {
        // The criteria is a function, use the result boolean
        return criteria(value);
    }
    // The criteria is an array of values, scan them
    // if we find any value that matches the one we are looking for,
    // we immediately return true
    for (let criteriaIndex = 0; criteriaIndex < criteria.length; criteriaIndex++) {
        const criteriaValue = criteria[criteriaIndex];
        if (typeof criteriaValue === "function" && criteriaValue(value)) {
            // The criteria is a function, use the result boolean
            return true;
        }
        if (value === criteriaValue) {
            return true;
        }
    }
    return false;
};
/**
 * Retrieves paths to parts of the object that satisfy the given query criteria.
 *
 * @param {ObjectType} obj - The object to query.
 * @param {QueryType} query - The query criteria.
 * @return {Record<string, string[]>} - The query result, represented as a record where each property
 * contains an array of values that satisfy the corresponding query criterion.
 */
const query = (obj, query) => {
    const queryResult = {};
    for (const queryKey in query) {
        if (!_hasOwn(query, queryKey))
            continue;
        const matchingPaths = [];
        _setOwn(queryResult, queryKey, matchingPaths);
        const queryOperations = query[queryKey];
        Object.entries(queryOperations).forEach(([operationKey, operationCriteria]) => {
            if (operationKey === "$in") {
                (0, exports.traverse)(obj, queryKey, ({ purePath, flatPath, value }) => {
                    if (flatPath !== queryKey)
                        return true;
                    if (!$in(value, operationCriteria))
                        return true;
                    matchingPaths.push(purePath);
                    return true;
                });
            }
        });
    }
    return queryResult;
};
exports.query = query;
/**
 * Reads the key from the value, or returns undefined if the value can't
 * have properties.
 * @private
 */
const _readKey = (value, key) => {
    return value === undefined || value === null ? undefined : value[key];
};
/**
 * Calls `operation` on every part of `path`. Keys in the reported paths
 * are escaped so each path can be passed to get() or set().
 * @param obj The object to operate on with the path.
 * @param path The path to iterate.
 * @param operation The function to call for each part of the path.
 * @param options Supports `transformRead` and `transformKey`.
 * @param parentPaths Do not pass, used internally.
 */
const traverse = (obj, path, operation, options = {}, parentPaths = { pure: "", flat: "" }) => {
    if (path instanceof Array) {
        return path.forEach((individualPath) => {
            (0, exports.traverse)(obj, individualPath, operation, options);
        });
    }
    const transformRead = options.transformRead || exports.returnWhatWasGiven;
    const transformKey = options.transformKey || exports.returnWhatWasGiven;
    const transformedObj = transformRead(obj);
    // No path string, return the base obj
    if (!path) {
        return;
    }
    _assertPathIsString(path);
    const internalPath = (0, exports.clean)(path);
    const pathParts = (0, exports.split)(internalPath);
    const purePath = (key) => {
        return (0, exports.join)(parentPaths.pure, (0, exports.escape)(key));
    };
    const flatPath = (key) => {
        return (0, exports.join)(parentPaths.flat, (0, exports.escape)(key));
    };
    // Path has no dot-notation, return key/value
    if (pathParts.length === 1) {
        const transformedKey = transformKey((0, exports.unEscape)(internalPath), transformedObj);
        operation({
            purePath: purePath(transformedKey),
            flatPath: flatPath(transformedKey),
            key: transformedKey,
            value: _readKey(transformedObj, transformedKey)
        });
        return;
    }
    let objPart = transformedObj;
    for (let i = 0; i < pathParts.length; i++) {
        const pathPart = pathParts[i];
        const transformedKey = transformKey((0, exports.unEscape)(pathPart), objPart);
        const purePathToChild = purePath(transformedKey);
        const flatPathToChild = flatPath(transformedKey);
        objPart = _readKey(objPart, transformedKey);
        operation({ purePath: purePathToChild, flatPath: flatPathToChild, key: transformedKey, value: objPart });
        if ((0, exports.type)(objPart) === "array") {
            for (let arrIndex = 0; arrIndex < objPart.length; arrIndex++) {
                const key = arrIndex.toString();
                operation({
                    purePath: (0, exports.join)(purePathToChild, key),
                    flatPath: flatPathToChild,
                    key,
                    value: objPart[arrIndex]
                });
                (0, exports.traverse)(objPart[arrIndex], (0, exports.down)(internalPath, i + 1), operation, options, {
                    pure: (0, exports.join)(purePathToChild, key),
                    flat: flatPathToChild
                });
            }
            return;
        }
        // The rest of the path can't exist inside a missing or primitive value
        if (!_isObjectLike(objPart)) {
            return;
        }
        parentPaths.pure = purePathToChild;
        parentPaths.flat = flatPathToChild;
    }
};
exports.traverse = traverse;
