type ObjectType = {[key: string]: any};
type ArrayType = Map<string, any[]>;

export interface OptionsType {
	transformRead?: (...rest: any) => any
	transformKey?: (...rest: any) => any
	transformWrite?: (...rest: any) => any
	leavesOnly?: boolean
}

export interface GetOptionsType extends OptionsType {
	wildcardExpansion?: boolean
	arrayTraversal?: boolean
	arrayExpansion?: boolean
	expandedResult?: any[]
}

export interface SetOptionsType extends GetOptionsType {
	immutable?: boolean
	strict?: boolean
	ignore?: RegExp
}

export interface FindOptionsType extends OptionsType {
	maxDepth?: number
	currentDepth?: number
	includeRoot?: boolean
}

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
 * Scans an object for all keys that are either objects or arrays
 * and returns an array of those keys only.
 * @param {ObjectType} obj The object to scan.
 * @returns {string[]} An array of string keys.
 * @private
 */
const _iterableKeys = (obj: object | Array<any>): string[] => {
	return Object.entries(obj).reduce((arr: string[], [key, val]) => {
		const valType = type(val);
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
 * @param {ObjectType} item The item to mimic.
 * @param {String} key The key to set data in.
 * @param {*} val The data to set in the key.
 * @returns {*} A new dereferenced version of "item" with the "key"
 * containing the "val" data.
 * @private
 */
const _newInstance = (item: ObjectType, key?: string, val?: any): any => {
	const objType = type(item);

	let newObj;

	if (objType === "object") {
		newObj = {
			...item
		};
	}

	if (objType === "array") {
		// @ts-ignore
		newObj = [...item];
	}

	if (key !== undefined) {
		// @ts-ignore
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
export const isCompositePath = (path: string) => {
	const regExp = /\./g;
	let result;

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
export const isNonCompositePath = (path: string) => {
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
export const up = (path: string, levels = 1) => {
	const parts = split(path);

	for (let i = 0; i < levels; i++) {
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
export const down = (path: string, levels = 1) => {
	const parts = split(path);

	for (let i = 0; i < levels; i++) {
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
export const pop = (path: string, levels = 1) => {
	const parts = split(path);
	let part;

	for (let i = 0; i < levels; i++) {
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
export const push = (path: string, val = "") => {
	return `${path}.${val}`;
};

/**
 * Returns the first leaf from the path. E.g.
 * "foo.bar.thing" returns "foo".
 * @param {String} path The path to operate on.
 * @param {Number=} levels The number of levels to
 * shift.
 * @returns {String} The new path string.
 */
export const shift = (path: string, levels = 1) => {
	const parts = split(path);
	let part;

	for (let i = 0; i < levels; i++) {
		part = parts.shift();
	}

	return part || "";
};

/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {*} The passed argument.
 */
export const returnWhatWasGiven = (val: any, currentObj: any): any => val;

/**
 * Converts any key matching the wildcard to a zero.
 * @param {String} key The key to test.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {String} The key.
 */
export const wildcardToZero = (key: string, currentObj: any): string => {
	return key === "$" ? "0" : key;
};

/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {String} key The key to test.
 * @returns {String} The original key or a wildcard.
 */
export const numberToWildcard = (key: string): string => {
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
export const clean = (str: string): any => {
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
export const split = (path: string): Array<string> => {
	// Convert all \. (escaped periods) to another character
	// temporarily
	const escapedPath = path.replace(/\\\./g, "[--]");
	const splitPath = escapedPath.split(".");

	// Loop the split path array and convert any escaped period
	// placeholders back to their real period characters
	for (let i = 0; i < splitPath.length; i++) {
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
export const escape = (str: string): string => {
	return str.replace(/\./g, "\\.");
};

/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value.
 * @param {String} str The string to unescape.
 * @returns {string} The unescaped string.
 */
export const unEscape = (str: string): string => {
	return str.replace(/\\./g, ".");
};

/**
 * Gets a single value from the passed object and given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */
export const get = (obj: ObjectType, path: string|any[], defaultVal: any | undefined = undefined, options: GetOptionsType = {}): any => {
	let internalPath = path,
		objPart;

	if (path instanceof Array) {
		return path.map((individualPath) => {
			get(obj, individualPath, defaultVal, options);
		});
	}

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	// No object data, return undefined
	if (obj === undefined || obj === null) {
		return defaultVal;
	}

	// No path string, return the base obj
	if (!internalPath) {
		return obj;
	}

	// @ts-ignore
	internalPath = clean(internalPath);

	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}

	// Path has no dot-notation, return key/value
	if (isNonCompositePath(internalPath)) {
		// @ts-ignore
		return obj[internalPath] !== undefined ? obj[internalPath] : defaultVal;
	}

	if (typeof obj !== "object") {
		return defaultVal !== undefined ? defaultVal : undefined;
	}

	const pathParts = split(internalPath);
	objPart = obj;

	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
		const transformedKey: string = options.transformKey(unEscape(pathPart), objPart);

		// @ts-ignore
		objPart = objPart[transformedKey];

		const isPartAnArray = objPart instanceof Array;

		if (isPartAnArray === true && options.wildcardExpansion === true) {
			const nextKey = options.transformKey(unEscape(pathParts[i + 1] || ""), objPart);

			if (nextKey === "$") {
				// Define an array to store our results in down the tree
				options.expandedResult = options.expandedResult || [];

				// The key is a wildcard and wildcardExpansion is enabled
				objPart.forEach((arrItem: ObjectType) => {
					const innerKey = pathParts.slice(i + 2).join(".");

					if (innerKey === "") {
						// @ts-ignore
						options.expandedResult.push(arrItem);
					} else {
						const innerResult = get(arrItem, innerKey, defaultVal, options);
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
				return getMany(objPart, pathParts.slice(i + 1).join("."), defaultVal, options);
			}

			// Loop the array items and return the first non-undefined
			// value from any array item leaf node that matches the path
			for (let objPartIndex = 0; objPartIndex < objPart.length; objPartIndex++) {
				const arrItem = objPart[objPartIndex];
				const innerResult = get(arrItem, pathParts.slice(i + 1).join("."), defaultVal, options);

				if (innerResult !== undefined) return innerResult;
			}

			return defaultVal;
		} else if ((!objPart || typeof objPart !== "object") && i !== pathParts.length - 1) {
			// The path terminated in the object before we reached
			// the end node we wanted so make sure we return undefined
			return defaultVal;
		}
	}

	return objPart !== undefined ? objPart : defaultVal;
};

/**
 * Gets multiple values from the passed arr and given path.
 * @param {ObjectType} data The array or object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object.
 * @returns {Array}
 */
export const getMany = (data: ObjectType, path: string, defaultVal: any | undefined = undefined, options: object | undefined = {}): any[] => {
	const isDataAnArray = data instanceof Array;

	if (!isDataAnArray) {
		const innerResult = get(data, path, defaultVal, options);
		const isInnerResultAnArray = innerResult instanceof Array;

		if (isInnerResultAnArray) return innerResult;
		if (innerResult === undefined && defaultVal === undefined) return [];
		if (innerResult === undefined && defaultVal !== undefined) return [defaultVal];

		return [innerResult];
	}

	const parts = split(path);
	const firstPart = parts[0];
	const pathRemainder = parts.slice(1).join(".");

	const resultArr = data.reduce((innerResult, arrItem) => {
		const isArrItemAnArray = arrItem[firstPart] instanceof Array;

		if (isArrItemAnArray) {
			const recurseResult = getMany(arrItem[firstPart], pathRemainder, defaultVal, options);

			innerResult.push(...recurseResult);
			return innerResult;
		}

		const val = get(arrItem, path, defaultVal, options);
		if (val !== undefined) innerResult.push(val);

		return innerResult;
	}, []);

	if (resultArr.length === 0 && defaultVal !== undefined) return [defaultVal];
	return resultArr;
};

/**
 * Sets a single value on the passed object and given path. This
 * will directly modify the "obj" object. If you need immutable
 * updates, use setImmutable() instead.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to set data on.
 * @param {*} val The value to assign to the obj at the path.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} Nothing.
 */
export const set = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): any => {
	let internalPath = path,
		objPart;

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	// No object data
	if (obj === undefined || obj === null) {
		return;
	}

	// No path string
	if (!internalPath) {
		return;
	}

	internalPath = clean(internalPath);

	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}

	if (typeof obj !== "object") {
		return;
	}

	// Path has no dot-notation, set key/value
	if (isNonCompositePath(internalPath)) {
		const unescapedPath = unEscape(internalPath);

		// Do not allow prototype pollution
		if (unescapedPath === "__proto__") {
			return obj;
		}

		obj = decouple(obj, options);
		// @ts-ignore
		obj[options.transformKey(unescapedPath)] = val;
		return obj;
	}

	const newObj = decouple(obj, options);
	const pathParts = split(internalPath);
	const pathPart = pathParts.shift();
	// @ts-ignore
	const transformedPathPart = options.transformKey(pathPart);

	// Do not allow prototype pollution
	if (transformedPathPart === "__proto__") {
		return obj;
	}

	let childPart = newObj[transformedPathPart];

	if (typeof childPart !== "object" || childPart === null) {
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
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to delete.
 * @param {SetOptionsType} [options] The options object.
 * @param {Object=} tracking Do not use.
 */
export const unSet = (obj: ObjectType, path: string, options: SetOptionsType = {}, tracking: {returnOriginal?: boolean} = {}) => {
	let internalPath = path;

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	// No object data
	if (obj === undefined || obj === null) {
		return;
	}

	// No path string
	if (!internalPath) {
		return;
	}

	internalPath = clean(internalPath);

	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}

	if (typeof obj !== "object") {
		return;
	}

	const newObj = decouple(obj, options);

	// Path has no dot-notation, set key/value
	if (isNonCompositePath(internalPath)) {
		const unescapedPath = unEscape(internalPath);

		// Do not allow prototype pollution
		if (unescapedPath === "__proto__") return obj;

		if (newObj.hasOwnProperty(unescapedPath)) {
			// @ts-ignore
			delete newObj[options.transformKey(unescapedPath)];
			return newObj;
		}

		tracking.returnOriginal = true;
		return obj;
	}

	const pathParts = split(internalPath);
	const pathPart = pathParts.shift();
	// @ts-ignore
	const transformedPathPart = options.transformKey(unEscape(pathPart));

	// Do not allow prototype pollution
	if (transformedPathPart === "__proto__") return obj;

	let childPart = newObj[transformedPathPart];

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
 * @param {ObjectType} obj The object to operate on.
 * @param {String} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The object with the modified data.
 */
export const update = (obj: ObjectType, basePath: string = "", updateData: ObjectType, options: SetOptionsType = {}): any => {
	let newObj = obj;

	for (let path in updateData) {
		if (updateData.hasOwnProperty(path)) {
			// @ts-ignore
			const data = updateData[path];
			newObj = set(newObj, join(basePath, path), data, options);
		}
	}

	return newObj;
};

/**
 * Same as update() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const updateImmutable = (obj: ObjectType, basePath: string = "", updateData: ObjectType, options: SetOptionsType): any => {
	return update(obj, basePath, updateData, {...options, immutable: true});
};

/**
 * If options.immutable === true then return a new de-referenced
 * instance of the passed object/array. If immutable is false
 * then simply return the same `obj` that was passed.
 * @param {*} obj The object or array to decouple.
 * @param {OptionsType} [options] The options object that has the immutable
 * key with a boolean value.
 * @returns {*} The new decoupled instance (if immutable is true)
 * or the original `obj` if immutable is false.
 */
export const decouple = (obj: any, options: SetOptionsType = {}): any => {
	if (!options.immutable) {
		return obj;
	}

	return _newInstance(obj);
};

/**
 * Push a value to an array on an object for the specified path.
 * @param {ObjectType} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */
export const pushVal = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): ObjectType => {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	}

	// Clean the path
	path = clean(path);

	const pathParts = split(path);
	const part = pathParts.shift();

	if (part === "__proto__") return obj;

	if (pathParts.length) {
		// Generate the path part in the object if it does not already exist
		// @ts-ignore
		obj[part] = decouple(obj[part], options) || {};

		// Recurse
		// @ts-ignore
		pushVal(obj[part], pathParts.join("."), val, options);
	} else if (part) {
		// We have found the target array, push the value
		// @ts-ignore
		obj[part] = decouple(obj[part], options) || [];

		// @ts-ignore
		if (!(obj[part] instanceof Array)) {
			throw("Cannot push to a path whose leaf node is not an array!");
		}

		// @ts-ignore
		obj[part].push(val);
	} else {
		// We have found the target array, push the value
		obj = decouple(obj, options) || [];

		if (!(obj instanceof Array)) {
			throw("Cannot push to a path whose leaf node is not an array!");
		}

		obj.push(val);
	}

	return decouple(obj, options);
};

/**
 * Pull a value to from an array at the specified path. Removes the first
 * matching value, not every matching value.
 * @param {ObjectType} obj The object to update.
 * @param {String} path The path to the array to pull from.
 * @param {*} val The value to pull from the array.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */
export const pullVal = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {strict: true}): ObjectType => {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	}

	// Clean the path
	path = clean(path);

	const pathParts = split(path);
	const part = pathParts.shift();

	if (part === "__proto__") return obj;

	if (pathParts.length && part !== undefined) {
		// Generate the path part in the object if it does not already exist
		obj[part] = decouple(obj[part], options) || {};

		// Recurse - we don't need to assign obj[part] the result of this call because
		// we are modifying by reference since we haven't reached the furthest path
		// part (leaf) node yet
		pullVal(obj[part], pathParts.join("."), val, options);
	} else if (part) {
		obj[part] = decouple(obj[part], options) || [];

		// Recurse - this is the leaf node so assign the response to obj[part] in
		// case it is set to an immutable response
		obj[part] = pullVal(obj[part], "", val, options);
	} else {
		// The target array is the root object, pull the value
		obj = decouple(obj, options) || [];

		if (!(obj instanceof Array)) {
			throw("Cannot pull from a path whose leaf node is not an array!");
		}

		let index = -1;

		// Find the index of the passed value
		if (options.strict === true) {
			index = obj.indexOf(val);
		} else {
			// Do a non-strict check
			index = obj.findIndex((item) => {
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
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {String} The path to the furthest non-undefined value.
 */
export const furthest = (obj: ObjectType, path: string, options: OptionsType = {}): string => {
	let internalPath = path,
		objPart;

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || wildcardToZero;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	const finalPath: string[] = [];

	// No path string, return the base obj
	if (!internalPath) {
		return finalPath.join(".");
	}

	internalPath = clean(internalPath);

	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}

	if (typeof obj !== "object" || obj === null) {
		return finalPath.join(".");
	}

	// Path has no dot-notation, return key/value
	if (isNonCompositePath(internalPath)) {
		if (obj[internalPath] !== undefined) {
			return internalPath;
		}

		return finalPath.join(".");
	}

	const pathParts = split(internalPath);
	objPart = obj;

	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
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
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {ObjectType} The result of the traversal.
 */
export const values = (obj: ObjectType, path: string, options: OptionsType = {}): ObjectType => {
	const internalPath = clean(path);
	const pathParts = split(internalPath);
	const currentPath = [];
	const valueData = {};

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = options.transformKey(pathParts[i]);
		currentPath.push(pathPart);

		const tmpPath = currentPath.join(".");

		valueData[tmpPath] = get(obj, tmpPath);
	}

	// @ts-ignore
	return valueData;
};

/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings.
 * @param {ObjectType} obj The object to scan.
 * @param {Array=} finalArr An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param {OptionsType} [options] An options object.
 * @param {any[]} [objCache] Internal, do not use.
 * @returns {Array<String>} An array containing path strings.
 */
export const flatten = (obj: ObjectType, finalArr: any[] | undefined = [], parentPath: string | undefined = "", options: SetOptionsType = {}, objCache = []): string[] => {
	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	const transformedObj = options.transformRead(obj);

	// Check that we haven't visited this object before (avoid infinite recursion)
	// @ts-ignore
	if (objCache.indexOf(transformedObj) > -1) {
		return finalArr;
	}

	// Add object to cache to make sure we don't traverse it twice
	// @ts-ignore
	objCache.push(transformedObj);

	const currentPath = (i: string|number|symbol) => {
		// @ts-ignore
		const tKey = options.transformKey(i);
		return parentPath ? parentPath + "." + tKey : tKey;
	};

	for (const i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			if (options.ignore && options.ignore.test(i)) {
				continue;
			}

			if (typeof transformedObj[i] === "object" && transformedObj[i] !== null) {
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
 * @param {ObjectType} obj The object to scan.
 * @param {Object=} finalObj An object used to collect the path keys.
 * (Do not pass this in directly).
 * @param {String=} parentPath The path of the parent object. (Do not
 * pass this in directly).
 * @param {OptionsType} [options] An options object.
 * @param {any[]} [objCache] Internal, do not use.
 * @returns {ObjectType} An object containing path keys and their values.
 */
export const flattenValues = (obj: ObjectType, finalObj: object | undefined = {}, parentPath: string | undefined = "", options: OptionsType = {}, objCache = []): ObjectType => {
	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	const transformedObj = options.transformRead(obj);

	// Check that we haven't visited this object before (avoid infinite recursion)
	// @ts-ignore
	if (objCache.indexOf(transformedObj) > -1) {
		// @ts-ignore
		return finalObj;
	}

	// Add object to cache to make sure we don't traverse it twice
	// @ts-ignore
	objCache.push(transformedObj);

	const currentPath = (i: string, info: any) => {
		// @ts-ignore
		const tKey = options.transformKey(i, info);
		return parentPath ? parentPath + "." + tKey : tKey;
	};

	for (const i in transformedObj) {
		if (transformedObj.hasOwnProperty(i)) {
			const type = typeof transformedObj[i];
			const info = {
				type,
				isArrayIndex: Array.isArray(transformedObj),
				isFlat: type !== "object" || transformedObj[i] instanceof Date || transformedObj[i] instanceof RegExp
			};

			const pathKey = currentPath(i, info);

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

	// @ts-ignore
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
export const join = (...args: string[]) => {
	return args.reduce((arr, item) => {
		if (item !== undefined && String(item)) {
			// @ts-ignore
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
export const joinEscaped = (...args: string[]) => {
	const escapedArgs = args.map((item) => {
		return escape(item);
	});

	return join(...escapedArgs);
};

/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {ObjectType} obj The object to count key leaf nodes for.
 * @param {Array=} objCache Do not use. Internal array to track
 * visited leafs.
 * @returns {Number} The number of keys.
 */
export const countLeafNodes = (obj: ObjectType, objCache: Array<any> | undefined = []): number => {
	let totalKeys = 0;

	// Add object to cache to make sure we don't traverse it twice
	objCache.push(obj);

	for (const i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (obj[i] !== undefined) {
				if (obj[i] === null || typeof obj[i] !== "object" || objCache.indexOf(obj[i]) > -1) {
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
 * @param {ObjectType} obj The object to traverse.
 * @param {String} [parentPath=""] The path to use as a root/base path to
 * start scanning for leaf nodes under.
 * @param {any[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {[]}
 */
export const leafNodes = (obj: ObjectType, parentPath: string = "", objCache: any[] = []): any[] => {
	const paths = [];

	// Add object to cache to make sure we don't traverse it twice
	objCache.push(obj);

	for (const i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (obj[i] !== undefined) {
				const currentPath = join(parentPath, i);

				if (obj[i] === null || typeof obj[i] !== "object" || objCache.indexOf(obj[i]) > -1) {
					paths.push(currentPath);
				} else {
					paths.push(...leafNodes(obj[i], currentPath, objCache));
				}
			}
		}
	}

	return paths;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths. MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */
export const hasMatchingPathsInObject = (testKeys: ObjectType, testObj: ObjectType): boolean => {
	let result = true;

	for (const i in testKeys) {
		if (testKeys.hasOwnProperty(i)) {
			if (testObj[i] === undefined) {
				return false;
			}

			if (typeof testKeys[i] === "object" && testKeys[i] !== null) {
				// Recurse object
				result = hasMatchingPathsInObject(testKeys[i], testObj[i]);

				// Should we exit early?
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
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {{matchedKeys: ObjectType, matchedKeyCount: number, totalKeyCount: number}} Stats on the matched keys.
 */
export const countMatchingPathsInObject = (testKeys: ObjectType, testObj: ObjectType): {matchedKeys: ObjectType, matchedKeyCount: number, totalKeyCount: number} => {
	const matchedKeys = {};

	let matchData,
		matchedKeyCount = 0,
		totalKeyCount = 0;

	for (const i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (typeof testObj[i] === "object" && testObj[i] !== null) {
				// The test / query object key is an object, recurse
				matchData = countMatchingPathsInObject(testKeys[i], testObj[i]);

				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++;

				// Check if the test keys also have this key and it is also not an object
				if (testKeys && testKeys[i] && (typeof testKeys[i] !== "object" || testKeys[i] === null)) {
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					matchedKeys[i] = false;
				}
			}
		}
	}

	return {
		matchedKeys,
		matchedKeyCount,
		totalKeyCount
	};
};

/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param {*} item The item to get the type of.
 * @returns {any}
 */
export const type = (item: any): any => {
	if (item === null) {
		return 'null';
	}
	if (Array.isArray(item)) {
		return 'array';
	}

	return typeof item;
};

/**
 * Determines if the query data exists anywhere inside the source
 * data. Will recurse into arrays and objects to find query.
 * @param {*} source The source data to check.
 * @param {*} query The query data to find.
 * @param {OptionsType} [options] An options object.
 * @returns {Boolean} True if query was matched, false if not.
 */
export const match = (source: any, query: any, options: OptionsType = {}): boolean => {
	const sourceType = typeof source;
	const queryType = typeof query;

	if (sourceType !== queryType) {
		return false;
	}

	if (sourceType !== "object" || source === null) {
		// Simple test
		return source === query;
	}

	// The source is an object-like (array or object) structure
	const entries = Object.entries(query);

	const foundNonMatch = entries.find(([key, val]) => {
		// Recurse if type is array or object
		if (typeof val === "object" && val !== null) {
			return !match(source[key], val);
		}

		return source[key] !== val;
	});

	return !foundNonMatch;
};

/**
 * Finds all items in `source` that match the structure of `query` and
 * returns the path to them as an array of strings.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {String=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<Boolean> and path<Array>.
 */
export const findPath = (source: any, query: any, options: FindOptionsType = {maxDepth: Infinity, currentDepth: 0, includeRoot: true}, parentPath = ""): object => {
	const resultArr = [];
	const sourceType = typeof source;

	options = {
		maxDepth: Infinity,
		currentDepth: 0,
		includeRoot: true,
		...options
	};

	if (options.currentDepth !== 0 || (options.currentDepth === 0 && options.includeRoot)) {
		if (match(source, query)) {
			resultArr.push(parentPath);
		}
	}

	// @ts-ignore
	options.currentDepth++;

	// @ts-ignore
	if (options.currentDepth <= options.maxDepth && sourceType === "object") {
		for (let key in source) {
			if (source.hasOwnProperty(key)) {
				const val = source[key];

				// Recurse down object to find more instances
				const result = findPath(val, query, options, join(parentPath, key));

				// @ts-ignore
				if (result.match) {
					// @ts-ignore
					resultArr.push(...result.path);
				}
			}
		}
	}

	return {match: resultArr.length > 0, path: resultArr};
};

/**
 * Finds the first item that matches the structure of `query`
 * and returns the path to it.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {String=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<Boolean> and path<String>.
 */
export const findOnePath = (source: any, query: any, options: FindOptionsType = {maxDepth: Infinity, currentDepth: 0, includeRoot: true}, parentPath = ""): object => {
	const sourceType = typeof source;

	options = {
		maxDepth: Infinity,
		currentDepth: 0,
		includeRoot: true,
		...options
	};

	if (options.currentDepth !== 0 || (options.currentDepth === 0 && options.includeRoot)) {
		if (match(source, query)) {
			return {
				match: true,
				path: parentPath
			};
		}
	}

	// @ts-ignore
	options.currentDepth++;

	// @ts-ignore
	if (options.currentDepth <= options.maxDepth && sourceType === "object" && source !== null) {
		for (let key in source) {
			if (source.hasOwnProperty(key)) {
				const val = source[key];

				// Recurse down object to find more instances
				const subPath = join(parentPath, key);
				const result = findOnePath(val, query, options, subPath);

				// @ts-ignore
				if (result.match) {
					return result;
				}
			}
		}
	}

	return {match: false};
};

/**
 * Returns a deduplicated array of strings.
 * @param {string[]} keys An array of strings to deduplicate.
 * @returns {string[]} The deduplicated array.
 */
export const keyDedup = (keys: string[]): string[] => {
	return keys.filter((elem, pos, arr) => {
		return arr.indexOf(elem) === pos;
	});
};

/**
 * Compares two provided objects / arrays and returns an array of
 * dot-notation paths to the fields that hold different values.
 * @param {ObjectType} obj1 The first object / array to compare.
 * @param {ObjectType} obj2 The second object / array to compare.
 * @param {String=""|string[]} basePath The base path from which to check for
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
 * @param {any[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {Array} An array of strings, each string is a path to a
 * field that holds a different value between the two objects being
 * compared.
 */
export const diff = (obj1: ObjectType, obj2: ObjectType, basePath: string|string[] = "", strict = false, maxDepth = Infinity, parentPath = "", objCache = []): Array<any> => {
	const paths = [];

	if (basePath instanceof Array) {
		// We were given an array of paths, check each path
		return basePath.reduce((arr, individualPath) => {
			// Here we find any path that has a *non-equal* result which
			// returns true and then returns the index as a positive integer
			// that is not -1. If -1 is returned then no non-equal matches
			// were found
			const result = diff(obj1, obj2, individualPath, strict, maxDepth, parentPath, objCache);
			if (result && result.length) {
				// @ts-ignore
				arr.push(...result);
			}

			return arr;
		}, []);
	}

	const currentPath = join(parentPath, basePath);
	const val1 = get(obj1, basePath);
	const val2 = get(obj2, basePath);
	const type1 = type(val1);
	const type2 = type(val2);

	if (type1 !== type2) {
		// Difference in source and comparison types
		paths.push(currentPath);
	} else if (type1 === "array" && val1.length !== val2.length) {
		// Difference in source and comparison types
		paths.push(currentPath);
	}

	const pathParts = currentPath.split(".");
	const hasParts = pathParts[0] !== "";

	if ((!hasParts || pathParts.length < maxDepth) && typeof val1 === "object" && val1 !== null) {
		// Check that we haven't visited this object before (avoid infinite recursion)
		// @ts-ignore
		if (objCache.indexOf(val1) > -1 || objCache.indexOf(val2) > -1) {
			return paths;
		}

		// @ts-ignore
		objCache.push(val1);
		// @ts-ignore
		objCache.push(val2);

		// Grab composite of all keys on val1 and val2
		const val1Keys = Object.keys(val1);
		const val2Keys = (typeof val2 === "object" && val2 !== null) ? Object.keys(val2) : [];
		const compositeKeys = keyDedup(val1Keys.concat(val2Keys));

		return compositeKeys.reduce((arr, key) => {
			const result = diff(val1, val2, key, strict, maxDepth, currentPath, objCache);
			if (result && result.length) {
				arr.push(...result);
			}

			return arr;
		}, paths);
	}

	if ((strict && val1 !== val2) || (!strict && val1 != val2)) {
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
export const isEqual = (obj1: any, obj2: any, path: string[] | string, deep: boolean = false, strict: boolean = false): boolean => {
	if (path instanceof Array) {
		// We were given an array of paths, check each path
		return path.findIndex((individualPath) => {
			// Here we find any path that has a *non-equal* result which
			// returns true and then returns the index as a positive integer
			// that is not -1. If -1 is returned then no non-equal matches
			// were found
			return isNotEqual(obj1, obj2, individualPath, deep, strict);
		}) === -1;
	}

	const val1 = get(obj1, path);
	const val2 = get(obj2, path);

	if (deep) {
		if (typeof val1 === "object" && val1 !== null) {
			// TODO: This probably needs a composite key array of val1 and val2 keys
			//  just as we do in the diff() function
			return Object.keys(val1).findIndex((key) => {
				return isNotEqual(val1, val2, key, deep, strict);
			}) === -1;
		}
	}

	return (strict && val1 === val2) || (!strict && val1 == val2);
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
export const isNotEqual = (obj1: any, obj2: any, path: string[] | string, deep: boolean = false, strict: boolean = false): boolean => {
	return !isEqual(obj1, obj2, path, deep, strict);
};

/**
 * Same as set() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const setImmutable = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): any => {
	return set(obj, path, val, {...options, immutable: true});
};

/**
 * Same as pushVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const pushValImmutable = (obj: ObjectType, path: string, val: any, options: OptionsType = {}): any => {
	return pushVal(obj, path, val, {...options, immutable: true});
};

/**
 * Same as pullVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const pullValImmutable = (obj: ObjectType, path: string, val: any, options: OptionsType = {}): any => {
	return pullVal(obj, path, val, {...options, immutable: true});
};

/**
 * Same as unSet() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {String} path The path to operate on.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const unSetImmutable = (obj: ObjectType, path: string, options: SetOptionsType = {}): any => {
	return unSet(obj, path, {...options, immutable: true});
};

/**
 * Gets the values of the paths in pathArr and returns them as an object
 * with each key matching the path and the value matching the value from
 * obj that was at that path.
 * @param {Object} obj The object to operate on.
 * @param {Array<String>} pathArr Array of path strings.
 * @returns {*} The new object.
 */
export const distill = (obj: object, pathArr: string[]): any => {
	return pathArr.reduce((newObj, path) => {
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
export const chop = (path: string, level: number): string => {
	const parts = split(path);

	if (parts.length > level) {
		parts.length = level;
	}

	return join(...parts);
};

export default {
	chop,
	clean,
	countLeafNodes,
	countMatchingPathsInObject,
	decouple,
	diff,
	distill,
	down,
	escape,
	findOnePath,
	findPath,
	flatten,
	flattenValues,
	furthest,
	get,
	getMany,
	hasMatchingPathsInObject,
	isEqual,
	isNotEqual,
	join,
	joinEscaped,
	leafNodes,
	match,
	numberToWildcard,
	pop,
	pullVal,
	pullValImmutable,
	push,
	pushVal,
	pushValImmutable,
	set,
	setImmutable,
	shift,
	split,
	type,
	unSet,
	unSetImmutable,
	up,
	update,
	updateImmutable,
	values,
	wildcardToZero
};