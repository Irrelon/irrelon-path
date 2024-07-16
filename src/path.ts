export type ObjectType = { [key: string]: any };
export type ArrayType = Map<string, any[]>;

export interface PathData {
	indices?: number[][];
	directPaths?: string[];
}

export type QueryMatchFunction = (val: any) => boolean;

export interface OptionsType {
	transformRead?: (...rest: any) => any;
	transformKey?: (...rest: any) => any;
	transformWrite?: (...rest: any) => any;
	leavesOnly?: boolean;
}

export interface GetOptionsType extends OptionsType {
	wildcardExpansion?: boolean; // Gets all results from an array when encountering a $ e.g. arr.$.value would return an array of `value` in all arr items
	arrayTraversal?: boolean; // Will traverse arrays without the need for a wildcard e.g. arr.value would look inside `arr: [{value: true}]`
	arrayExpansion?: boolean; // Same as wildcardExpansion but does not require a wildcard in the path
	expandedResult?: any[]; // Used to store data while processing
	pathData?: PathData; // Used to store data while processing
	pathRoot?: string;
}

export interface SetOptionsType extends GetOptionsType {
	immutable?: boolean;
	strict?: boolean;
	ignore?: RegExp;
}

export interface FindOptionsType extends OptionsType {
	maxDepth?: number;
	currentDepth?: number;
	includeRoot?: boolean;
}

export interface DiffValue {
	val1: unknown;
	val2: unknown;
	type1: string;
	type2: string;
	difference: "value" | "type" | "both";
}

/**
 * Defines the options for merging objects.
 * @interface
 */
