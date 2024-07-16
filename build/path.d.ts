export type ObjectType = {
    [key: string]: any;
};
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
    wildcardExpansion?: boolean;
    arrayTraversal?: boolean;
    arrayExpansion?: boolean;
    expandedResult?: any[];
    pathData?: PathData;
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
 * Determines if the given path points to a root leaf node (has no delimiter)
 * or contains a dot delimiter so will drill down before reaching a leaf node.
 * If it has a delimiter, it is called a "composite" path.
 * @param {string} path The path to evaluate.
 * @returns {boolean} True if delimiter found, false if not.
 */
export declare const isCompositePath: (path: string) => boolean;
/**
 * Provides the opposite of `isCompositePath()`. If a delimiter is found, this
 * function returns false.
 * @param {string} path The path to evaluate.
 * @returns {boolean} False if delimiter found, true if not.
 */
export declare const isNonCompositePath: (path: string) => boolean;
/**
 * Returns the given path after removing the last
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "foo.bar".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * move up.
 * @returns {string} The new path string.
 */
export declare const up: (path: string, levels?: number) => string;
/**
 * Returns the given path after removing the first
 * leaf from the path. E.g. "foo.bar.thing" becomes
 * "bar.thing".
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * move down.
 * @returns {string} The new path string.
 */
export declare const down: (path: string, levels?: number) => string;
/**
 * Returns the last leaf from the path. E.g.
 * "foo.bar.thing" returns "thing".
 * @param {string} path The path to operate on.
 * @param {number} [levels] The number of levels to
 * pop.
 * @returns {string} The new path string.
 */
export declare const pop: (path: string, levels?: number) => string;
/**
 * Adds a leaf to the end of the path. E.g.
 * pushing "goo" to path "foo.bar.thing" returns
 * "foo.bar.thing.goo".
 * @param {string} path The path to operate on.
 * @param {string} val The string value to push
 * to the end of the path.
 * @returns {string} The new path string.
 */
export declare const push: (path: string, val?: string) => string;
/**
 * Returns the first leaf from the path. E.g.
 * "foo.bar.thing" returns "foo".
 * @param {string} path The path to operate on.
 * @param {number} [levels=1] The number of levels to
 * shift.
 * @returns {string} The new path string.
 */
export declare const shift: (path: string, levels?: number) => string;
/**
 * A function that just returns the first argument.
 * @param {*} val The argument to return.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {*} The passed argument.
 */
export declare const returnWhatWasGiven: (val: any, currentObj: any) => any;
/**
 * Converts any key matching the wildcard to a zero.
 * @param {string} key The key to test.
 * @param {*} [currentObj] The current object hierarchy.
 * @returns {string} The key.
 */
export declare const wildcardToZero: (key: string, currentObj: any) => string;
/**
 * If a key is a number, will return a wildcard, otherwise
 * will return the originally passed key.
 * @param {string} key The key to test.
 * @returns {string} The original key or a wildcard.
 */
export declare const numberToWildcard: (key: string) => string;
/**
 * Removes leading period (.) from string and returns new string.
 * @param {string} str The string to clean.
 * @returns {*} The cleaned string.
 */
export declare const clean: (str: string) => any;
/**
 * Splits a path by period character, taking into account
 * escaped period characters.
 * @param {string} path The path to split into an array.
 * @return {Array<string>} The component parts of the path, split
 * by period character.
 */
export declare const split: (path: string) => Array<string>;
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
export declare const escape: (str: string) => string;
/**
 * Converts a string previously escaped with the `escape()`
 * function back to its original value.
 * @param {string} str The string to unescape.
 * @returns {string} The unescaped string.
 */
export declare const unEscape: (str: string) => string;
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
export declare const get: (obj: ObjectType, path: string | any[], defaultVal?: any | undefined, options?: GetOptionsType) => any;
/**
 * Gets multiple values from the passed arr and given path.
 * @param {ObjectType} data The array or object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {*=} defaultVal Optional default to return if the
 * value retrieved from the given object and path equals undefined.
 * @param {OptionsType} [options] Optional options object.
 * @returns {Array}
 */
