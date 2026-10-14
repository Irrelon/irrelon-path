export type ObjectType = { [key: string]: any };
export type ArrayType = Map<string, any[]>;

export type ValueType =
	"undefined"
	| "object"
	| "boolean"
	| "number"
	| "string"
	| "function"
	| "symbol"
	| "bigint"
	| "null"
	| "array";
export type DifferenceType = "value" | "type" | "both";

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
	type1: ValueType;
	type2: ValueType;
	difference: DifferenceType;
}

export interface DiffOptionsType {
	basePath?: string | string[];
	strict?: boolean;
	maxDepth?: number;
	exclusive?: boolean;
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
const _isUnsafeKey = (key: unknown): boolean => key === "__proto__";

/**
 * Checks if the object has its own property with the given key without
 * relying on the object's own hasOwnProperty() which may have been
 * overridden by data or may not exist at all (Object.create(null)).
 * @param {object} obj The object to check.
 * @param {PropertyKey} key The key to check for.
 * @returns {boolean} True if the object has its own property.
 * @private
 */
const _hasOwn = (obj: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Determines if the value is an object or array that can be traversed.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is a non-null object.
 * @private
 */
const _isObjectLike = (val: unknown): val is ObjectType => typeof val === "object" && val !== null;

/**
 * Determines if the value is a plain object (created via an object
 * literal, JSON.parse() or Object.create(null)) rather than an array,
 * a class instance or a built-in like Date or Map.
 * @param {*} val The value to check.
 * @returns {boolean} True if the value is a plain object.
 * @private
 */
const _isPlainObject = (val: unknown): val is ObjectType => {
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
const _isArrayIndex = (key: string): boolean => /^(?:0|[1-9]\d*)$/.test(key) && Number(key) < 4294967295;

/**
 * Sets a value as an own property of the object. Plain assignment of a
 * "__proto__" key would change the prototype of the object instead, so
 * that key is defined explicitly.
 * @param {ObjectType} obj The object to set the value on.
 * @param {string} key The key to set.
 * @param {*} val The value to set.
 * @private
 */
const _setOwn = (obj: ObjectType, key: string, val: any): void => {
	if (key === "__proto__") {
		Object.defineProperty(obj, key, {value: val, writable: true, enumerable: true, configurable: true});
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
const _assignOwn = (target: ObjectType, source: ObjectType): void => {
	Object.keys(source).forEach((key) => _setOwn(target, key, source[key]));
};

/**
 * Throws if the path is not a string.
 * @param {*} path The path to check.
 * @private
 */
const _assertPathIsString = (path: unknown): void => {
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
const _newInstance = (item: any): any => {
	if (Array.isArray(item)) {
		if (item.length <= SPARSE_COPY_LENGTH) {
			return item.slice();
		}

		const newArr = new Array(item.length);

		Object.keys(item).forEach((key: any) => {
			newArr[key] = item[key];
		});

		return newArr;
	}

	if (!_isObjectLike(item)) {
		return item;
	}

	// Built-ins that keep their data in internal slots need their own
	// constructor to be copied
	if (item instanceof Date) return new Date(item.getTime());
	if (item instanceof RegExp) return new RegExp(item);
	if (item instanceof Map) return new Map(item);
	if (item instanceof Set) return new Set(item);

	const proto = Object.getPrototypeOf(item);

	// Object spread compiles to Object.assign() which would turn an own
	// "__proto__" key (e.g. from JSON.parse()) into a prototype change
	if (proto === Object.prototype && !_hasOwn(item, "__proto__")) {
		return {...item};
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
export const isCompositePath = (path: string): boolean => {
	return split(path).length > 1;
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
 * "foo.bar.thing.goo". A blank path or leaf does
 * not add a delimiter.
 * @param {string} path The path to operate on.
 * @param {string} val The string value to push
 * to the end of the path.
 * @returns {string} The new path string.
 */
export const push = (path: string, val: string = ""): string => {
	return join(path, val);
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
 * escaped period characters. Escape sequences are kept intact
 * in each part, use `unEscape()` to get the original key.
 * @param {string} path The path to split into an array.
 * @return {Array<string>} The component parts of the path, split
 * by period character.
 */
export const split = (path: string): Array<string> => {
	// Nothing is escaped so a plain split is enough
	if (path.indexOf("\\") === -1) {
		return path.split(".");
	}

	const parts: string[] = [];
	let part = "";

	for (let i = 0; i < path.length; i++) {
		const char = path[i];

		if (char === "\\" && i < path.length - 1) {
			// Keep the escape sequence and skip the escaped character
			// so an escaped period is not treated as a delimiter
			part += char + path[i + 1];
			i++;
		} else if (char === ".") {
			parts.push(part);
			part = "";
		} else {
			part += char;
		}
	}

	parts.push(part);

	return parts;
};

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
export const escape = (str: string): string => {
	return str.replace(/\\/g, "\\\\").replace(/\./g, "\\.");
};

/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value. A backslash followed
 * by any other character is left as it is.
 * @param {string} str The string to unescape.
 * @returns {string} The unescaped string.
 */
export const unEscape = (str: string): string => {
	return str.replace(/\\([.\\])/g, "$1");
};

/**
 * The implementation of get(). The options object is shared and mutated
 * by recursive calls (and getMany()) during a single top-level call so
 * wildcard results and path data can be collected.
 * @private
 */
const _get = (obj: ObjectType | undefined | null, path: string | any[], defaultVal: any, options: GetOptionsType): any => {
	let objPart;

	if (path instanceof Array) {
		return path.map((individualPath) => {
			return _get(obj, individualPath, defaultVal, {...options});
		});
	}

	options.transformRead = options.transformRead || returnWhatWasGiven;
	options.transformKey = options.transformKey || returnWhatWasGiven;
	options.transformWrite = options.transformWrite || returnWhatWasGiven;

	// No object data, return default data
	if (obj === undefined || obj === null) {
		return defaultVal;
	}

	// No path string, return the base obj
	if (!path) {
		return obj;
	}

	_assertPathIsString(path);

	const pathParts = split(clean(path));

	// Path has no dot-notation, return key/value
	if (pathParts.length === 1) {
		const key: string = options.transformKey(unEscape(pathParts[0]), obj);

		// @ts-ignore
		return obj[key] !== undefined ? obj[key] : defaultVal;
	}

	if (typeof obj !== "object") {
		return defaultVal;
	}

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
export const get = (obj: ObjectType | undefined | null, path: string | any[], defaultVal: any | undefined = undefined, options: GetOptionsType = {}): any => {
	return _get(obj, path, defaultVal, {...options});
};

/**
 * The implementation of getMany(), see _get() for why the options
 * object is shared.
 * @private
 */
const _getMany = (data: ObjectType, path: string, defaultVal: any, options: GetOptionsType): any[] => {
	const isDataAnArray = data instanceof Array;
	const pathRoot = options.pathRoot || "";

	if (!isDataAnArray) {
		const innerResult = _get(data, path, defaultVal, options);
		const isInnerResultAnArray = innerResult instanceof Array;

		options.pathData?.directPaths?.push(join(pathRoot, path));
		if (isInnerResultAnArray) return innerResult;

		// _get() only returns undefined when there is no default value
		if (innerResult === undefined) return [];

		return [innerResult];
	}

	const parts = split(path);
	const firstPart = parts[0];
	const firstKey = unEscape(firstPart);
	const pathRemainder = parts.slice(1).join(".");

	const resultArr = data.reduce((innerResult, arrItem, arrIndex) => {
		const itemRoot = join(pathRoot, String(arrIndex));
		const isArrItemAnArray = _isObjectLike(arrItem) && arrItem[firstKey] instanceof Array;

		if (isArrItemAnArray) {
			options.pathRoot = join(itemRoot, firstPart);
			const recurseResult = _getMany(arrItem[firstKey], pathRemainder, defaultVal, options);

			innerResult.push(...recurseResult);
			return innerResult;
		}

		// Reset the root so paths recorded for this item don't include
		// the paths walked while getting data from previous items
		options.pathRoot = itemRoot;

		const val = _get(arrItem, path, defaultVal, options);
		if (val !== undefined) {
			options.pathData?.directPaths?.push(join(itemRoot, path));
			innerResult.push(val);
		}

		return innerResult;
	}, []);

	if (resultArr.length === 0 && defaultVal !== undefined) return [defaultVal];
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
export const getMany = (data: ObjectType, path: string, defaultVal: any | undefined = undefined, options: GetOptionsType | undefined = {}): any[] => {
	return _getMany(data, path, defaultVal, {...options});
};

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
export const set = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): any => {
	const transformKey = options.transformKey || returnWhatWasGiven;

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

	const pathParts = split(clean(path));
	const key = transformKey(unEscape(pathParts.shift() as string));

	// Do not allow prototype pollution
	if (_isUnsafeKey(key)) {
		return obj;
	}

	const newObj = decouple(obj, options);

	if (!pathParts.length) {
		newObj[key] = val;
		return newObj;
	}

	let childPart = newObj[key];

	if (!_isObjectLike(childPart)) {
		// Create the missing path part, an array if the next key is an
		// array index or an object otherwise
		childPart = _isArrayIndex(transformKey(unEscape(pathParts[0]))) ? [] : {};
	}

	newObj[key] = set(childPart, pathParts.join("."), val, options);

	return newObj;
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
} = {}): any => {
	const transformKey = options.transformKey || returnWhatWasGiven;

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

	const pathParts = split(clean(path));
	const key = transformKey(unEscape(pathParts.shift() as string));

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

		const newObj = decouple(obj, options);
		delete newObj[key];

		return newObj;
	}

	const childPart = obj[key];

	if (!_isObjectLike(childPart)) {
		// No child object to traverse, nothing to unset!
		tracking.returnOriginal = true;
		return obj;
	}

	const newChildPart = unSet(childPart, pathParts.join("."), options, tracking);

	if (tracking.returnOriginal) {
		return obj;
	}

	const newObj = decouple(obj, options);
	newObj[key] = newChildPart;

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
 * @param {SetOptionsType} options The options object.
 * @returns {*} The object with the modified data.
 */
export const update = (obj: ObjectType, basePath: string = "", updateData: ObjectType, options: SetOptionsType = {}): any => {
	let newObj = obj;

	for (let path in updateData) {
		if (_hasOwn(updateData, path)) {
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

	const pathParts = split(clean(path));
	const part = pathParts.shift();

	if (!part) {
		// The root is the target array, push the value
		const newArr = decouple(obj, options);

		if (!(newArr instanceof Array)) {
			throw new Error("Cannot push to a path whose leaf node is not an array!");
		}

		newArr.push(val);
		return newArr;
	}

	if (!_isObjectLike(obj)) {
		return obj;
	}

	const key = unEscape(part);

	// Do not allow prototype pollution
	if (_isUnsafeKey(key)) {
		return obj;
	}

	const newObj = decouple(obj, options);
	const childPart = newObj[key];

	if (pathParts.length) {
		// Generate the path part in the object if it does not already exist
		newObj[key] = pushVal(_isObjectLike(childPart) ? childPart : {}, pathParts.join("."), val, options);
	} else {
		// We have found the target array, create it if it doesn't exist
		newObj[key] = pushVal(childPart === undefined ? [] : childPart, "", val, options);
	}

	return newObj;
};

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
export const pullVal = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): ObjectType => {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	}

	const pathParts = split(clean(path));
	const part = pathParts.shift();

	if (!part) {
		// The target array is the root object, pull the value
		if (!(obj instanceof Array)) {
			throw new Error("Cannot pull from a path whose leaf node is not an array!");
		}

		// Find the index of the passed value
		const index = options.strict === false ? obj.findIndex((item) => match(item, val)) : obj.indexOf(val);

		if (index === -1) {
			return obj;
		}

		// Remove the item from the array
		const newArr = decouple(obj, options);
		newArr.splice(index, 1);

		return newArr;
	}

	const key = unEscape(part);

	// Do not allow prototype pollution
	if (_isUnsafeKey(key)) {
		return obj;
	}

	const childPart = obj[key];

	// The path does not exist so there is nothing to pull from
	if (childPart === undefined || (pathParts.length && !_isObjectLike(childPart))) {
		return obj;
	}

	const newChildPart = pullVal(childPart, pathParts.join("."), val, options);

	// Nothing changed or the change was made in place
	if (newChildPart === childPart) {
		return obj;
	}

	const newObj = decouple(obj, options);
	newObj[key] = newChildPart;

	return newObj;
};

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
export const splicePath = (obj: ObjectType, path: string, start: number, deleteCount: number, itemsToAdd: any[] = [], options: SetOptionsType = {}): ObjectType => {
	if (obj === undefined || obj === null || path === undefined) {
		return obj;
	}

	const pathParts = split(clean(path));
	const part = pathParts.shift();

	if (!part) {
		// We've reached our destination leaf node
		if (!(obj instanceof Array)) {
			throw new Error("Cannot splice from a path whose leaf node is not an array!");
		}

		const newArr = decouple(obj, options);
		newArr.splice(start, deleteCount, ...itemsToAdd);

		return newArr;
	}

	const key = unEscape(part);

	// Do not allow prototype pollution
	if (_isUnsafeKey(key)) {
		return obj;
	}

	const childPart = obj[key];

	// The path does not exist so there is nothing to splice
	if (childPart === undefined || (pathParts.length && !_isObjectLike(childPart))) {
		return obj;
	}

	const newObj = decouple(obj, options);
	newObj[key] = splicePath(childPart, pathParts.join("."), start, deleteCount, itemsToAdd, options);

	return newObj;
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
	const transformKey = options.transformKey || wildcardToZero;
	const finalPath: string[] = [];

	// No path string, return the base obj
	if (!path) {
		return "";
	}

	_assertPathIsString(path);

	if (!_isObjectLike(obj)) {
		return "";
	}

	const pathParts = split(clean(path));
	let objPart: any = obj;

	for (let i = 0; i < pathParts.length; i++) {
		const pathPart = pathParts[i];

		// Stop at values that can't be traversed instead of reading from them
		objPart = _isObjectLike(objPart) ? objPart[transformKey(unEscape(pathPart))] : undefined;

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
	const transformKey = options.transformKey || returnWhatWasGiven;
	const pathParts = split(clean(path));
	const currentPath: string[] = [];
	const valueData = {};

	for (let i = 0; i < pathParts.length; i++) {
		currentPath.push(transformKey(pathParts[i]));

		const tmpPath = currentPath.join(".");
		_setOwn(valueData, tmpPath, get(obj, tmpPath));
	}

	return valueData;
};

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
export const flatten = (obj: ObjectType, finalArr: any[] | undefined = [], parentPath: string = "", options: SetOptionsType = {}, objCache: any[] = []): string[] => {
	const transformRead = options.transformRead || returnWhatWasGiven;
	const transformKey = options.transformKey || returnWhatWasGiven;
	const transformedObj = transformRead(obj);

	// Check that this object isn't one of its own ancestors (avoid infinite recursion)
	if (objCache.indexOf(transformedObj) > -1) {
		return finalArr;
	}

	const ancestors = [...objCache, transformedObj];

	for (const i in transformedObj) {
		if (!_hasOwn(transformedObj, i)) continue;

		if (options.ignore && options.ignore.test(i)) {
			continue;
		}

		const pathToChild = join(parentPath, escape(String(transformKey(i))));
		const childObj = transformedObj[i];
		finalArr.push(pathToChild);

		if (_isObjectLike(childObj)) {
			flatten(childObj, finalArr, pathToChild, options, ancestors);
		}
	}

	return finalArr;
};

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
export const flattenValues = (obj: ObjectType, finalObj: object | undefined = {}, parentPath: string | undefined = "", options: OptionsType = {}, objCache: any[] = []): ObjectType => {
	const transformRead = options.transformRead || returnWhatWasGiven;
	const transformKey = options.transformKey || returnWhatWasGiven;
	const transformWrite = options.transformWrite || returnWhatWasGiven;
	const transformedObj = transformRead(obj);

	// Check that this object isn't one of its own ancestors (avoid infinite recursion)
	if (objCache.indexOf(transformedObj) > -1) {
		return finalObj;
	}

	const ancestors = [...objCache, transformedObj];

	const currentPath = (i: string, info: any) => {
		const tKey = escape(String(transformKey(i, info)));
		return parentPath ? parentPath + "." + tKey : tKey;
	};

	for (const i in transformedObj) {
		if (!_hasOwn(transformedObj, i)) continue;

		const value = transformedObj[i];
		const type = typeof value;
		const info = {
			type,
			isArrayIndex: Array.isArray(transformedObj),
			isFlat: type !== "object" || value === null || value instanceof Date || value instanceof RegExp
		};

		const pathKey = currentPath(i, info);

		if (!info.isFlat) {
			flattenValues(value, finalObj, pathKey, options, ancestors);
		} else if (options.leavesOnly) {
			// Found leaf node!
			_setOwn(finalObj, pathKey, transformWrite(value));
		}

		if (!options.leavesOnly) {
			_setOwn(finalObj, pathKey, transformWrite(value));
		}
	}

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

	// Track ancestors so cyclic references are counted as leaf nodes
	// rather than recursed into forever
	const ancestors = [...objCache, obj];

	for (const i in obj) {
		if (!_hasOwn(obj, i) || obj[i] === undefined) continue;

		if (!_isObjectLike(obj[i]) || ancestors.indexOf(obj[i]) > -1) {
			totalKeys++;
		} else {
			totalKeys += countLeafNodes(obj[i], ancestors);
		}
	}

	return totalKeys;
};

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
export const leafNodes = (obj: ObjectType, parentPath: string = "", objCache: any[] = []): any[] => {
	const paths = [];

	// Track ancestors so cyclic references are treated as leaf nodes
	// rather than recursed into forever
	const ancestors = [...objCache, obj];

	for (const i in obj) {
		if (!_hasOwn(obj, i) || obj[i] === undefined) continue;

		const currentPath = join(parentPath, escape(i));

		if (!_isObjectLike(obj[i]) || ancestors.indexOf(obj[i]) > -1) {
			paths.push(currentPath);
		} else {
			paths.push(...leafNodes(obj[i], currentPath, ancestors));
		}
	}

	return paths;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths. Only own properties are considered.
 * MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {boolean} True if the object paths exist.
 */
export const hasMatchingPathsInObject = (testKeys: ObjectType, testObj: ObjectType): boolean => {
	for (const i in testKeys) {
		if (!_hasOwn(testKeys, i)) continue;

		if (!_isObjectLike(testObj) || !_hasOwn(testObj, i) || testObj[i] === undefined) {
			return false;
		}

		// Recurse object
		if (_isObjectLike(testKeys[i]) && !hasMatchingPathsInObject(testKeys[i], testObj[i])) {
			return false;
		}
	}

	return true;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * Only own properties are considered.
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
		if (!_hasOwn(testObj, i)) continue;

		const testKey = _isObjectLike(testKeys) && _hasOwn(testKeys, i) ? testKeys[i] : undefined;

		if (_isObjectLike(testObj[i])) {
			// The test / query object key is an object, recurse
			matchData = countMatchingPathsInObject(testKey, testObj[i]);

			_setOwn(matchedKeys, i, matchData.matchedKeys);
			totalKeyCount += matchData.totalKeyCount;
			matchedKeyCount += matchData.matchedKeyCount;
		} else {
			// The test / query object has a property that is not an object so add it as a key
			totalKeyCount++;

			// Check if the test keys also have this key and it is also not an object
			if (testKey && !_isObjectLike(testKey)) {
				_setOwn(matchedKeys, i, true);
				matchedKeyCount++;
			} else {
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

/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param item The item to get the type of.
 * @returns The string name of the type.
 */
export const type = (item: unknown): ValueType => {
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

	if (sourceType !== "object" || source === null || query === null) {
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
export const findPath = (source: any, query: any, options: FindOptionsType = {
	maxDepth: Infinity,
	currentDepth: 0,
	includeRoot: true
}, parentPath = "", objCache: any[] = []): FindPathReturn => {
	const resultArr = [];

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

	// Don't recurse into an object that is one of its own ancestors (avoid infinite recursion)
	// @ts-ignore
	if (options.currentDepth <= options.maxDepth && _isObjectLike(source) && objCache.indexOf(source) === -1) {
		const ancestors = [...objCache, source];

		for (let key in source) {
			if (_hasOwn(source, key)) {
				const val = source[key];

				// Recurse down object to find more instances
				const result = findPath(val, query, options, join(parentPath, escape(key)), ancestors);

				if (result.match) {
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
export const findOnePath = (source: any, query: any, options: FindOptionsType = {
	maxDepth: Infinity,
	currentDepth: 0,
	includeRoot: true
}, parentPath = "", objCache: any[] = []): FindOnePathReturn => {
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

	// Don't recurse into an object that is one of its own ancestors (avoid infinite recursion)
	// @ts-ignore
	if (options.currentDepth <= options.maxDepth && _isObjectLike(source) && objCache.indexOf(source) === -1) {
		const ancestors = [...objCache, source];

		for (let key in source) {
			if (_hasOwn(source, key)) {
				const val = source[key];

				// Recurse down object to find more instances
				const subPath = join(parentPath, escape(key));
				const result = findOnePath(val, query, options, subPath, ancestors);

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
	return Array.from(new Set(keys));
};

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
const _difference = (val1: unknown, val2: unknown, type1: ValueType, type2: ValueType, strict: boolean): DifferenceType | undefined => {
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
export const diffValues = (obj1: ObjectType, obj2: ObjectType, options: DiffOptionsType = {}, parentPath: string = "", objCache: any[] = []): Record<string, DiffValue> => {
	// Default the various options values without modifying the caller's object
	const basePath = options.basePath || "";
	const strict = options.strict === true;
	const maxDepth = options.maxDepth === undefined ? Infinity : options.maxDepth;
	const exclusive = options.exclusive === true;

	const paths: Record<string, DiffValue> = {};

	if (basePath instanceof Array) {
		// We were given an array of paths, check each path
		basePath.forEach((individualPath) => {
			_assignOwn(paths, diffValues(obj1, obj2, {basePath: individualPath, strict, maxDepth, exclusive}, parentPath, objCache));
		});

		return paths;
	}

	const currentPath = join(parentPath, basePath);
	const val1 = get(obj1, basePath);
	const val2 = get(obj2, basePath);

	// The same value or reference can't contain any differences
	if (val1 === val2) {
		return paths;
	}

	const type1 = type(val1);
	const type2 = type(val2);

	if (type1 !== type2) {
		// Difference in source and comparison types
		const difference = _difference(val1, val2, type1, type2, strict);

		if (difference) {
			_setOwn(paths, currentPath, {val1, val2, type1, type2, difference});
		}
	} else if (type1 === "array" && val1.length !== val2.length) {
		// Difference in source and comparison content
		_setOwn(paths, currentPath, {val1, val2, type1, type2, difference: "value"});
	}

	const pathParts = split(currentPath);
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
		const compositeKeys = exclusive ? val2Keys : keyDedup(val1Keys.concat(val2Keys));

		compositeKeys.forEach((key) => {
			_assignOwn(paths, diffValues(val1, val2, {basePath: escape(key), strict, maxDepth, exclusive}, currentPath, ancestors));
		});

		return paths;
	}

	const difference = _difference(val1, val2, type1, type2, strict);

	if (difference) {
		_setOwn(paths, currentPath, {val1, val2, type1, type2, difference});
	}

	return paths;
};

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
export const diff = (obj1: ObjectType, obj2: ObjectType, options: DiffOptionsType = {}, parentPath: string = "", objCache: any[] = []): Array<string> => {
	return Object.keys(diffValues(obj1, obj2, options, parentPath, objCache));
};

/**
 * Compares two values with strict or non-strict equality.
 * @private
 */
const _isValueEqual = (val1: unknown, val2: unknown, strict: boolean): boolean => {
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
const _isDeepEqual = (val1: any, val2: any, strict: boolean, ancestors: any[]): boolean => {
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

	return keyDedup(Object.keys(val1).concat(Object.keys(val2))).every((key) => {
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
		return _isDeepEqual(val1, val2, strict, []);
	}

	return _isValueEqual(val1, val2, strict);
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
export const pushValImmutable = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): any => {
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
export const pullValImmutable = (obj: ObjectType, path: string, val: any, options: SetOptionsType = {}): any => {
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
		_setOwn(newObj, path, get(obj, path));
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
 * the value from obj2 will be used. Plain objects and arrays are merged recursively,
 * any other value (including Dates and class instances) from obj2 replaces the value
 * in obj1. "__proto__" keys in obj2 are ignored.
 * @param obj1
 * @param obj2
 * @param options
 */
export const merge = (obj1: object, obj2: object, options: MergeOptionsType = {}) => {
	const newObj = decouple(obj1, options);

	if (!_isObjectLike(obj2)) {
		return newObj;
	}

	Object.entries(obj2).forEach(([key, val]) => {
		// Do not allow prototype pollution
		if (_isUnsafeKey(key)) return;
		if (options.ignoreUndefined && val === undefined) return;

		// Only merge into an own value, an inherited one (e.g. "constructor")
		// must never be traversed
		const existing = _hasOwn(newObj, key) ? newObj[key] : undefined;

		if (Array.isArray(val)) {
			newObj[key] = merge(Array.isArray(existing) ? existing : [], val, options);
		} else if (_isPlainObject(val)) {
			newObj[key] = merge(_isPlainObject(existing) ? existing : {}, val, options);
		} else {
			// Non-recursive type
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
};

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
		if (!_hasOwn(query, queryKey)) continue;

		const matchingPaths: string[] = [];
		_setOwn(queryResult, queryKey, matchingPaths);

		const queryOperations = query[queryKey];
		Object.entries(queryOperations).forEach(([operationKey, operationCriteria]) => {
			if (operationKey === "$in") {
				traverse(obj, queryKey, ({purePath, flatPath, value}) => {
					if (flatPath !== queryKey) return true;
					if (!$in(value, operationCriteria)) return true;
					matchingPaths.push(purePath);

					return true;
				});
			}
		});
	}

	return queryResult;
};

/**
 * The function definition for the `traverse()` callback.
 * @param {string} purePath The path including any array indexes
 * like `someObject.someArray.0.someProp`.
 * @param {string} flatPath The path excluding any array indexes
 * like `someObject.someArray.someProp`.
 * @param {any} value The value stored at the `purePath`.
 * @param {string} key The individual property key at which the
 * value exists in its parent. e.g. `someProp`.
 */
export interface OperationFunctionProps {
	purePath: string;
	flatPath: string;
	value: any;
	key: string;
}

/**
 * Reads the key from the value, or returns undefined if the value can't
 * have properties.
 * @private
 */
const _readKey = (value: any, key: string): any => {
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
export const traverse = (obj: ObjectType | undefined | null, path: string | any[], operation: (props: OperationFunctionProps) => boolean, options: GetOptionsType = {}, parentPaths: {
	pure: string;
	flat: string
} = {pure: "", flat: ""}): any => {
	if (path instanceof Array) {
		return path.forEach((individualPath) => {
			traverse(obj, individualPath, operation, options);
		});
	}

	const transformRead = options.transformRead || returnWhatWasGiven;
	const transformKey = options.transformKey || returnWhatWasGiven;
	const transformedObj = transformRead(obj);

	// No path string, return the base obj
	if (!path) {
		return;
	}

	_assertPathIsString(path);

	const internalPath = clean(path);
	const pathParts = split(internalPath);

	const purePath = (key: string) => {
		return join(parentPaths.pure, escape(key));
	};

	const flatPath = (key: string) => {
		return join(parentPaths.flat, escape(key));
	};

	// Path has no dot-notation, return key/value
	if (pathParts.length === 1) {
		const transformedKey = transformKey(unEscape(internalPath), transformedObj);
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
		const transformedKey: string = transformKey(unEscape(pathPart), objPart);

		const purePathToChild = purePath(transformedKey);
		const flatPathToChild = flatPath(transformedKey);

		objPart = _readKey(objPart, transformedKey);
		operation({purePath: purePathToChild, flatPath: flatPathToChild, key: transformedKey, value: objPart});

		if (type(objPart) === "array") {
			for (let arrIndex = 0; arrIndex < objPart.length; arrIndex++) {
				const key = arrIndex.toString();
				operation({
					purePath: join(purePathToChild, key),
					flatPath: flatPathToChild,
					key,
					value: objPart[arrIndex]
				});
				traverse(objPart[arrIndex], down(internalPath, i + 1), operation, options, {
					pure: join(purePathToChild, key),
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