export interface MergeOptionsType {
	immutable?: boolean;
	/**
	 * A flag indicating whether undefined values should override
	 * existing target values or not. If true, undefined values
	 * will not be set in the target object from the source object.
	 *
	 * @type {boolean | undefined}
	 */
	ignoreUndefined?: boolean;
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
 * @param {string} key The key to set data in.
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
 * @param {string} path The path to evaluate.
 * @returns {boolean} True if delimiter found, false if not.
 */
export const isCompositePath = (path: string): boolean => {
	const regExp = /\./g;
	let result;

	while (result = regExp.exec(path)) {
		// Check if the previous character was an escape
		// and if so, ignore this delimiter
		if (result.index === 0 || path.substr(result.index - 1, 1) !== "\\") {
			// This is not an escaped path, so it IS a composite path
			return true;
		}
	}

	return false;
};

/**
 * Provides the opposite of `isCompositePath()`. If a delimiter is found, this
 * function returns false.
 * @param {string} path The path to evaluate.
 * @returns {boolean} False if delimiter found, true if not.
 */
export const isNonCompositePath = (path: string): boolean => {
	return !isCompositePath(path);
};

/**
 * Returns the given path after removing the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * move up.
 * @returns {string} The new path string.
 */
export const up = (path: string, levels: number = 1): string => {
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
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * move down.
 * @returns {string} The new path string.
 */
export const down = (path: string, levels: number = 1): string => {
	const parts = split(path);

	for (let i = 0; i < levels; i++) {
		parts.shift();
	}

	return parts.join(".");
};

/**
 * Returns the last leaf from the path. E.g.
 * "foo.bar.thing" returns "thing".
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * pop.
 * @returns {string} The new path string.
 */
export const pop = (path: string, levels: number = 1): string => {
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
 * @param {string} path The path to operate on.
 * @param {string} val The string value to push
 * to the end of the path.
 * @returns {string} The new path string.
 */
export const push = (path: string, val: string = ""): string => {
	return `${path}.${val}`;
};

/**
 * Returns the first leaf from the path. E.g.
 * "foo.bar.thing" returns "foo".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * shift.
 * @returns {string} The new path string.
 */
export const shift = (path: string, levels: number = 1): string => {
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
 * @param {string} key The key to test.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {string} The key.
 */
export const wildcardToZero = (key: string, currentObj: any): string => {
	return key === "$" ? "0" : key;
};

/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {string} key The key to test.
 * @returns {string} The original key or a wildcard.
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
 * @param {string} str The string to clean.
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
 * @param {string} path The path to split into an array.
 * @return {Array<string>} The component parts of the path, split
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
 * @param {string} str The string to escape periods in.
 * @return {string} The escaped string.
 */
export const escape = (str: string): string => {
	return str.replace(/\./g, "\\.");
};

/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value.
 * @param {string} str The string to unescape.
 * @returns {string} The unescaped string.
 */
export const unEscape = (str: string): string => {
	return str.replace(/\\./g, ".");
};

/**
 * Gets a single value from the passed object and given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object.
 * @returns {*} The value retrieved from the passed object at
 * the passed path.
 */
export const get = (obj: ObjectType | undefined | null, path: string | any[], defaultVal: any | undefined = undefined, options: GetOptionsType = {}): any => {
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
		options.pathRoot = join(options.pathRoot || "", pathPart);

		// @ts-ignore
		objPart = objPart[transformedKey];

		const isPartAnArray = objPart instanceof Array;

		if (isPartAnArray && options.wildcardExpansion === true) {
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
 * @param {string} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object.
 * @returns {Array}
 */
export const getMany = (data: ObjectType, path: string, defaultVal: any | undefined = undefined, options: GetOptionsType | undefined = {}): any[] => {
	const isDataAnArray = data instanceof Array;
	const pathRoot = options.pathRoot || "";

	if (!isDataAnArray) {
		const innerResult = get(data, path, defaultVal, options);
		const isInnerResultAnArray = innerResult instanceof Array;

		options.pathData?.directPaths?.push(join(options.pathRoot || "", path));
		if (isInnerResultAnArray) return innerResult;
		if (innerResult === undefined && defaultVal === undefined) return [];
		if (innerResult === undefined && defaultVal !== undefined) return [defaultVal];

		return [innerResult];
	}

	const parts = split(path);
	const firstPart = parts[0];
	const pathRemainder = parts.slice(1).join(".");

	const resultArr = data.reduce((innerResult, arrItem, arrIndex) => {
		const isArrItemAnArray = arrItem[firstPart] instanceof Array;

		if (isArrItemAnArray) {
			options.pathRoot = join(pathRoot || "", String(arrIndex), firstPart);
			const recurseResult = getMany(arrItem[firstPart], pathRemainder, defaultVal, options);

			innerResult.push(...recurseResult);
			return innerResult;
		}

		const val = get(arrItem, path, defaultVal, options);
		if (val !== undefined) {
			options.pathData?.directPaths?.push(join(options.pathRoot || "", String(arrIndex), path));
			innerResult.push(val);
		}

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
 * @param {string} path The path to set data on.
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
		if (String(parseInt(transformedPathPart, 10)) === transformedPathPart || (pathParts.length > 0 && String(parseInt(pathParts[0], 10)) === pathParts[0])) {
			// This is an array index
			newObj[transformedPathPart] = [];
		} else {
			newObj[transformedPathPart] = {};
		}

		objPart = newObj[transformedPathPart];
	} else {
		objPart = childPart;
	}

	return set(newObj, transformedPathPart, set(objPart, pathParts.join("."), val, options), options);
};

/**
 * Deletes a key from an object by the given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to delete.
 * @param {SetOptionsType} [options] The options object.
 * @param {Object=} tracking Do not use.
 */
export const unSet = (obj: ObjectType, path: string, options: SetOptionsType = {}, tracking: {
	returnOriginal?: boolean
} = {}) => {
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

	newObj[transformedPathPart] = unSet(childPart, pathParts.join("."), options, tracking);

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
 * @param {string} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param options The options object.
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
 * @param {string} [basePath=""] The path to the object to operate on relative
 * to the `obj`. If `obj` is the object to be directly operated on, leave
 * `basePath` as an empty string.
 * @param {ObjectType} updateData The update data to apply with
 * keys as string paths.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export const updateImmutable = (obj: ObjectType, basePath: string = "", updateData: ObjectType, options: SetOptionsType = {}): any => {
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
 * @param {string} path The path to the array to push to.
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
			throw ("Cannot push to a path whose leaf node is not an array!");
		}

		// @ts-ignore
		obj[part].push(val);
	} else {
		// We have found the target array, push the value
		obj = decouple(obj, options) || [];

		if (!(obj instanceof Array)) {
			throw ("Cannot push to a path whose leaf node is not an array!");
		}

		obj.push(val);
	}

	return decouple(obj, options);
};

/**
 * Pull a value to from an array at the specified path. Removes the first
 * matching value, not every matching value.
 * @param {ObjectType} obj The object to update.
 * @param {string} path The path to the array to pull from.
 * @param {*} val The value to pull from the array.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having removed the newly pulled value.
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
	obj = decouple(obj, options);

	if (pathParts.length && part !== undefined) {
		// Recurse - we don't need to assign obj[part] the result of this call because
		// we are modifying by reference since we haven't reached the furthest path
		// part (leaf) node yet
		obj[part] = pullVal(obj[part], pathParts.join("."), val, options);
	} else if (part) {
		// Recurse - this is the leaf node so assign the response to obj[part] in
		// case it is set to an immutable response
		obj[part] = pullVal(obj[part], "", val, options);
	} else {
		// The target array is the root object, pull the value
		if (!(obj instanceof Array)) {
			throw ("Cannot pull from a path whose leaf node is not an array!");
		}

		let index: number;

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

	return obj;
};

/**
 * Inserts or deletes from/into the array at the specified path.
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
export const splicePath = (obj: ObjectType, path: string, start: number, deleteCount: number, itemsToAdd: any[] = [], options: SetOptionsType = {strict: true}): ObjectType => {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	}

	// Clean the path
	path = clean(path);

	const pathParts = split(path);
	const part = pathParts.shift();

	if (part === "__proto__") return obj;
	obj = decouple(obj, options);

	if (pathParts.length && part !== undefined) {
		// Recurse - we don't need to assign obj[part] the result of this call because
		// we are modifying by reference since we haven't reached the furthest path
		// part (leaf) node yet
		obj[part] = splicePath(obj[part], pathParts.join("."), start, deleteCount, itemsToAdd, options);
	} else if (part) {
		if (!(obj[part] instanceof Array)) {
			throw ("Cannot splice from a path whose leaf node is not an array!");
		}

		// We've reached our destination leaf node
		// Remove the item from the array
		obj[part] = decouple(obj[part], options);
		obj[part].splice(start, deleteCount, ...itemsToAdd);
	} else {
		if (!(obj instanceof Array)) {
			throw ("Cannot splice from a path whose leaf node is not an array!");
		}

		// We've reached our destination leaf node
		// Remove the item from the array
		obj.splice(start, deleteCount, ...itemsToAdd);
	}

	return obj;
};

/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {string} The path to the furthest non-undefined value.
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
 * @param {string} path The path to retrieve data from.
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
		const pathPart: string = options.transformKey(pathParts[i]);
		currentPath.push(pathPart);

		const tmpPath = currentPath.join(".");

		// @ts-ignore
		valueData[tmpPath] = get(obj, tmpPath);
	}

	// @ts-ignore
	return valueData;
};

/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings.
 * @param obj The object to scan.
 * @param finalArr An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param [options] An options object.
 * @param [objCache] Internal, do not use.
 * @returns An array containing path strings.
 */
export const flatten = (obj: ObjectType, finalArr: any[] | undefined = [], parentPath: string = "", options: SetOptionsType = {}, objCache = []): string[] => {
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

	const currentPath = (key: string | number | symbol) => {
		// @ts-ignore
		const tKey = options.transformKey(key);
		return parentPath ? join(parentPath, tKey) : tKey;
	};

	for (const i in transformedObj) {
		if (!transformedObj.hasOwnProperty(i)) continue;

		if (options.ignore && options.ignore.test(i)) {
			continue;
		}

		const pathToChild = currentPath(i);
		const childObj = transformedObj[i];
		finalArr.push(pathToChild);

		if (typeof childObj === "object" && childObj !== null) {
			flatten(childObj, finalArr, pathToChild, options, objCache);
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
 * @param {string=} parentPath The path of the parent object. (Do not
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
				// @ts-ignore
				finalObj[pathKey] = options.transformWrite(transformedObj[i]);
			}

			if (!options.leavesOnly) {
				// @ts-ignore
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
 * @param  args args Path to join.
 * @returns  A final path string.
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
 * @param {...string} args Path to join.
 * @returns {string} A final path string.
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
 * @returns {number} The number of keys.
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
 * @param {string} [parentPath=""] The path to use as a root/base path to
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
 * @returns {boolean} True if the object paths exist.
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
export const countMatchingPathsInObject = (testKeys: ObjectType, testObj: ObjectType): {
	matchedKeys: ObjectType,
	matchedKeyCount: number,
	totalKeyCount: number
} => {
	const matchedKeys = {};

	let matchData,
		matchedKeyCount = 0,
		totalKeyCount = 0;

	for (const i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (typeof testObj[i] === "object" && testObj[i] !== null) {
				// The test / query object key is an object, recurse
				matchData = countMatchingPathsInObject(testKeys[i], testObj[i]);

				// @ts-ignore
				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++;

				// Check if the test keys also have this key and it is also not an object
				if (testKeys && testKeys[i] && (typeof testKeys[i] !== "object" || testKeys[i] === null)) {
					// @ts-ignore
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					// @ts-ignore
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
 * @param item The item to get the type of.
 * @returns The string name of the type.
 */
export const type = (item: unknown): "undefined" | "object" | "boolean" | "number" | "string" | "function" | "symbol" | "bigint" | "null" | "array" => {
	if (item === null) {
		return "null";
	}

	if (Array.isArray(item)) {
		return "array";
	}

	return typeof item;
};

/**
 * Determines if the query data exists anywhere inside the source
 * data. Will recurse into arrays and objects to find query.
 * @param {*} source The source data to check.
 * @param {*} query The query data to find.
 * @param {OptionsType} [options] An options object.
 * @returns {boolean} True if query was matched, false if not.
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

export interface FindPathReturn {
	match: boolean;
	path: string[];
}

/**
 * Finds all items in `source` that match the structure of `query` and
 * returns the path to them as an array of strings.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {string=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<Boolean> and path<Array>.
 */
export const findPath = (source: any, query: any, options: FindOptionsType = {
	maxDepth: Infinity,
	currentDepth: 0,
	includeRoot: true
}, parentPath = ""): FindPathReturn => {
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

export interface FindOnePathNoMatchFoundReturn {
	match: false;
}

export interface FindOnePathMatchFoundReturn {
	match: true;
	path: string;
}

export type FindOnePathReturn = FindOnePathNoMatchFoundReturn | FindOnePathMatchFoundReturn;

/**
 * Finds the first item that matches the structure of `query`
 * and returns the path to it.
 * @param {*} source The source to test.
 * @param {*} query The query to match.
 * @param {FindOptionsType} [options] Options object.
 * @param {string=""} parentPath Do not use. The aggregated
 * path to the current structure in source.
 * @returns {Object} Contains match<boolean> and path<string>.
 */
export const findOnePath = (source: any, query: any, options: FindOptionsType = {
	maxDepth: Infinity,
	currentDepth: 0,
	includeRoot: true
}, parentPath = ""): FindOnePathReturn => {
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
 * @param {string=""|string[]} basePath The base path from which to check for
 * differences. Differences outside the base path will not be
 * returned as part of the array of differences. Leave blank to check
 * for all differences between the two objects to compare.
 * @param {boolean=false} strict If strict is true, diff uses strict
 * equality to determine difference rather than non-strict equality;
 * effectively (=== is strict, == is non-strict).
 * @param {number=Infinity} maxDepth Specifies the maximum number of
 * path sub-trees to walk down before returning what we have found.
 * For instance, if set to 2, a diff would only check down,
 * "someFieldName.anotherField", or "user.name" and would not go
 * further down than two fields. If anything in the trees further
 * down than this level have changed, the change will not be detected
 * and the path will not be included in the resulting diff array.
 * @param {string=""} parentPath Used internally only.
 * @param {never[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {Array} An array of strings, each string is a path to a
 * field that holds a different value between the two objects being
 * compared.
 */
export const diff = (obj1: ObjectType, obj2: ObjectType, basePath: string | string[] = "", strict = false, maxDepth = Infinity, parentPath = "", objCache: never[] = []): Array<string> => {
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
 * Compares two provided objects / arrays and returns details of any
 * differences including the values and types that are different.
 * @param {ObjectType} obj1 The first object / array to compare.
 * @param {ObjectType} obj2 The second object / array to compare.
 * @param {string=""|string[]} basePath The base path from which to check for
 * differences. Differences outside the base path will not be
 * returned as part of the array of differences. Leave blank to check
 * for all differences between the two objects to compare.
 * @param {boolean=false} strict If strict is true, diff uses strict
 * equality to determine difference rather than non-strict equality;
 * effectively (=== is strict, == is non-strict).
 * @param {number=Infinity} maxDepth Specifies the maximum number of
 * path sub-trees to walk down before returning what we have found.
 * For instance, if set to 2, a diff would only check down,
 * "someFieldName.anotherField", or "user.name" and would not go
 * further down than two fields. If anything in the trees further
 * down than this level have changed, the change will not be detected
 * and the path will not be included in the resulting diff array.
 * @param {string=""} parentPath Used internally only.
 * @param {never[]} [objCache=[]] Internal usage to check for cyclic structures.
 * @returns {Record<string, DiffValue>} An object where each key is a path to a
 * field that holds a different value between the two objects being
 * compared and the value of each key is an object holding details of
 * the difference.
 */
export const diffValues = (obj1: ObjectType, obj2: ObjectType, basePath: string | string[] = "", strict = false, maxDepth = Infinity, parentPath = "", objCache: never[] = []): Record<string, DiffValue> => {
	const paths: Record<string, DiffValue> = {};

	if (basePath instanceof Array) {
		// We were given an array of paths, check each path
		return basePath.reduce((diffVals, individualPath) => {
			// Here we find any path that has a *non-equal* result which
			// returns true and then returns the index as a positive integer
			// that is not -1. If -1 is returned then no non-equal matches
			// were found
			const result = diffValues(obj1, obj2, individualPath, strict, maxDepth, parentPath, objCache);
			if (result && Object.keys(result).length) {
				diffVals = {...diffVals, ...result};
			}

			return diffVals;
		}, {});
	}

	const currentPath = join(parentPath, basePath);
	const val1 = get(obj1, basePath);
	const val2 = get(obj2, basePath);
	const type1 = type(val1);
	const type2 = type(val2);

	if (type1 !== type2) {
		if (strict && val1 != val2) {
			// Difference in source and comparison types
			paths[currentPath] = {val1, val2, type1, type2, difference: "type"};
		}
	} else if (type1 === "array" && type2 === "array" && val1.length !== val2.length) {
		// Difference in source and comparison content
		paths[currentPath] = {val1, val2, type1, type2, difference: "value"};
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

		return compositeKeys.reduce((newPaths, key) => {
			const result = diffValues(val1, val2, key, strict, maxDepth, currentPath, objCache);
			if (result && Object.keys(result).length) {
				newPaths = {...newPaths, ...result};
			}

			return newPaths;
		}, paths);
	}

	if ((strict && val1 !== val2) || (!strict && val1 != val2)) {
		let difference: DiffValue["difference"] = "value";

		if (strict && type1 !== type2) {
			if (val1 != val2) {
				difference = "both";
			} else {
				difference = "type";
			}
		}

		paths[currentPath] = {val1, val2, type1, type2, difference};
	}

	return paths;
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
 * to check for equality. Defaults to false.
 * @param {boolean} strict If true, values must be strict-equal.
 * Defaults to false.
 * @returns {boolean} True if path values match, false if not.
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
export const isNotEqual = (obj1: any, obj2: any, path: string[] | string, deep: boolean = false, strict: boolean = false): boolean => {
	return !isEqual(obj1, obj2, path, deep, strict);
};

/**
 * Same as set() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
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
 * @param {string} path The path to operate on.
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
 * @param {string} path The path to operate on.
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
 * @param {string} path The path to operate on.
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
 * @param {Array<string>} pathArr Array of path strings.
 * @returns {*} The new object.
 */
export const distill = (obj: object, pathArr: string[]): any => {
	return pathArr.reduce((newObj, path) => {
		// @ts-ignore
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
 * @param {string} path The path to operate on.
 * @param {number} level The maximum level of a path.
 * @returns {string} The new path string.
 */
export const chop = (path: string, level: number): string => {
	const parts = split(path);

	if (parts.length > level) {
		parts.length = level;
	}

	return join(...parts);
};

/**
 * Merges two objects like a "deep spread". If both obj1 and obj2 contain a leaf node
 * the value from obj2 will be used.
 * @param obj1
 * @param obj2
 * @param options
 */
export const merge = (obj1: object, obj2: object, options: MergeOptionsType = {}) => {
	const newObj = decouple(obj1, options);

	Object.entries(obj2).forEach(([key, val]) => {
		const valueType = type(val);

		if (valueType === "object" || valueType === "array") {
			// Recursive type
			// @ts-ignore
			newObj[key] = merge(obj1[key] || (valueType === "object" ? {} : []), val, options);
		} else {
			// Non-recursive type
			if (options.ignoreUndefined && val === undefined) return;
			newObj[key] = val;
		}
	});

	return newObj;
};

export const mergeImmutable = (obj1: object, obj2: object, options: MergeOptionsType = {}) => {
	return merge(obj1, obj2, {...options, immutable: true});
};

interface QueryGate {
	$and?: QueryType[];
	$or?: QueryType[];
}

interface QueryOperator {
	$in?: QueryMatchFunction | any[];
}

type QueryType = Record<string, QueryOperator>;

const $in = (value: any, criteria: QueryMatchFunction | any[]) => {
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
}

/**
 * Retrieves paths to parts of the object that satisfy the given query criteria.
 *
 * @param {ObjectType} obj - The object to query.
 * @param {QueryType} query - The query criteria.
 * @return {Record<string, string[]>} - The query result, represented as a record where each property
 * contains an array of values that satisfy the corresponding query criterion.
 */
export const query = (obj: ObjectType, query: QueryType): Record<string, string[]> => {
	const queryResult: Record<string, string[]> = {};

	for (const queryKey in query) {
		if (!query.hasOwnProperty(queryKey)) continue;
		queryResult[queryKey] = [];

		const queryOperations = query[queryKey];
		Object.entries(queryOperations).forEach(([operationKey, operationCriteria]) => {
			if (operationKey === "$in") {
				traverse(obj, queryKey, ({purePath, flatPath, value}) => {
					if (flatPath !== queryKey) return true;
					if (!$in(value, operationCriteria)) return true;
					queryResult[queryKey].push(purePath);

					return true;
				});
			}
		});
	}

	return queryResult
}

export interface OperationFunctionProps {
	purePath: string;
	flatPath: string;
	value: any;
	key: string;
}

/**
 * Calls `operation` on every part of `path`.
 * @param obj The object to operate on with the path.
 * @param path The path to iterate.
 * @param operation The function to call for each part of the path.
 * @param options
 * @param parentPaths Do not pass, used internally.
 */
export const traverse = (obj: ObjectType | undefined | null, path: string | any[], operation: (props: OperationFunctionProps) => boolean, options: GetOptionsType = {}, parentPaths: {
	pure: string;
	flat: string
} = {pure: "", flat: ""}): any => {
	let internalPath = path;

	if (path instanceof Array) {
		return path.forEach((individualPath) => {
			traverse(obj, individualPath, operation);
		});
	}

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	const transformedObj = options.transformRead(obj);

	// No path string, return the base obj
	if (!internalPath) {
		return;
	}

	// @ts-ignore
	internalPath = clean(internalPath);

	// Path is not a string, throw error
	if (typeof internalPath !== "string") {
		throw new Error("Path argument must be a string");
	}

	const purePath = (key: string) => {
		return parentPaths.pure ? join(parentPaths.pure, key) : key;
	};

	const flatPath = (key: string) => {
		return parentPaths.flat ? join(parentPaths.flat, key) : key;
	};

	// Path has no dot-notation, return key/value
	if (isNonCompositePath(internalPath)) {
		const transformedKey = options.transformKey(unEscape(internalPath), transformedObj)
		operation({purePath: purePath(transformedKey), flatPath: flatPath(transformedKey), key: transformedKey, value: get(transformedObj, transformedKey)});
		return;
	}

	const pathParts = split(internalPath);
	let objPart = transformedObj;

	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];
		const transformedKey: string = options.transformKey(unEscape(pathPart), objPart);

		const purePathToChild = purePath(transformedKey);
		const flatPathToChild = flatPath(transformedKey);

		objPart = get(objPart, transformedKey);
		operation({purePath: purePathToChild, flatPath: flatPathToChild, key: transformedKey, value: objPart});

		const isPartAnArray = Array.isArray(objPart);

		if (isPartAnArray) {
			for (let arrIndex = 0; arrIndex < objPart.length; arrIndex++) {
				const key = arrIndex.toString();
				operation({purePath: join(purePathToChild, key), flatPath: flatPathToChild, key, value: objPart[arrIndex]});
				traverse(objPart[arrIndex], down(internalPath), operation, {}, {
					pure: join(purePathToChild, key),
					flat: flatPathToChild
				});
			}

			return;
		}
	}
};