export declare const getMany: (data: ObjectType, path: string, defaultVal?: any | undefined, options?: GetOptionsType | undefined) => any[];
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
export declare const set: (obj: ObjectType, path: string, val: any, options?: SetOptionsType) => any;
/**
 * Deletes a key from an object by the given path.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to delete.
 * @param {SetOptionsType} [options] The options object.
 * @param {Object=} tracking Do not use.
 */
export declare const unSet: (obj: ObjectType, path: string, options?: SetOptionsType, tracking?: {
    returnOriginal?: boolean;
}) => any;
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
export declare const update: (obj: ObjectType, basePath: string | undefined, updateData: ObjectType, options?: SetOptionsType) => any;
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
export declare const updateImmutable: (obj: ObjectType, basePath: string | undefined, updateData: ObjectType, options?: SetOptionsType) => any;
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
export declare const decouple: (obj: any, options?: SetOptionsType) => any;
/**
 * Push a value to an array on an object for the specified path.
 * @param {ObjectType} obj The object to update.
 * @param {string} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @param {OptionsType} [options] An options object.
 * @returns {ObjectType} The original object passed in "obj" but with
 * the array at the path specified having the newly pushed value.
 */
export declare const pushVal: (obj: ObjectType, path: string, val: any, options?: SetOptionsType) => ObjectType;
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
export declare const pullVal: (obj: ObjectType, path: string, val: any, options?: SetOptionsType) => ObjectType;
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
export declare const splicePath: (obj: ObjectType, path: string, start: number, deleteCount: number, itemsToAdd?: any[], options?: SetOptionsType) => ObjectType;
/**
 * Given a path and an object, determines the outermost leaf node
 * that can be reached where the leaf value is not undefined.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to retrieve data from.
 * @param {OptionsType} [options] Optional options object.
 * @returns {string} The path to the furthest non-undefined value.
 */
export declare const furthest: (obj: ObjectType, path: string, options?: OptionsType) => string;
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
export declare const values: (obj: ObjectType, path: string, options?: OptionsType) => ObjectType;
/**
 * Takes an object and finds all paths, then returns the paths as an
 * array of strings.
 * @param {ObjectType} obj The object to scan.
 * @param {Array=} finalArr An object used to collect the path keys.
 * (Do not pass this in directly - use undefined).
 * @param {string=} parentPath The path of the parent object. (Do not
 * pass this in directly - use undefined).
 * @param {OptionsType} [options] An options object.
 * @param {any[]} [objCache] Internal, do not use.
 * @returns {Array<string>} An array containing path strings.
 */
export declare const flatten: (obj: ObjectType, finalArr?: any[] | undefined, parentPath?: string | undefined, options?: SetOptionsType, objCache?: never[]) => string[];
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
export declare const flattenValues: (obj: ObjectType, finalObj?: object | undefined, parentPath?: string | undefined, options?: OptionsType, objCache?: never[]) => ObjectType;
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {...string} args args Path to join.
 * @returns {string} A final path string.
 */
export declare const join: (...args: string[]) => string;
/**
 * Joins multiple string arguments into a path string.
 * Ignores blank or undefined path parts and also ensures
 * that each part is escaped so passing "foo.bar" will
 * result in an escaped version.
 * @param {...string} args Path to join.
 * @returns {string} A final path string.
 */
export declare const joinEscaped: (...args: string[]) => string;
/**
 * Counts the total number of key leaf nodes in the passed object.
 * @param {ObjectType} obj The object to count key leaf nodes for.
 * @param {Array=} objCache Do not use. Internal array to track
 * visited leafs.
 * @returns {number} The number of keys.
 */
export declare const countLeafNodes: (obj: ObjectType, objCache?: Array<any> | undefined) => number;
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
export declare const leafNodes: (obj: ObjectType, parentPath?: string, objCache?: any[]) => any[];
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths. MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {boolean} True if the object paths exist.
 */
export declare const hasMatchingPathsInObject: (testKeys: ObjectType, testObj: ObjectType) => boolean;
/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * MAY NOT BE INFINITE RECURSION SAFE.
 * @param {ObjectType} testKeys The object describing the paths to test for.
 * @param {ObjectType} testObj The object to test paths against.
 * @returns {{matchedKeys: ObjectType, matchedKeyCount: number, totalKeyCount: number}} Stats on the matched keys.
 */
export declare const countMatchingPathsInObject: (testKeys: ObjectType, testObj: ObjectType) => {
    matchedKeys: ObjectType;
    matchedKeyCount: number;
    totalKeyCount: number;
};
/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param item The item to get the type of.
 * @returns The string name of the type.
 */
export declare const type: (item: unknown) => "undefined" | "object" | "boolean" | "number" | "string" | "function" | "symbol" | "bigint" | "null" | "array";
/**
 * Determines if the query data exists anywhere inside the source
 * data. Will recurse into arrays and objects to find query.
 * @param {*} source The source data to check.
 * @param {*} query The query data to find.
 * @param {OptionsType} [options] An options object.
 * @returns {boolean} True if query was matched, false if not.
 */
export declare const match: (source: any, query: any, options?: OptionsType) => boolean;
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
export declare const findPath: (source: any, query: any, options?: FindOptionsType, parentPath?: string) => FindPathReturn;
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
export declare const findOnePath: (source: any, query: any, options?: FindOptionsType, parentPath?: string) => FindOnePathReturn;
/**
 * Returns a deduplicated array of strings.
 * @param {string[]} keys An array of strings to deduplicate.
 * @returns {string[]} The deduplicated array.
 */
export declare const keyDedup: (keys: string[]) => string[];
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
export declare const diff: (obj1: ObjectType, obj2: ObjectType, basePath?: string | string[], strict?: boolean, maxDepth?: number, parentPath?: string, objCache?: never[]) => Array<string>;
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
export declare const diffValues: (obj1: ObjectType, obj2: ObjectType, basePath?: string | string[], strict?: boolean, maxDepth?: number, parentPath?: string, objCache?: never[]) => Record<string, DiffValue>;
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
export declare const isEqual: (obj1: any, obj2: any, path: string[] | string, deep?: boolean, strict?: boolean) => boolean;
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
export declare const isNotEqual: (obj1: any, obj2: any, path: string[] | string, deep?: boolean, strict?: boolean) => boolean;
/**
 * Same as set() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export declare const setImmutable: (obj: ObjectType, path: string, val: any, options?: SetOptionsType) => any;
/**
 * Same as pushVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export declare const pushValImmutable: (obj: ObjectType, path: string, val: any, options?: OptionsType) => any;
/**
 * Same as pullVal() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {*} val The value to use for the operation.
 * @param {OptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export declare const pullValImmutable: (obj: ObjectType, path: string, val: any, options?: OptionsType) => any;
/**
 * Same as unSet() but will not change or modify the existing `obj`.
 * References to objects that were not modified remain the same.
 * @param {ObjectType} obj The object to operate on.
 * @param {string} path The path to operate on.
 * @param {SetOptionsType} [options] The options object.
 * @returns {*} The new object with the modified data.
 */
export declare const unSetImmutable: (obj: ObjectType, path: string, options?: SetOptionsType) => any;
/**
 * Gets the values of the paths in pathArr and returns them as an object
 * with each key matching the path and the value matching the value from
 * obj that was at that path.
 * @param {Object} obj The object to operate on.
 * @param {Array<string>} pathArr Array of path strings.
 * @returns {*} The new object.
 */
export declare const distill: (obj: object, pathArr: string[]) => any;
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
export declare const chop: (path: string, level: number) => string;
/**
 * Merges two objects like a "deep spread". If both obj1 and obj2 contain a leaf node
 * the value from obj2 will be used.
 * @param obj1
 * @param obj2
 * @param options
 */
export declare const merge: (obj1: object, obj2: object, options?: MergeOptionsType) => any;
export declare const mergeImmutable: (obj1: object, obj2: object, options?: MergeOptionsType) => any;
export declare const query: (item: object, query: Record<string, QueryMatchFunction | any[]>) => Record<string, string[]>;
