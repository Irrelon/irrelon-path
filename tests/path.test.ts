import assert from "node:assert";
import {
	chop,
	clean,
	countLeafNodes,
	countMatchingPathsInObject,
	decouple,
	diff,
	diffValues,
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
	isCompositePath,
	isEqual,
	isNonCompositePath,
	isNotEqual,
	join,
	joinEscaped,
	keyDedup,
	leafNodes,
	match,
	merge,
	mergeImmutable,
	numberToWildcard,
	ObjectType,
	PathData,
	pop,
	pullVal,
	pullValImmutable,
	push,
	pushVal,
	pushValImmutable,
	query,
	returnWhatWasGiven,
	set,
	setImmutable,
	shift,
	splicePath,
	split,
	traverse,
	type,
	unEscape,
	unSet,
	unSetImmutable,
	up,
	update,
	updateImmutable,
	values,
	wildcardToZero
} from "../src/path";
import {createPrototypeGuard} from "./helpers/prototypeGuard";

const guard = createPrototypeGuard();

afterEach(() => {
	assert.deepStrictEqual(guard.collectAndRestore(), [], "A built-in prototype was modified");
});

// JSON.parse() is the only common way to get an own "__proto__" key,
// object literals set the prototype instead
const json = (str: string) => JSON.parse(str);

class ExampleClass {
	value: number;

	constructor (value: number) {
		this.value = value;
	}

	double () {
		return this.value * 2;
	}
}

describe("Path", () => {
	describe("join()", () => {
		it("Will join multiple paths together", () => {
			const result = join("test1", "test2");
			assert.strictEqual(result, "test1.test2", "Path is correct");
		});

		it("Will ignore blank and undefined path parts", () => {
			assert.strictEqual(join("", "test1", undefined as any, "", "test2"), "test1.test2", "Path is correct");
			assert.strictEqual(join(), "", "Path is correct");
		});
	});

	describe("joinEscape()", () => {
		it("Will join multiple paths together escaped", () => {
			const result = joinEscaped("test1.com", "test2.com");
			assert.strictEqual(result, "test1\\.com.test2\\.com", "Path is correct");
		});

		it("Will escape backslashes so keys round-trip", () => {
			const result = joinEscaped("C:\\temp", "a.b");
			assert.strictEqual(result, "C:\\\\temp.a\\.b", "Path is correct");
			assert.deepStrictEqual(split(result).map(unEscape), ["C:\\temp", "a.b"], "Keys round-trip");
		});
	});

	describe("escape() / unEscape()", () => {
		it("Will escape periods", () => {
			assert.strictEqual(escape("www.google.com"), "www\\.google\\.com", "Escaped correctly");
		});

		it("Will escape backslashes", () => {
			assert.strictEqual(escape("C:\\temp"), "C:\\\\temp", "Escaped correctly");
			assert.strictEqual(escape("a\\"), "a\\\\", "Escaped correctly");
		});

		it("Will unescape periods and backslashes", () => {
			assert.strictEqual(unEscape("www\\.google\\.com"), "www.google.com", "Unescaped correctly");
			assert.strictEqual(unEscape("C:\\\\temp"), "C:\\temp", "Unescaped correctly");
		});

		it("Will leave other backslash sequences untouched", () => {
			assert.strictEqual(unEscape("C:\\temp"), "C:\\temp", "A backslash before a normal character is literal");
		});

		it("Will round-trip any key through escape(), split() and unEscape()", () => {
			const keys = ["plain", "a.b", "a..b", ".a.", "a\\b", "a\\", "\\.", "a\\.b", "a[--]b", "", "\\\\."];

			keys.forEach((key) => {
				const escaped = escape(key);

				assert.strictEqual(split(escaped).length, 1, `"${key}" stays a single path part`);
				assert.strictEqual(unEscape(escaped), key, `"${key}" round-trips`);
			});
		});
	});

	describe("isCompositePath() / isNonCompositePath()", () => {
		it("Will detect paths with an unescaped delimiter", () => {
			assert.strictEqual(isCompositePath("a.b"), true, "Composite");
			assert.strictEqual(isCompositePath(".a"), true, "Composite");
			assert.strictEqual(isCompositePath("a\\\\.b"), true, "An escaped backslash does not escape the period");
			assert.strictEqual(isNonCompositePath("a.b"), false, "Composite");
		});

		it("Will detect paths without an unescaped delimiter", () => {
			assert.strictEqual(isCompositePath("a"), false, "Not composite");
			assert.strictEqual(isCompositePath(""), false, "Not composite");
			assert.strictEqual(isCompositePath("a\\.b"), false, "Escaped period is not a delimiter");
			assert.strictEqual(isNonCompositePath("a\\.b"), true, "Not composite");
		});
	});

	describe("push()", () => {
		it("Will add a leaf to the end of the path", () => {
			assert.strictEqual(push("foo.bar.thing", "goo"), "foo.bar.thing.goo", "Path is correct");
		});

		it("Will not add a delimiter for a blank path or leaf", () => {
			assert.strictEqual(push("", "goo"), "goo", "Path is correct");
			assert.strictEqual(push("foo"), "foo", "Path is correct");
		});
	});

	describe("clean()", () => {
		it("Will remove a leading period", () => {
			assert.strictEqual(clean(".foo.bar.one"), "foo.bar.one", "Path is correct");
		});

		it("Will leave other paths intact", () => {
			assert.strictEqual(clean("foo.bar"), "foo.bar", "Path is correct");
			assert.strictEqual(clean(""), "", "Path is correct");
			assert.strictEqual(clean(undefined as any), undefined, "Path is correct");
		});
	});

	describe("chop()", () => {
		it("Will chop a path down to the given level", () => {
			assert.strictEqual(chop("foo.bar.ram.you.too", 2), "foo.bar", "Path is correct");
		});

		it("Will return a shorter path intact", () => {
			assert.strictEqual(chop("foo.bar", 5), "foo.bar", "Path is correct");
		});

		it("Will keep escaped parts intact", () => {
			assert.strictEqual(chop(`${escape("a.b")}.c`, 1), "a\\.b", "Path is correct");
		});
	});

	describe("returnWhatWasGiven() / wildcardToZero() / numberToWildcard()", () => {
		it("returnWhatWasGiven() returns the first argument", () => {
			const obj = {};
			assert.strictEqual(returnWhatWasGiven(obj, undefined), obj, "Same value returned");
		});

		it("wildcardToZero() converts only the wildcard", () => {
			assert.strictEqual(wildcardToZero("$", undefined), "0", "Wildcard converted");
			assert.strictEqual(wildcardToZero("foo", undefined), "foo", "Other keys untouched");
		});

		it("numberToWildcard() converts only canonical numbers", () => {
			assert.strictEqual(numberToWildcard("12"), "$", "Number converted");
			assert.strictEqual(numberToWildcard("foo"), "foo", "Other keys untouched");
			assert.strictEqual(numberToWildcard("01"), "01", "Non-canonical numbers untouched");
		});
	});

	describe("keyDedup()", () => {
		it("Will remove duplicates and keep the original order", () => {
			assert.deepStrictEqual(keyDedup(["b", "a", "b", "c", "a"]), ["b", "a", "c"], "Deduplicated correctly");
		});
	});

	describe("type()", () => {
		it("Will distinguish arrays, nulls and objects", () => {
			assert.strictEqual(type([]), "array");
			assert.strictEqual(type(null), "null");
			assert.strictEqual(type({}), "object");
			assert.strictEqual(type(undefined), "undefined");
			assert.strictEqual(type("a"), "string");
			assert.strictEqual(type(1), "number");
			assert.strictEqual(type(true), "boolean");
			assert.strictEqual(type(() => true), "function");
			assert.strictEqual(type(Symbol("a")), "symbol");
			assert.strictEqual(type(BigInt(1)), "bigint");
		});
	});

	describe("decouple()", () => {
		it("Will return the same object when not immutable", () => {
			const obj = {foo: true};
			assert.strictEqual(decouple(obj), obj, "Same reference");
		});

		it("Will return a shallow copy of an object or array when immutable", () => {
			const obj = {foo: {bar: true}};
			const arr = [{bar: true}];
			const newObj = decouple(obj, {immutable: true});
			const newArr = decouple(arr, {immutable: true});

			assert.notStrictEqual(newObj, obj, "New object");
			assert.strictEqual(newObj.foo, obj.foo, "Children are shared");
			assert.notStrictEqual(newArr, arr, "New array");
			assert.strictEqual(newArr[0], arr[0], "Children are shared");
		});

		it("Will keep the prototype of class instances", () => {
			const instance = new ExampleClass(2);
			const result = decouple(instance, {immutable: true});

			assert.notStrictEqual(result, instance, "New object");
			assert.strictEqual(result instanceof ExampleClass, true, "Prototype kept");
			assert.strictEqual(result.double(), 4, "Methods work");
		});

		it("Will keep an own __proto__ data key without changing the prototype", () => {
			const result = decouple(json('{"__proto__": {"polluted": true}}'), {immutable: true});

			assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "Prototype unchanged");
			assert.deepStrictEqual(Object.keys(result), ["__proto__"], "Own key kept");
		});

		it("Will copy built-in objects with internal state", () => {
			const date = new Date(1000);
			const regExp = /foo/gi;
			const map = new Map([["a", 1]]);
			const setObj = new Set([1]);

			const newDate = decouple(date, {immutable: true});
			const newRegExp = decouple(regExp, {immutable: true});
			const newMap = decouple(map, {immutable: true});
			const newSet = decouple(setObj, {immutable: true});

			assert.notStrictEqual(newDate, date, "New date");
			assert.strictEqual(newDate.getTime(), 1000, "Date value kept");
			assert.notStrictEqual(newRegExp, regExp, "New RegExp");
			assert.strictEqual(String(newRegExp), "/foo/gi", "RegExp value kept");
			assert.notStrictEqual(newMap, map, "New Map");
			assert.strictEqual(newMap.get("a"), 1, "Map entries kept");
			assert.notStrictEqual(newSet, setObj, "New Set");
			assert.strictEqual(newSet.has(1), true, "Set entries kept");
		});

		it("Will keep holes in sparse arrays", () => {
			const arr: any[] = [];
			arr[2] = "c";

			const result = decouple(arr, {immutable: true});

			assert.strictEqual(result.length, 3, "Length kept");
			assert.strictEqual(0 in result, false, "Hole kept");
			assert.strictEqual(result[2], "c", "Value kept");
		});

		it("Will return primitives and functions as they are", () => {
			const fn = () => true;

			assert.strictEqual(decouple(5, {immutable: true}), 5, "Primitive returned");
			assert.strictEqual(decouple(null, {immutable: true}), null, "Null returned");
			assert.strictEqual(decouple(undefined, {immutable: true}), undefined, "Undefined returned");
			assert.strictEqual(decouple(fn, {immutable: true}), fn, "Function returned");
		});
	});

	describe("values()", () => {
		it("Will traverse the tree and find all values for each part of the path", () => {
			const obj = {
				"obj": [{
					"other": {}
				}]
			};

			const result = values(obj, "obj.0.other.val.another");

			assert.strictEqual(result.obj instanceof Array, true, "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0"], "object", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other"], "object", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other.val"], "undefined", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other.val.another"], "undefined", "The value was retrieved correctly");
		});

		it("Will handle infinite recursive structures", () => {
			const obj: any = {
				"obj": [{
					"other": {}
				}]
			};

			// Create an infinite recursion
			obj.obj[0].other.obj = obj;

			const result = values(obj, "obj.0.other.obj.0.other");

			assert.strictEqual(result.obj instanceof Array, true, "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0"], "object", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other"], "object", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other.val"], "undefined", "The value was retrieved correctly");
			assert.strictEqual(typeof result["obj.0.other.val.another"], "undefined", "The value was retrieved correctly");
		});

		it("Will handle escaped path parts", () => {
			const obj = {"a.b": {c: 1}};
			const result = values(obj, `${escape("a.b")}.c`);

			assert.deepStrictEqual(result, {"a\\.b": {c: 1}, "a\\.b.c": 1}, "The values were retrieved correctly");
		});

		it("Will apply transformKey to each path part", () => {
			const obj = {arr: [{val: 1}]};
			const result = values(obj, "arr.$.val", {transformKey: wildcardToZero});

			assert.deepStrictEqual(Object.keys(result), ["arr", "arr.0", "arr.0.val"], "The paths were transformed");
			assert.strictEqual(result["arr.0.val"], 1, "The value was retrieved correctly");
		});
	});

	describe("countLeafNodes()", () => {
		it("Will count leaf nodes of an object", () => {
			const obj = {
				"obj": [{
					"other": {
						moo: "foo"
					}
				}]
			};

			const result = countLeafNodes(obj);

			assert.strictEqual(result, 1, "The test value is correct");
		});

		it("Will count leaf nodes of an object with infinite recursive structure", () => {
			const obj: any = {
				"obj": [{
					"other": {
						moo: "foo"
					}
				}]
			};

			// Create an infinite recursion
			obj.obj[0].other.obj = obj;

			const result = countLeafNodes(obj);

			assert.strictEqual(result, 2, "The test value is correct");
		});

		it("Will count null value leaf nodes of an object", () => {
			const obj = {
				"obj": [{
					"other": {
						"moo": "foo",
						"bar": null
					}
				}]
			};

			const result = countLeafNodes(obj);

			assert.strictEqual(result, 2, "The test value is correct");
		});

		it("Will match the README example", () => {
			assert.strictEqual(countLeafNodes({"foo": {"bar": null}, "moo": true}), 2, "The test value is correct");
		});

		it("Will count every leaf of an object that is referenced more than once", () => {
			const shared = {x: 1, y: 2};

			assert.strictEqual(countLeafNodes({a: shared, b: shared}), 4, "Shared references are not cycles");
		});

		it("Will ignore undefined values", () => {
			assert.strictEqual(countLeafNodes({a: undefined, b: 1}), 1, "The test value is correct");
			assert.strictEqual(countLeafNodes({}), 0, "The test value is correct");
		});
	});

	describe("flatten()", () => {
		it("Will flatten an object structure to array of keys", () => {
			const obj = {
				"obj": [{
					"other": {
						moo: "foo"
					}
				}]
			};

			const result = flatten(obj);

			assert.ok(result instanceof Array, "The test type is correct");
			assert.strictEqual(result.length, 4, "The array length is correct");
			assert.ok(result.indexOf("obj") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0.other") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0.other.moo") > -1, "The test type is correct");
		});

		it("Will handle an infinite recursive structure", () => {
			const obj: any = {
				"obj": [{
					"other": {
						"moo": "foo"
					}
				}]
			};

			// Create an infinite recursion
			obj.obj[0].other.obj = obj;

			const result = flatten(obj);

			assert.ok(result instanceof Array, "The test type is correct");
			assert.strictEqual(result.length, 5, "The array length is correct");
			assert.ok(result.indexOf("obj") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0.other") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0.other.moo") > -1, "The test type is correct");
			assert.ok(result.indexOf("obj.0.other.obj") > -1, "The test type is correct");
		});

		it("Will flatten every path of an object that is referenced more than once", () => {
			const shared = {x: 1};

			assert.deepStrictEqual(flatten({a: shared, b: shared}), ["a", "a.x", "b", "b.x"], "Shared references are not cycles");
		});

		it("Will escape keys so every path can be used with get()", () => {
			const obj = {"a.b": {"c\\d": 1}};
			const result = flatten(obj);

			assert.deepStrictEqual(result, ["a\\.b", "a\\.b.c\\\\d"], "The paths are escaped");
			assert.strictEqual(get(obj, result[1]), 1, "The path resolves");
		});

		it("Will skip keys matching the ignore option", () => {
			assert.deepStrictEqual(flatten({a: 1, b: {c: 2}}, undefined, undefined, {ignore: /^b$/}), ["a"], "The key was ignored");
		});

		it("Will apply transformKey and a parent path", () => {
			const result = flatten({arr: [{val: 1}]}, [], "root", {transformKey: numberToWildcard});

			assert.deepStrictEqual(result, ["root.arr", "root.arr.$", "root.arr.$.val"], "The paths are correct");
		});

		it("Will treat null as a leaf", () => {
			assert.deepStrictEqual(flatten({a: null}), ["a"], "The paths are correct");
		});
	});

	describe("flattenValues()", () => {
		it("Will flatten an object structure to keys and values", () => {
			const obj = {
				"obj": [{
					"other": {
						"moo": "foo"
					}
				}]
			};

			const result = flattenValues(obj);

			assert.strictEqual(typeof result, "object", "The test type is correct");
			assert.strictEqual(result["obj"] instanceof Array, true, "The test type is correct");
			assert.strictEqual(typeof result["obj.0.other"], "object", "The test type is correct");
			assert.strictEqual(typeof result["obj.0.other.moo"], "string", "The test type is correct");
			assert.strictEqual(result["obj.0.other.moo"], "foo", "The test value is correct");
		});

		it("Will flatten an object structure with custom key transformer", () => {
			const obj = {
				"obj": [{
					"other": {
						"moo": "foo"
					}
				}]
			};

			const result = flattenValues(obj, undefined, "", {
				transformKey: (key, info) => info.isArrayIndex ? "$" : key
			});

			assert.strictEqual(typeof result, "object", "The test type is correct");
			assert.strictEqual(result["obj"] instanceof Array, true, "The test type is correct");
			assert.strictEqual(typeof result["obj.$.other"], "object", "The test type is correct");
			assert.strictEqual(typeof result["obj.$.other.moo"], "string", "The test type is correct");
			assert.strictEqual(result["obj.$.other.moo"], "foo", "The test value is correct");
		});

		it("Will flatten an object structure with custom key transformer", () => {
			const obj = {
				"obj": [{
					"other": {
						"moo": "foo"
					}
				}]
			};

			const expected = {
				"obj.$.other.moo": "foo"
			};

			const result = flattenValues(obj, undefined, "", {
				transformKey: (key, info) => info.isArrayIndex ? "$" : key,
				leavesOnly: true
			});

			assert.deepStrictEqual(result, expected, "The test type is correct");
		});

		it("Will handle an infinite recursive structure", () => {
			const obj: any = {
				"obj": [{
					"other": {
						moo: "foo"
					}
				}]
			};

			// Create an infinite recursion
			obj.obj[0].other.obj = obj;

			const result = flattenValues(obj);

			assert.strictEqual(typeof result, "object", "The test type is correct");
			assert.strictEqual(result["obj"] instanceof Array, true, "The test type is correct");
			assert.strictEqual(typeof result["obj.0.other"], "object", "The test type is correct");
			assert.strictEqual(typeof result["obj.0.other.moo"], "string", "The test type is correct");
			assert.strictEqual(result["obj.0.other.moo"], "foo", "The test value is correct");
			assert.strictEqual(typeof result["obj.0.other.obj"], "object", "The test value is correct");
			assert.strictEqual(typeof result["obj.0.other.obj.0"], "undefined", "The test value is correct");
		});

		it("Will match the README example", () => {
			const result = flattenValues({"profile": {"id": 1, "name": "Ron Swanson"}});

			assert.deepStrictEqual(result, {
				"profile.id": 1,
				"profile.name": "Ron Swanson",
				"profile": {"id": 1, "name": "Ron Swanson"}
			}, "The values are correct");
		});

		it("Will flatten every path of an object that is referenced more than once", () => {
			const shared = {x: 1};
			const result = flattenValues({a: shared, b: shared});

			assert.strictEqual(result["a.x"], 1, "The value is correct");
			assert.strictEqual(result["b.x"], 1, "Shared references are not cycles");
		});

		it("Will escape keys so every path can be used with get()", () => {
			const obj = {"a.b": {c: 1}};
			const result = flattenValues(obj);

			assert.deepStrictEqual(Object.keys(result), ["a\\.b.c", "a\\.b"], "The paths are escaped");
			assert.strictEqual(get(obj, "a\\.b.c"), result["a\\.b.c"], "The path resolves");
		});

		it("Will include null, Date and RegExp leaves when leavesOnly is true", () => {
			const date = new Date(0);
			const regExp = /foo/;
			const result = flattenValues({n: null, d: date, r: regExp, o: {a: 1}}, undefined, "", {leavesOnly: true});

			assert.deepStrictEqual(result, {"n": null, "d": date, "r": regExp, "o.a": 1}, "All leaves are included");
		});

		it("Will apply transformWrite to each value", () => {
			const result = flattenValues({a: 1, b: 2}, {}, "", {transformWrite: (val: number) => val * 10});

			assert.deepStrictEqual(result, {a: 10, b: 20}, "The values were transformed");
		});

		it("Will apply a parent path", () => {
			assert.deepStrictEqual(flattenValues({a: 1}, undefined, "root"), {"root.a": 1}, "The path is correct");
		});
	});

	describe("furthest()", () => {
		it("Will traverse the tree and find the last available leaf", () => {
			const obj = {
				"obj": [{
					"other": {}
				}]
			};

			const result = furthest(obj, "obj.0.other.val.another");
			assert.strictEqual(result, "obj.0.other", "The value was retrieved correctly");
		});

		it("Will accept an array index wildcard", () => {
			const obj = {
				"obj": [{
					"other": {}
				}]
			};

			const result = furthest(obj, "obj.$.other.val.another");
			assert.strictEqual(result, "obj.$.other", "The value was retrieved correctly");
		});

		it("Will work with a single leaf and no dot notation", () => {
			const obj = {
				"name": "Foo"
			};

			const result = furthest(obj, "name");
			assert.strictEqual(result, "name", "The value was retrieved correctly");
		});

		it("Will match the README example", () => {
			const myData = {"profile": {"id": 1, "name": "Ron Swanson"}};
			assert.strictEqual(furthest(myData, "profile.id.bson"), "profile.id", "The value was retrieved correctly");
		});

		it("Will stop at a null value instead of throwing", () => {
			assert.strictEqual(furthest({a: null}, "a.b.c"), "a", "The value was retrieved correctly");
		});

		it("Will stop at a primitive value", () => {
			assert.strictEqual(furthest({a: 5}, "a.b"), "a", "The value was retrieved correctly");
		});

		it("Will resolve escaped keys", () => {
			const obj = {"a.b": {"c.d": 1}};

			assert.strictEqual(furthest(obj, escape("a.b")), "a\\.b", "Single escaped key resolved");
			assert.strictEqual(furthest(obj, `${escape("a.b")}.${escape("c.d")}.e`), "a\\.b.c\\.d", "Nested escaped keys resolved");
		});

		it("Will apply the wildcard to a single key", () => {
			assert.strictEqual(furthest(["foo"], "$"), "$", "The wildcard resolved to index zero");
		});

		it("Will return a blank path when nothing can be reached", () => {
			assert.strictEqual(furthest({}, "a.b"), "", "Nothing reached");
			assert.strictEqual(furthest({}, "a"), "", "Nothing reached");
			assert.strictEqual(furthest({}, ""), "", "No path");
			assert.strictEqual(furthest(null as any, "a"), "", "No object");
			assert.strictEqual(furthest("str" as any, "a"), "", "Not an object");
		});

		it("Will throw if the path is not a string", () => {
			assert.throws(() => furthest({}, 5 as any), /Path argument must be a string/);
		});
	});

	describe("split()", () => {
		it("Will split non-escaped strings correctly", () => {
			const path = "foo.test.bar";
			const result = split(path);

			assert.strictEqual(result.length, 3, "The result length is correct");
			assert.strictEqual(result[0], "foo", "The result is correct");
			assert.strictEqual(result[1], "test", "The result is correct");
			assert.strictEqual(result[2], "bar", "The result is correct");
		});

		it("Will split escaped strings correctly", () => {
			const path = "foo.test@test\\.com";

			const result = split(path);

			assert.strictEqual(result.length, 2, "The result length is correct");
			assert.strictEqual(result[0], "foo", "The result is correct");
			assert.strictEqual(result[1], "test@test\\.com", "The result is correct");
		});

		it("Will split after an escaped backslash", () => {
			assert.deepStrictEqual(split("a\\\\.b"), ["a\\\\", "b"], "The result is correct");
		});

		it("Will not corrupt keys that contain the old placeholder text", () => {
			assert.deepStrictEqual(split("a[--]b.c"), ["a[--]b", "c"], "The result is correct");
		});

		it("Will keep a trailing backslash", () => {
			assert.deepStrictEqual(split("a.b\\"), ["a", "b\\"], "The result is correct");
		});

		it("Will return a single blank part for a blank path", () => {
			assert.deepStrictEqual(split(""), [""], "The result is correct");
		});
	});

	describe("getMany()", () => {
		it("Can get a field value from an object path", () => {
			const obj = {
				"obj": {
					"val": "foo"
				}
			};

			const result = getMany(obj, "obj.val");
			assert.deepStrictEqual(result, ["foo"], "The value was retrieved correctly");
		});

		it("Can get a field value from an array path", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = getMany(obj, "arr.0.val");
			assert.deepStrictEqual(result, ["foo"], "The value was retrieved correctly");
		});

		it("Can return the default value when a path does not exist", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = getMany(obj, "arr.0.nonExistent", "defaultVal");
			assert.deepStrictEqual(result, ["defaultVal"], "The value was retrieved correctly");
		});

		it("Can return the default value when a sub-path does not exist", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = getMany(obj, "arr.3.nonExistent", "defaultVal");
			assert.deepStrictEqual(result, ["defaultVal"], "The value was retrieved correctly");
		});

		it("Will return undefined when the full path is non-existent", () => {
			const obj = {
				"obj": {
					"val": null
				}
			};

			const result = getMany(obj, "obj.val.roo.foo.moo");
			assert.deepStrictEqual(result, [], "The value was retrieved correctly");
		});

		it("Supports escaped paths to get data correctly", () => {
			const obj = {
				"foo": {
					"jim@jones.com": "bar"
				}
			};

			const path = joinEscaped("foo", "jim@jones.com");
			const result = getMany(obj, path);

			assert.deepStrictEqual(result, ["bar"], "The value is correct");
		});

		it("Supports auto-expanding arrays when arrayExpansion is true and root is not an array", () => {
			const obj = {
				"innerObj": {
					"arr": [{
						"thing": "thought"
					}, {
						"otherThing": "otherThought"
					}, {
						"subArr": [{
							"value": "bar"
						}, {
							"value": "ram"
						}]
					}, {
						"subArr": [{
							"value": "you"
						}, {
							"value": undefined
						}]
					}, {
						"subArr": [{
							"value": "too"
						}]
					}]
				}
			};

			const path = "innerObj.arr.subArr.value";
			const result = getMany(obj, path, undefined, {arrayTraversal: true, arrayExpansion: true});

			assert.deepStrictEqual(result, ["bar", "ram", "you", "too"], "The value is correct");
		});

		it("Correctly returns undefined when arrayTraversal is true and leaf nodes produce no result and no default value is provided", () => {
			const obj = {
				"arr": [{
					"someValue": "bar"
				}, {
					"someValue": "ram"
				}, {
					"someValue": "you"
				}]
			};

			const path = "arr.value";
			const result = getMany(obj, path, undefined, {arrayTraversal: true});

			assert.deepStrictEqual(result, [], "The value is correct");
		});

		it("Correctly expands result when a wildcard is used", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all docs in subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr.$";
			const result = getMany(obj, path, undefined, {arrayTraversal: false, wildcardExpansion: true});

			const expected = [{
				"label": "one"
			}, {
				"label": "two"
			}, {
				"label": "three"
			}];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Correctly expands result when a wildcard is used with arrayTraversal enabled and a sub-document positional terminator", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all docs in subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr.$";
			const result = getMany(obj, path, undefined, {arrayTraversal: true, wildcardExpansion: true});

			const expected = [{
				"label": "one"
			}, {
				"label": "two"
			}, {
				"label": "three"
			}];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Correctly expands result when a wildcard is used with arrayTraversal enabled and a non-positional terminator", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr";
			const result = getMany(obj, path, undefined, {arrayTraversal: true, wildcardExpansion: true});

			const expected = [[{
				"label": "one"
			}], [{
				"label": "two"
			}], [{
				"label": "three"
			}]];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Skips null and primitive array items instead of throwing", () => {
			assert.deepStrictEqual(getMany([null, 1, {a: 1}] as any, "a"), [1], "The value is correct");
		});

		it("Handles escaped keys that point to nested arrays", () => {
			const data = [{"x.y": [{v: 1}, {v: 2}]}];

			assert.deepStrictEqual(getMany(data as any, `${escape("x.y")}.v`), [1, 2], "The value is correct");
		});

		it("Returns the default value when an array produces no results", () => {
			assert.deepStrictEqual(getMany([] as any, "a", "defaultVal"), ["defaultVal"], "The value is correct");
		});

		it("Returns the default value for an array item without the key", () => {
			assert.deepStrictEqual(getMany([{}, {a: 1}] as any, "a", "defaultVal"), ["defaultVal", 1], "The value is correct");
		});

		it("Records direct paths for array items", () => {
			const pathData: PathData = {directPaths: []};
			getMany([{a: 1}, {b: 2}, {a: 3}] as any, "a", undefined, {pathData});

			assert.deepStrictEqual(pathData.directPaths, ["0.a", "2.a"], "The paths are correct");
		});

		it("Records direct paths for composite paths", () => {
			const arrayPathData: PathData = {directPaths: []};
			const objectPathData: PathData = {directPaths: []};
			const expansionPathData: PathData = {directPaths: []};

			getMany([{x: {y: 1}}, {x: {y: 2}}] as any, "x.y", undefined, {pathData: arrayPathData});
			getMany({x: {y: 1}}, "x.y", undefined, {pathData: objectPathData});
			get({arr: [{x: {y: 1}}, {x: {y: 2}}]}, "arr.x.y", undefined, {arrayTraversal: true, arrayExpansion: true, pathData: expansionPathData});

			assert.deepStrictEqual(arrayPathData.directPaths, ["0.x.y", "1.x.y"], "The array paths are correct");
			assert.deepStrictEqual(objectPathData.directPaths, ["x.y"], "The object paths are correct");
			assert.deepStrictEqual(expansionPathData.directPaths, ["arr.0.x.y", "arr.1.x.y"], "The expanded paths are correct");
		});

		it("Does not modify the options object passed in", () => {
			const options = {arrayTraversal: true};
			getMany({arr: [{a: 1}]}, "arr.a", undefined, options);

			assert.deepStrictEqual(options, {arrayTraversal: true}, "The options were not modified");
		});
	});

	describe("get()", () => {
		it("Can get a field value from an object path", () => {
			const obj = {
				"obj": {
					"val": "foo"
				}
			};

			const result = get(obj, "obj.val");
			assert.strictEqual(result, "foo", "The value was retrieved correctly");
		});

		it("Can get a field value from an array path", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = get(obj, "arr.0.val");
			assert.strictEqual(result, "foo", "The value was retrieved correctly");
		});

		it("Can return the default value when a path does not exist", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = get(obj, "arr.0.nonExistent", "defaultVal");
			assert.strictEqual(result, "defaultVal", "The value was retrieved correctly");
		});

		it("Can return the default value when a sub-path does not exist", () => {
			const obj = {
				"arr": [{
					"val": "foo"
				}]
			};

			const result = get(obj, "arr.3.nonExistent", "defaultVal");
			assert.strictEqual(result, "defaultVal", "The value was retrieved correctly");
		});

		it("Will return undefined when the full path is non-existent", () => {
			const obj = {
				"obj": {
					"val": null
				}
			};

			const result = get(obj, "obj.val.roo.foo.moo");
			assert.strictEqual(result, undefined, "The value was retrieved correctly");
		});

		it("Supports escaped paths to get data correctly", () => {
			const obj = {
				"foo": {
					"jim@jones.com": "bar"
				}
			};

			const path = joinEscaped("foo", "jim@jones.com");
			const result = get(obj, path);

			assert.strictEqual(result, "bar", "The value is correct");
		});

		it("Supports auto-traversing arrays when arrayTraversal is true", () => {
			const obj = {
				"arr": [{
					"thing": "thought"
				}, {
					"otherThing": "otherThought"
				}, {
					"value": "bar"
				}, {
					"value": "ram"
				}, {
					"value": "you"
				}]
			};

			const path = "arr.value";
			const result = get(obj, path, undefined, {arrayTraversal: true});

			assert.strictEqual(result, "bar", "The value is correct");
		});

		it("Supports auto-expanding arrays when arrayExpansion is true", () => {
			const obj = {
				"arr": [{
					"thing": "thought"
				}, {
					"otherThing": "otherThought"
				}, {
					"value": "bar"
				}, {
					"value": "ram"
				}, {
					"value": "you"
				}, {
					"value": undefined
				}, {
					"value": "too"
				}]
			};

			const path = "arr.value";
			const result = get(obj, path, undefined, {arrayTraversal: true, arrayExpansion: true});

			assert.deepStrictEqual(result, ["bar", "ram", "you", "too"], "The value is correct");
		});

		it("Supports nested auto-expanding arrays when arrayExpansion is true", () => {
			const obj = {
				"arr": [{
					"thing": "thought"
				}, {
					"otherThing": "otherThought"
				}, {
					"subArr": [{
						"value": "bar"
					}, {
						"value": "ram"
					}]
				}, {
					"subArr": [{
						"value": "you"
					}, {
						"value": undefined
					}]
				}, {
					"subArr": [{
						"value": "too"
					}]
				}]
			};

			const path = "arr.subArr.value";
			const result = get(obj, path, undefined, {arrayTraversal: true, arrayExpansion: true});

			assert.deepStrictEqual(result, ["bar", "ram", "you", "too"], "The value is correct");
		});

		it("Correctly returns default value when arrayTraversal is true and leaf nodes produce no result", () => {
			const obj = {
				"arr": [{
					"someValue": "bar"
				}, {
					"someValue": "ram"
				}, {
					"someValue": "you"
				}]
			};

			const path = "arr.value";
			const result = get(obj, path, "myDefaultVal", {arrayTraversal: true});

			assert.strictEqual(result, "myDefaultVal", "The value is correct");
		});

		it("Correctly returns undefined when arrayTraversal is true and leaf nodes produce no result and no default value is provided", () => {
			const obj = {
				"arr": [{
					"someValue": "bar"
				}, {
					"someValue": "ram"
				}, {
					"someValue": "you"
				}]
			};

			const path = "arr.value";
			const result = get(obj, path, undefined, {arrayTraversal: true});

			assert.strictEqual(result, undefined, "The value is correct");
		});

		it("Correctly expands result when a wildcard is used", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all docs in subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr.$";
			const result = get(obj, path, undefined, {arrayTraversal: false, wildcardExpansion: true});

			const expected = [{
				"label": "one"
			}, {
				"label": "two"
			}, {
				"label": "three"
			}];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Correctly expands result when a wildcard is used with arrayTraversal enabled and a sub-document positional terminator", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all docs in subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr.$";
			const result = get(obj, path, undefined, {arrayTraversal: true, wildcardExpansion: true});

			const expected = [{
				"label": "one"
			}, {
				"label": "two"
			}, {
				"label": "three"
			}];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Correctly expands result when a wildcard is used with arrayTraversal enabled and a non-positional terminator", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.$.subArr.$.subSubArr";
			const result = get(obj, path, undefined, {arrayTraversal: true, wildcardExpansion: true});

			const expected = [[{
				"label": "one"
			}], [{
				"label": "two"
			}], [{
				"label": "three"
			}]];

			assert.deepStrictEqual(result, expected, "The value is correct");
		});

		it("Correctly assigns path data when array expansion occurs", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}, {
							"label": "two-point-two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.subArr.subSubArr";
			const pathData: PathData = {
				directPaths: []
			}; // We are passing this in by reference and it will be modified by get()
			const result = get(obj, path, undefined, {arrayTraversal: true, arrayExpansion: true, pathData});

			const expected = [{
				"label": "one"
			}, {
				"label": "two"
			}, {
				"label": "two-point-two"
			}, {
				"label": "three"
			}];

			const pathDataExpected = [
				"arr.0.subArr.0.subSubArr.0",
				"arr.1.subArr.0.subSubArr.0",
				"arr.1.subArr.0.subSubArr.1",
				"arr.2.subArr.0.subSubArr.0"
			];

			assert.deepStrictEqual(result, expected, "The value is correct");
			assert.deepStrictEqual(pathData.directPaths, pathDataExpected, "The value is correct");
		});

		it("Correctly assigns path data when array expansion occurs with a target leaf node", () => {
			const obj = {
				"arr": [{
					"subArr": [{
						"label": "thought",
						"subSubArr": [{
							"label": "one"
						}]
					}]
				}, {
					"subArr": [{
						"label": "is",
						"subSubArr": [{
							"label": "two"
						}, {
							"label": "two-point-two"
						}]
					}]
				}, {
					"subArr": [{
						"label": "good",
						"subSubArr": [{
							"label": "three"
						}]
					}]
				}]
			};

			// Meaning get me all label from all docs in subSubArr from all docs in
			// subArr from all docs in arr
			const path = "arr.subArr.subSubArr.label";
			const pathData: PathData = {
				directPaths: []
			};

			// We are passing this in by reference, and it will be modified by get()
			const result = get(obj, path, undefined, {arrayTraversal: true, arrayExpansion: true, pathData});

			const expected = [
				"one",
				"two",
				"two-point-two",
				"three"
			];

			const pathDataExpected = [
				"arr.0.subArr.0.subSubArr.0.label",
				"arr.1.subArr.0.subSubArr.0.label",
				"arr.1.subArr.0.subSubArr.1.label",
				"arr.2.subArr.0.subSubArr.0.label"
			];

			assert.deepStrictEqual(result, expected, "The value is correct");
			assert.deepStrictEqual(pathData.directPaths, pathDataExpected, "The value is correct");
		});

		it("Will match the README examples", () => {
			assert.strictEqual(get({"foo": null}, "foo"), null, "The value is correct");
			assert.strictEqual(get({"foo": null}, "foo.bar.one", "My Default Value"), "My Default Value", "The value is correct");
			assert.strictEqual(get({"myArr": ["hello", {"bar": "goodbye"}]}, "myArr.1.bar"), "goodbye", "The value is correct");
			assert.strictEqual(get({"users": {"test@test.com": {"name": "My Test User"}}}, `users.${escape("test@test.com")}.name`), "My Test User", "The value is correct");
		});

		it("Will get the value of each path when given an array of paths", () => {
			const obj = {a: 1, b: {c: 2}};

			assert.deepStrictEqual(get(obj, ["a", "b.c", "d"], "default"), [1, 2, "default"], "The values are correct");
		});

		it("Will resolve a single escaped key", () => {
			assert.strictEqual(get({"a.b": 1}, escape("a.b")), 1, "The value is correct");
			assert.strictEqual(get({"C:\\temp": 1}, escape("C:\\temp")), 1, "The value is correct");
		});

		it("Will apply transformKey to a single key", () => {
			assert.strictEqual(get(["foo"] as any, "$", undefined, {transformKey: wildcardToZero}), "foo", "The value is correct");
		});

		it("Will return the same result when the same options object is reused", () => {
			const options = {wildcardExpansion: true};
			const obj = {arr: [{v: 1}, {v: 2}]};

			assert.deepStrictEqual(get(obj, "arr.$.v", undefined, options), [1, 2], "The first result is correct");
			assert.deepStrictEqual(get(obj, "arr.$.v", undefined, options), [1, 2], "The second result is correct");
			assert.deepStrictEqual(options, {wildcardExpansion: true}, "The options were not modified");
		});

		it("Will return the default value when wildcard expansion finds nothing", () => {
			assert.strictEqual(get({arr: []}, "arr.$.v", "default", {wildcardExpansion: true}), "default", "The value is correct");
		});

		it("Will return an array at the end of the path when wildcard expansion is enabled", () => {
			assert.deepStrictEqual(get({a: {arr: [1, 2]}}, "a.arr", undefined, {wildcardExpansion: true}), [1, 2], "The value is correct");
		});

		it("Will return the default value for a missing object", () => {
			assert.strictEqual(get(undefined, "a", "default"), "default", "The value is correct");
			assert.strictEqual(get(null, "a", "default"), "default", "The value is correct");
		});

		it("Will return the object for a blank path", () => {
			const obj = {a: 1};
			assert.strictEqual(get(obj, ""), obj, "The value is correct");
		});

		it("Will return the default value when getting a composite path from a primitive", () => {
			assert.strictEqual(get("foo-im-not-an-object" as any, "some.path", "default"), "default", "The value is correct");
			assert.strictEqual(get("foo-im-not-an-object" as any, "some.path"), undefined, "The value is correct");
		});

		it("Will throw if the path is not a string", () => {
			assert.throws(() => get({}, 5 as any), /Path argument must be a string/);
		});
	});

	describe("set()", () => {
		it("Can set a value on the passed object at the correct path with auto-created objects", () => {
			const obj: any = {};

			const newObj = set(obj, "foo.bar.thing", "foo");

			assert.strictEqual(obj.foo.bar.thing, "foo", "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});

		it("Can set a value on the passed object with an array index at the correct path", () => {
			const obj = {
				"arr": [1]
			};

			const newObj = set(obj, "arr.1", "foo");

			assert.strictEqual(obj.arr[0], 1, "The value was set correctly");
			assert.strictEqual(obj.arr[1], "foo", "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});

		it("Can set a value on the passed object with an array index when no array currently exists at the correct path", () => {
			const obj: any = {};

			const newObj = set(obj, "arr.0", "foo");

			assert.strictEqual(obj.arr[0], "foo", "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});

		it("Can set a value on the passed object where the leaf node is an object", () => {
			const obj: any = {
				"foo": {
					"bar": {
						"ram": {
							original: true
						}
					}
				}
			};

			const newObj = set(obj, "foo.bar.ram", {copy: true});

			assert.strictEqual(obj.foo.bar.ram.copy, true, "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});

		it("Can set a value on the passed object with a single path key", () => {
			const obj = {
				"foo": true
			};

			const newObj = set(obj, "foo", false);

			assert.strictEqual(obj.foo, false, "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});

		it("Supports escaped paths to set data correctly", () => {
			const obj = {
				"foo": true
			};

			const path = joinEscaped("foo", "jim@jones.com");
			const newObj = set(obj, path, false);

			assert.strictEqual(newObj.foo["jim@jones.com"], false, "The value was set correctly");
		});

		it("Handles trying to set a value on a null correctly", () => {
			const obj: any = {
				"foo": null
			};

			set(obj, "foo.bar", true);

			assert.strictEqual(typeof obj.foo, "object", "The value is correct");
			assert.strictEqual(obj.foo.bar, true, "The value is correct");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			set(obj, "__proto__.polluted", true);
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
		});

		it("Will match the README example", () => {
			const obj: any = {"foo": null};
			set(obj, "foo.bar", "hello");

			assert.strictEqual(get(obj, "foo.bar"), "hello", "The value was set correctly");
		});

		it("Will set into an existing escaped key without losing sibling data", () => {
			const obj: any = {"a.b": {c: 1}};
			set(obj, `${escape("a.b")}.d`, 2);

			assert.deepStrictEqual(obj, {"a.b": {c: 1, d: 2}}, "No stray keys and no data loss");
		});

		it("Will create objects for escaped keys in the middle of a path", () => {
			const obj: any = {};
			set(obj, `a.${escape("b.c")}.d`, 1);

			assert.deepStrictEqual(obj, {a: {"b.c": {d: 1}}}, "The value was set correctly");
		});

		it("Will set keys that contain backslashes", () => {
			const obj: any = {};
			set(obj, escape("C:\\temp"), 1);

			assert.deepStrictEqual(obj, {"C:\\temp": 1}, "The value was set correctly");
		});

		it("Will create an object (not an array) for an array item", () => {
			const obj: any = {};
			set(obj, "arr.0.name", "foo");

			assert.deepStrictEqual(obj, {arr: [{name: "foo"}]}, "The array item is an object");
		});

		it("Will create nested arrays for consecutive indexes", () => {
			const obj: any = {};
			set(obj, "arr.0.1", "foo");

			assert.strictEqual(Array.isArray(obj.arr), true, "Outer array was created");
			assert.strictEqual(Array.isArray(obj.arr[0]), true, "Inner array was created");
			assert.strictEqual(obj.arr[0][1], "foo", "The value was set correctly");
		});

		it("Will create objects for keys that are not canonical array indexes", () => {
			const obj: any = {};
			set(obj, "a.-1", "foo");
			set(obj, "b.01", "foo");

			assert.deepStrictEqual(obj, {a: {"-1": "foo"}, b: {"01": "foo"}}, "Objects were created");
		});

		it("Will overwrite a primitive in the middle of a path", () => {
			const obj: any = {a: 5};
			set(obj, "a.b", 1);

			assert.deepStrictEqual(obj, {a: {b: 1}}, "The primitive was replaced");
		});

		it("Will apply transformKey to every key", () => {
			const obj: any = {};
			set(obj, "a.b", 1, {transformKey: (key: string) => key.toUpperCase()});

			assert.deepStrictEqual(obj, {A: {B: 1}}, "The keys were transformed");
		});

		it("Will do nothing for a missing object, blank path or non-object", () => {
			assert.strictEqual(set(undefined as any, "a", 1), undefined, "Missing object");
			assert.strictEqual(set(null as any, "a", 1), undefined, "Null object");
			assert.strictEqual(set({}, "", 1), undefined, "Blank path");
			assert.strictEqual(set("str" as any, "a", 1), undefined, "Non-object");
		});

		it("Will throw if the path is not a string", () => {
			assert.throws(() => set({}, 5 as any, 1), /Path argument must be a string/);
		});
	});

	describe("setImmutable()", () => {
		it("Can de-reference all objects which contain a change (useful for state management systems)", () => {
			const obj = {
				"shouldNotChange1": {},
				"shouldNotChange2": {},
				"shouldChange1": {
					"shouldChange2": {
						"shouldNotChange3": {},
						"shouldChange3": {
							"value": false
						}
					}
				}
			};

			const shouldNotChange1 = obj.shouldNotChange1;
			const shouldNotChange2 = obj.shouldNotChange2;
			const shouldNotChange3 = obj.shouldChange1.shouldChange2.shouldNotChange3;

			const shouldChange1 = obj.shouldChange1;
			const shouldChange2 = obj.shouldChange1.shouldChange2;
			const shouldChange3 = obj.shouldChange1.shouldChange2.shouldChange3;

			const newObj = set(obj, "shouldChange1.shouldChange2.shouldChange3.value", true, {immutable: true});

			assert.notStrictEqual(newObj, obj, "Root object is not the same");

			assert.strictEqual(obj.shouldChange1.shouldChange2.shouldChange3.value, false, "The value of the original object was not changed");
			assert.strictEqual(obj.shouldNotChange1, shouldNotChange1, "Value did not change");
			assert.strictEqual(obj.shouldNotChange2, shouldNotChange2, "Value did not change");
			assert.strictEqual(obj.shouldChange1.shouldChange2.shouldNotChange3, shouldNotChange3, "Value did not change");
			assert.strictEqual(obj.shouldChange1, shouldChange1, "Value did not change");
			assert.strictEqual(obj.shouldChange1.shouldChange2, shouldChange2, "Value did not change");
			assert.strictEqual(obj.shouldChange1.shouldChange2.shouldChange3, shouldChange3, "Value did not change");

			assert.strictEqual(newObj.shouldChange1.shouldChange2.shouldChange3.value, true, "The value of the new object was changed");
			assert.strictEqual(newObj.shouldNotChange1, shouldNotChange1, "Value did not change");
			assert.strictEqual(newObj.shouldNotChange2, shouldNotChange2, "Value did not change");
			assert.strictEqual(newObj.shouldChange1.shouldChange2.shouldNotChange3, shouldNotChange3, "Value did not change");
			assert.notStrictEqual(newObj.shouldChange1, shouldChange1, "Value did not change");
			assert.notStrictEqual(newObj.shouldChange1.shouldChange2, shouldChange2, "Value did not change");
			assert.notStrictEqual(newObj.shouldChange1.shouldChange2.shouldChange3, shouldChange3, "Value did not change");
		});

		it("Can update a value in an object within a nested array", () => {
			const obj = {
				"foo": [{
					"value": false
				}]
			};

			const foo = obj.foo;
			const fooType = type(obj.foo);

			const newObj = set(obj, "foo.0.value", true, {immutable: true});
			const newFooType = type(newObj.foo);

			assert.notStrictEqual(newObj, obj, "Root object is not the same");
			assert.strictEqual(fooType, newFooType, "Array type has not changed");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			setImmutable(obj, "__proto__.polluted", true);
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
		});

		it("Will match the README example", () => {
			const obj = {
				"foo": {"bar": "goodbye", "subBar": {"somethingElse": true}},
				"otherObj": {"enabled": true}
			};

			const newObj = setImmutable(obj, "foo.bar", "hello");

			assert.strictEqual(get(obj, "foo.bar"), "goodbye", "The original was not modified");
			assert.strictEqual(get(newObj, "foo.bar"), "hello", "The new object was modified");
			assert.strictEqual(obj.otherObj, newObj.otherObj, "Unmodified objects are shared");
			assert.notStrictEqual(obj.foo, newObj.foo, "Modified objects are not shared");
			assert.strictEqual(obj.foo.subBar, newObj.foo.subBar, "Unmodified children are shared");
		});

		it("Will keep the prototype of class instances along the path", () => {
			const obj = {item: new ExampleClass(2)};
			const newObj = setImmutable(obj, "item.value", 5);

			assert.strictEqual(newObj.item instanceof ExampleClass, true, "Prototype kept");
			assert.strictEqual(newObj.item.double(), 10, "Methods work on the new value");
			assert.strictEqual(obj.item.value, 2, "The original was not modified");
		});

		it("Will keep Dates and Maps along the path", () => {
			const obj = {date: new Date(1000), map: new Map([["a", 1]])};
			const newObj = setImmutable(setImmutable(obj, "date.note", "x"), "map.note", "y");

			assert.strictEqual(newObj.date instanceof Date, true, "Date kept");
			assert.strictEqual(newObj.date.getTime(), 1000, "Date value kept");
			assert.strictEqual(newObj.date.note, "x", "Value was set");
			assert.strictEqual(newObj.map.get("a"), 1, "Map entries kept");
			assert.strictEqual((obj.date as any).note, undefined, "The original was not modified");
		});

		it("Will not mutate the original when setting into an escaped key", () => {
			const obj = {"a.b": {c: 1}};
			const newObj = setImmutable(obj, `${escape("a.b")}.d`, 2);

			assert.deepStrictEqual(obj, {"a.b": {c: 1}}, "The original was not modified");
			assert.deepStrictEqual(newObj, {"a.b": {c: 1, d: 2}}, "The new object was modified");
		});
	});

	describe("unSet()", () => {
		describe("Mutable", () => {
			it("Will remove the required key from an object", () => {
				const obj = {
					"foo": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}]
					}
				};

				assert.strictEqual(obj.foo.bar[0].baa, "ram you", "Object has value");

				const newObj = unSet(obj, "foo.bar.0.baa");

				assert.strictEqual(obj.foo.bar[0].baa, undefined, "Object does not have value");
				assert.strictEqual(obj.foo.bar[0].hasOwnProperty("baa"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same");
			});

			it("Will correctly handle a path to nowhere", () => {
				const obj = {
					"foo": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}]
					}
				};

				const newObj = unSet(obj, "foo.bar.2.baa");

				assert.strictEqual(obj.foo.bar.hasOwnProperty("2"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same");
			});

			it("Is not vulnerable to __proto__ pollution", () => {
				const obj: any = {};
				obj.__proto__.unsetPolluted = false;

				try {
					unSet(obj, "__proto__.unsetPolluted");
					assert.strictEqual(obj.unsetPolluted, false, "The object prototype cannot be polluted");
				} finally {
					delete obj.__proto__.unsetPolluted;
				}
			});
		});

		describe("Immutable", () => {
			it("Will remove the required key from an object", () => {
				const obj = {
					"foo": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}, {
							"two": {},
							"three": []
						}]
					}
				};

				assert.strictEqual(obj.foo.bar[0].baa, "ram you", "Object has value");

				const newObj = unSet(obj, "foo.bar.0.baa", {immutable: true});

				// Check existing object is unchanged
				assert.strictEqual(obj.foo.bar[0].baa, "ram you", "Data integrity");
				assert.notStrictEqual(newObj, obj, "Root object should be different");
				assert.notStrictEqual(newObj.foo, obj.foo, "foo object should be different");
				assert.notStrictEqual(newObj.foo.bar, obj.foo.bar, "foo.bar object should be different");
				assert.notStrictEqual(newObj.foo.bar[0], obj.foo.bar[0], "foo.bar[0] object should be different");

				// Check new object is changed
				assert.strictEqual(newObj.foo.bar[0].baa, undefined, "Object does not have value");
				assert.strictEqual(newObj.foo.bar[0].hasOwnProperty("baa"), false, "Object does not have key");

				// Check that new and old object do not share references to changed data
				assert.notStrictEqual(newObj, obj, "Root object should be different");
				assert.notStrictEqual(newObj.foo, obj.foo, "foo object should be different");
				assert.notStrictEqual(newObj.foo.bar, obj.foo.bar, "foo.bar object should be different");
				assert.notStrictEqual(newObj.foo.bar[0], obj.foo.bar[0], "foo.bar[0] object should be different");

				// Check that new and old object share references to unchanged data
				assert.strictEqual(newObj.foo.bar[1], obj.foo.bar[1], "foo.bar[1] object should be same");
			});

			it("Will correctly handle a path to nowhere", () => {
				const obj = {
					"foo": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}]
					}
				};

				const newObj = unSet(obj, "foo.bar.2.baa", {immutable: true});

				assert.strictEqual(obj.foo.bar.hasOwnProperty("2"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same because nothing changed");
			});

			it("Is not vulnerable to __proto__ pollution", () => {
				const obj: any = {};
				obj.__proto__.unsetPolluted = false;

				try {
					unSetImmutable(obj, "__proto__.unsetPolluted");
					assert.strictEqual(obj.unsetPolluted, false, "The object prototype cannot be polluted");
				} finally {
					delete obj.__proto__.unsetPolluted;
				}
			});
		});

		describe("Escape at root", () => {
			it("Will remove the required key from an object", () => {
				const obj = {
					"foo@foo.com": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}]
					}
				};

				assert.strictEqual(obj["foo@foo.com"].bar[0].baa, "ram you", "Object has value");

				const newObj = unSet(obj, `${escape("foo@foo.com")}.bar.0.baa`);

				assert.strictEqual(obj["foo@foo.com"].bar[0].baa, undefined, "Object does not have value");
				assert.strictEqual(obj["foo@foo.com"].bar[0].hasOwnProperty("baa"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same");
			});

			it("Will correctly handle a path to nowhere", () => {
				const obj = {
					"foo@foo.com": {
						"bar": [{
							"moo": true,
							"baa": "ram you"
						}]
					}
				};

				const newObj = unSet(obj, `${escape("foo@foo.com")}.bar.2.baa`);

				assert.strictEqual(obj["foo@foo.com"].bar.hasOwnProperty("2"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same");
			});
		});

		describe("Escape in child", () => {
			it("Will remove the required key from an object", () => {
				const obj = {
					"foo": {
						"bar": [{
							"moo": true,
							"baa@foo.com": "ram you"
						}]
					}
				};

				assert.strictEqual(obj.foo.bar[0]["baa@foo.com"], "ram you", "Object has value");

				const newObj = unSet(obj, `foo.bar.0.${escape("baa@foo.com")}`);

				assert.strictEqual(obj.foo.bar[0]["baa@foo.com"], undefined, "Object does not have value");
				assert.strictEqual(obj.foo.bar[0].hasOwnProperty("baa@foo.com"), false, "Object does not have key");
				assert.strictEqual(newObj, obj, "Root object is the same");
			});
		});

		describe("Edge cases", () => {
			it("Will not modify a primitive in the middle of the path", () => {
				const obj = {a: "hello"};
				const result = unSet(obj, "a.b");
				const immutableResult = unSetImmutable(obj, "a.b");

				assert.deepStrictEqual(obj, {a: "hello"}, "The primitive was not removed");
				assert.strictEqual(result, obj, "The original object is returned");
				assert.strictEqual(immutableResult, obj, "Nothing changed so the original is returned");
			});

			it("Will not modify a null in the middle of the path", () => {
				const obj = {a: null};
				unSet(obj, "a.b");

				assert.deepStrictEqual(obj, {a: null}, "The null was not removed");
			});

			it("Will return the original when a root key does not exist", () => {
				const obj = {a: 1};

				assert.strictEqual(unSetImmutable(obj, "b"), obj, "Nothing changed so the original is returned");
			});

			it("Will not delete inherited properties", () => {
				const obj = {};

				assert.strictEqual(unSet(obj, "toString"), obj, "The original object is returned");
				assert.strictEqual(typeof Object.prototype.toString, "function", "The inherited property still exists");
			});

			it("Will use the transformed key for both the check and the delete", () => {
				const upper = (key: string) => key.toUpperCase();

				assert.deepStrictEqual(unSet({A: 1, B: 2}, "a", {transformKey: upper}), {B: 2}, "Root key removed");
				assert.deepStrictEqual(unSet({A: {B: 1, C: 2}}, "a.b", {transformKey: upper}), {A: {C: 2}}, "Nested key removed");
			});

			it("Will remove keys that contain backslashes", () => {
				const obj = {"C:\\temp": 1, b: 2};

				assert.deepStrictEqual(unSet(obj, escape("C:\\temp")), {b: 2}, "The key was removed");
			});

			it("Will do nothing for a missing object, blank path or non-object", () => {
				assert.strictEqual(unSet(undefined as any, "a"), undefined, "Missing object");
				assert.strictEqual(unSet(null as any, "a"), undefined, "Null object");
				assert.strictEqual(unSet({}, ""), undefined, "Blank path");
				assert.strictEqual(unSet("str" as any, "a"), undefined, "Non-object");
			});

			it("Will throw if the path is not a string", () => {
				assert.throws(() => unSet({}, 5 as any), /Path argument must be a string/);
			});
		});
	});

	describe("match()", () => {
		describe("Positive tests", () => {
			it("Will return true for matching string", () => {
				const result = match("Bookshop1", "Bookshop1");

				assert.strictEqual(result, true);
			});

			it("Will return true for matching two objects with a matching query", () => {
				const result = match({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop1"}});

				assert.strictEqual(result, true);
			});

			it("Will return true for matching two objects with a matching query and extended source", () => {
				const result = match({test: "Bookshop1", foo: true}, {test: "Bookshop1"});

				assert.strictEqual(result, true);
			});

			it("Will match multiple keys and values", () => {
				const result = match({test: "Bookshop1", foo: true}, {test: "Bookshop1", foo: true});

				assert.strictEqual(result, true);
			});
		});

		describe("Negative tests", () => {
			it("Will return false for non-matching string", () => {
				const result = match("Bookshop1", "Bookshop2");

				assert.strictEqual(result, false);
			});

			it("Will return false for matching two objects with a matching query", () => {
				const result = match({test: "Bookshop1"}, {test: "Bookshop2"});

				assert.strictEqual(result, false);
			});

			it("Will return false for matching two objects with a matching query and extended source", () => {
				const result = match({test: "Bookshop1", foo: true}, {test: "Bookshop2"});

				assert.strictEqual(result, false);
			});

			it("Will match multiple keys and values", () => {
				const result = match({test: "Bookshop1", foo: true}, {test: "Bookshop1", foo: false});

				assert.strictEqual(result, false);
			});
		});
	});

	describe("match() edge cases", () => {
		it("Will return false instead of throwing when the query is null", () => {
			assert.strictEqual(match({a: 1}, null), false);
		});

		it("Will compare nulls", () => {
			assert.strictEqual(match(null, {a: 1}), false);
			assert.strictEqual(match(null, null), true);
		});

		it("Will match nested partial structures", () => {
			assert.strictEqual(match({a: {b: 1, c: 2}}, {a: {b: 1}}), true);
			assert.strictEqual(match({a: {b: 1}}, {a: {b: 2}}), false);
			assert.strictEqual(match({a: 1}, {a: {b: 1}}), false);
		});

		it("Will match arrays by index", () => {
			assert.strictEqual(match([1, 2, 3], [1, 2]), true);
			assert.strictEqual(match([1, 2, 3], [2]), false);
		});
	});

	describe("findPath()", () => {
		describe("Edge cases", () => {
			it("Will match the README example", () => {
				const myData = {"profile": {"id": 1, "name": "Ron Swanson", "data": {"mobile": "+001293284732"}}};

				assert.deepStrictEqual(findPath(myData, {data: {"mobile": "+001293284732"}}), {match: true, path: ["profile"]});
			});

			it("Will not overflow the stack on cyclic structures", () => {
				const obj: any = {value: 1};
				obj.self = obj;

				assert.deepStrictEqual(findPath(obj, 1), {match: true, path: ["value"]});
			});

			it("Will find every path to an object that is referenced more than once", () => {
				const shared = {value: 1};

				assert.deepStrictEqual(findPath({a: shared, b: shared}, 1), {match: true, path: ["a.value", "b.value"]});
			});

			it("Will escape keys in the returned paths", () => {
				const obj = {"a.b": {c: 1}};
				const result = findPath(obj, {c: 1});

				assert.deepStrictEqual(result, {match: true, path: ["a\\.b"]});
				assert.strictEqual(get(obj, result.path[0]), obj["a.b"], "The path resolves");
			});

			it("Will respect maxDepth and includeRoot", () => {
				const obj = {a: {b: {c: 1}}};

				assert.deepStrictEqual(findPath(obj, 1, {maxDepth: 2}), {match: false, path: []});
				assert.deepStrictEqual(findPath(obj, 1, {maxDepth: 3}), {match: true, path: ["a.b.c"]});
				assert.deepStrictEqual(findPath("foo", "foo", {includeRoot: false}), {match: false, path: []});
			});

			it("Will handle null sources", () => {
				assert.deepStrictEqual(findPath(null, null), {match: true, path: [""]});
				assert.deepStrictEqual(findPath({a: null}, 1), {match: false, path: []});
			});
		});

		describe("Positive tests", () => {
			it("Will return the correct path for a root string", () => {
				const result: any = findPath("Bookshop1", "Bookshop1");

				assert.deepEqual(result.path, [""]);
			});

			it("Will return the correct path for an object nested string", () => {
				const result = findPath([{"_id": "Bookshop1"}], "Bookshop1");

				assert.deepEqual(result.path, ["0._id"]);
			});

			it("Will return the correct path for a nested equal object", () => {
				const result = findPath({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop1"}});

				assert.deepEqual(result.path, [""]);
			});

			it("Will return the correct path for an array nested string", () => {
				const result = findPath([{"_id": "Bookshop1"}], {"_id": "Bookshop1"});

				assert.deepEqual(result.path, ["0"]);
			});

			it("Will return the correct path for a single-level nested string", () => {
				const result = findPath({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop1"});

				assert.deepEqual(result.path, ["profile"]);
			});

			it("Will return the correct path for a complex nested string", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"],
						"show": true
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"],
						"show": true
					}]
				};

				const result = findPath(testObj, {"show": true});

				assert.deepEqual(result.path, ["items.0", "items.1"]);
			});

			it("Will return the correct path for a complex nested object", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findPath(testObj, {_id: 2});

				assert.deepEqual(result.path, ["items.1"]);
			});

			it("Will return the correct path/s for very complex objects", () => {
				const data = {
					"_id": "3310a727ba01440",
					"label": "Project 1",
					"type": "project",
					"category": "root",
					"acceptsCategory": [
						"object",
						"boolean"
					],
					"isExpanded": true,
					"isEnabled": true,
					"isSelected": false,
					"isHovered": false,
					"data": {},
					"items": [
						{
							"_id": "pagesFolder",
							"label": "Pages",
							"type": "folder",
							"category": "folder",
							"acceptsCategory": [
								"page"
							],
							"isExpanded": true,
							"isEnabled": true,
							"isSelected": false,
							"isHovered": false,
							"isSelectable": false,
							"data": {},
							"items": [
								{
									"_id": "page1",
									"label": "Page 1",
									"type": "page",
									"category": "component",
									"acceptsCategory": [
										"layout"
									],
									"isExpanded": true,
									"isEnabled": true,
									"isSelected": false,
									"isHovered": false,
									"data": {
										"schema": {
											"selectedItem": {
												"type": "Object",
												"required": false
											},
											"hoveredItem": {
												"type": "Object",
												"required": false
											},
											"currentTool": {
												"type": "String",
												"required": false,
												"default": "select"
											},
											"lang": {
												"type": "String",
												"required": false,
												"default": "en"
											},
											"user": {
												"type": "Object",
												"required": false,
												"default": {}
											}
										},
										"stateToProps": {
											"pipeline": [
												{
													"sessionState": {
														"type": "globalState",
														"fromId": "session",
														"fromMethod": "get"
													},
													"setSessionState": {
														"type": "globalState",
														"fromId": "session",
														"fromMethod": "set"
													}
												},
												{
													"lang": {
														"type": "pipelineFunction",
														"function": {
															"type": "Program",
															"ast": true
														}
													}
												}
											]
										}
									},
									"items": [
										{
											"_id": "37df5e624ad4800",
											"label": "Layer",
											"isEditing": false,
											"type": "layer",
											"category": "layout",
											"acceptsCategory": [
												"layout"
											],
											"isExpanded": true,
											"isEnabled": true,
											"isSelected": false,
											"isHovered": false,
											"data": {
												"display": {
													"type": "flex"
												},
												"position": {
													"type": "none",
													"left": 0,
													"top": 0,
													"right": 0,
													"bottom": 0
												},
												"flex": {
													"direction": "row",
													"flexGrow": 1,
													"flexShrink": 1,
													"flexBasis": 0,
													"flexBasisUnit": "px"
												},
												"isPureLayout": false
											},
											"items": [
												{
													"_id": "292a82d000fdb60",
													"label": "Layer",
													"isEditing": false,
													"type": "layer",
													"category": "layout",
													"acceptsCategory": [
														"layout"
													],
													"isExpanded": true,
													"isEnabled": true,
													"isSelected": false,
													"isHovered": true,
													"data": {
														"display": {
															"type": "flex"
														},
														"position": {
															"type": "none",
															"left": 0,
															"top": 0,
															"right": 0,
															"bottom": 0
														},
														"flex": {
															"direction": "column",
															"flexGrow": 1,
															"flexShrink": 1,
															"flexBasis": 0,
															"flexBasisUnit": "px"
														},
														"isPureLayout": false
													},
													"items": []
												},
												{
													"_id": "22f4f59e9045740",
													"label": "Layer",
													"isEditing": false,
													"type": "layer",
													"category": "layout",
													"acceptsCategory": [
														"layout"
													],
													"isExpanded": true,
													"isEnabled": true,
													"isSelected": false,
													"isHovered": false,
													"data": {
														"display": {
															"type": "flex"
														},
														"position": {
															"type": "none",
															"left": 0,
															"top": 0,
															"right": 0,
															"bottom": 0
														},
														"flex": {
															"direction": "column",
															"flexGrow": 1,
															"flexShrink": 1,
															"flexBasis": 0,
															"flexBasisUnit": "px"
														},
														"isPureLayout": false
													},
													"items": [
														{
															"_id": "375a0c74c911ce0",
															"label": "Layer",
															"isEditing": false,
															"type": "layer",
															"category": "layout",
															"acceptsCategory": [
																"layout"
															],
															"isExpanded": true,
															"isEnabled": true,
															"isSelected": false,
															"isHovered": false,
															"data": {
																"display": {
																	"type": "flex"
																},
																"position": {
																	"type": "none",
																	"left": 0,
																	"top": 0,
																	"right": 0,
																	"bottom": 0
																},
																"flex": {
																	"direction": "row",
																	"grow": 1,
																	"shrink": 1,
																	"basis": 0,
																	"basisUnit": "px"
																},
																"isPureLayout": false
															},
															"items": [
																{
																	"_id": "396c2e9b36f31a0",
																	"label": "CrumbBar",
																	"isEditing": false,
																	"type": "component",
																	"component": "CrumbBar",
																	"category": "component",
																	"acceptsCategory": [],
																	"acceptsChildren": false,
																	"isExpanded": true,
																	"isEnabled": true,
																	"isSelected": false,
																	"isHovered": false,
																	"data": {
																		"display": {
																			"type": "flex"
																		},
																		"position": {
																			"type": "none",
																			"left": 0,
																			"top": 0,
																			"right": 0,
																			"bottom": 0
																		},
																		"flex": {
																			"direction": "row",
																			"grow": 1,
																			"shrink": 1,
																			"basis": 0,
																			"basisUnit": "px"
																		},
																		"isPureLayout": false,
																		"props": {}
																	},
																	"items": []
																}
															]
														}
													]
												}
											]
										}
									]
								}
							]
						},
						{
							"_id": "stateFolder",
							"label": "State",
							"type": "folder",
							"category": "folder",
							"acceptsCategory": [
								"state"
							],
							"isExpanded": true,
							"isEnabled": true,
							"isSelected": false,
							"isHovered": true,
							"isSelectable": false,
							"data": {},
							"items": [
								{
									"_id": "user",
									"label": "User State",
									"type": "globalState",
									"category": "state",
									"acceptsCategory": [],
									"isExpanded": true,
									"isEnabled": true,
									"isSelected": false,
									"isHovered": true,
									"data": {
										"schema": {
											"firstName": {
												"type": "String",
												"required": true
											},
											"lastName": {
												"type": "String",
												"required": true
											},
											"email": {
												"type": "String",
												"required": true
											},
											"dob": {
												"type": "Date",
												"required": false
											}
										},
										"initialState": {}
									}
								},
								{
									"_id": "ui",
									"label": "UI State",
									"type": "globalState",
									"category": "state",
									"acceptsCategory": [],
									"isExpanded": true,
									"isEnabled": true,
									"isSelected": false,
									"isHovered": true,
									"data": {
										"schema": {
											"selectedItemId": {
												"type": "String",
												"default": ""
											},
											"hoveredItemId": {
												"type": "String",
												"default": ""
											},
											"currentTool": {
												"type": "String",
												"default": "select"
											}
										},
										"initialState": {}
									}
								},
								{
									"_id": "lang",
									"label": "Language State",
									"type": "globalState",
									"category": "state",
									"acceptsCategory": [],
									"isExpanded": true,
									"isEnabled": true,
									"isSelected": false,
									"isHovered": true,
									"data": {
										"schema": {
											"lang": {
												"type": "String",
												"default": "en"
											},
											"available": {
												"type": "Array",
												"elementType": {
													"_id": {
														"type": "String",
														"required": true
													},
													"label": {
														"type": "String",
														"required": true
													},
													"enabled": {
														"type": "Boolean",
														"required": true
													}
												}
											}
										},
										"initialState": {
											"lang": "en",
											"available": [
												{
													"_id": "en",
													"label": "English",
													"enabled": true
												}
											]
										}
									}
								}
							]
						},
						{
							"_id": "servicesFolder",
							"label": "Services",
							"type": "folder",
							"category": "folder",
							"acceptsCategory": [
								"service"
							],
							"isExpanded": true,
							"isEnabled": true,
							"isSelected": false,
							"isHovered": true,
							"isSelectable": false,
							"data": {},
							"items": [
								{
									"_id": "utils.js",
									"label": "utils.js",
									"type": "file",
									"category": "service",
									"middleTabId": "codeEditor",
									"isExpanded": true,
									"isEnabled": true,
									"isSelected": false,
									"isHovered": true,
									"isSelectable": false,
									"data": {
										"content": {}
									}
								}
							]
						}
					]
				};

				const result = findPath(data, {"isHovered": true});

				assert.deepEqual(result.path, [
					"items.0.items.0.items.0.items.0",
					"items.1",
					"items.1.items.0",
					"items.1.items.1",
					"items.1.items.2",
					"items.2",
					"items.2.items.0"
				]);
			});
		});

		describe("Negative tests", () => {
			it("Will return the correct path for a root string", () => {
				const result = findPath("Bookshop1", "Bookshop2");

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for non-matching a nested equal object", () => {
				const result = findPath({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop2"}});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for an array nested string", () => {
				const result = findPath([{"_id": "Bookshop1"}], {"_id": "Bookshop2"});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a single-level nested string", () => {
				const result = findPath({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop2"});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a complex nested string", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findPath(testObj, "Bookshop3");

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a complex nested object", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findPath(testObj, {_id: 3});

				assert.strictEqual(result.match, false);
			});
		});
	});

	describe("findOnePath()", () => {
		describe("Edge cases", () => {
			it("Will match the README examples", () => {
				const myDataArray = [{
					"profile": {"id": 1, "name": "Ron Swanson"}
				}, {
					"profile": {"id": 2, "name": "April Ludgate"}
				}];

				assert.deepStrictEqual(findOnePath(myDataArray, {profile: {id: 1}}), {match: true, path: "0"});
				assert.deepStrictEqual(findOnePath(myDataArray, {id: 2}), {match: true, path: "1.profile"});
			});

			it("Will not overflow the stack on cyclic structures", () => {
				const obj: any = {value: 1};
				obj.self = obj;

				assert.deepStrictEqual(findOnePath(obj, 2), {match: false});
				assert.deepStrictEqual(findOnePath(obj, 1), {match: true, path: "value"});
			});

			it("Will escape keys in the returned path", () => {
				assert.deepStrictEqual(findOnePath({"a.b": {c: 1}}, 1), {match: true, path: "a\\.b.c"});
			});

			it("Will respect maxDepth and includeRoot", () => {
				assert.deepStrictEqual(findOnePath({a: {b: 1}}, 1, {maxDepth: 1}), {match: false});
				assert.deepStrictEqual(findOnePath("foo", "foo", {includeRoot: false}), {match: false});
			});
		});

		describe("Positive tests", () => {
			it("Will return the correct path for a root string", () => {
				const result = findOnePath("Bookshop1", "Bookshop1");

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "");
			});

			it("Will return the correct path for a root true boolean", () => {
				const result = findOnePath(true, true);

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "");
			});

			it("Will return the correct path for a root false boolean", () => {
				const result = findOnePath(false, false);

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "");
			});

			it("Will return the correct path for an object nested true boolean", () => {
				const result = findOnePath([{"_id": {"1": true, "2": false}}], true);

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "0._id.1");
			});

			it("Will return the correct path for an object nested string", () => {
				const result = findOnePath([{"_id": "Bookshop1"}], "Bookshop1");

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "0._id");
			});

			it("Will return the correct path for a nested equal object", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop1"}});

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "");
			});

			it("Will return the correct path for an array nested string", () => {
				const result = findOnePath([{"_id": "Bookshop1"}], {"_id": "Bookshop1"});

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "0");
			});

			it("Will return the correct path for a single-level nested string", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop1"});

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "profile");
			});

			it("Will return the correct path for a complex nested string", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findOnePath(testObj, "Bookshop1");

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "items.0.stockedBy.0");
			});

			it("Will return the correct path for a complex nested object", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findOnePath(testObj, {_id: 2});

				assert.strictEqual(result.match, true);
				assert.strictEqual(result.path, "items.1");
			});
		});

		describe("Negative tests", () => {
			it("Will return the correct path for a root string", () => {
				const result = findOnePath("Bookshop1", "Bookshop2");

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for non-matching a nested equal object", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop2"}});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for an array nested string", () => {
				const result = findOnePath([{"_id": "Bookshop1"}], {"_id": "Bookshop2"});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a single-level nested string", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop2"});

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a complex nested string", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findOnePath(testObj, "Bookshop3");

				assert.strictEqual(result.match, false);
			});

			it("Will return the correct path for a complex nested object", () => {
				const testObj = {
					"items": [{
						"_id": 1,
						"title": "A night to remember",
						"stockedBy": ["Bookshop1", "Bookshop4"]
					}, {
						"_id": 2,
						"title": "Dream a little dream",
						"stockedBy": ["Bookshop1", "Bookshop2"]
					}]
				};

				const result = findOnePath(testObj, {_id: 3});

				assert.strictEqual(result.match, false);
			});
		});
	});

	describe("isNotEqual()", () => {
		it("Will return the correct result for a root string", () => {
			const result = isNotEqual("Bookshop1", "Bookshop1", "");

			assert.strictEqual(result, false);
		});

		it("Will return the correct result for an object nested string", () => {
			const result = isNotEqual([{"_id": "Bookshop1"}], "Bookshop1", "0._id");

			assert.strictEqual(result, true);
		});

		it("Will return the correct result for a nested equal object", () => {
			const result = isNotEqual({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop1"}}, "profile._id");

			assert.strictEqual(result, false);
		});

		it("Will return the correct result for an array nested string", () => {
			const result = isNotEqual([{"_id": "Bookshop1"}], [{"_id": "Bookshop1"}], "0._id");

			assert.strictEqual(result, false);
		});

		it("Will return the correct result for a single-level nested string", () => {
			const result = isNotEqual({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop1"}, "profile._id");

			assert.strictEqual(result, true);
		});

		it("Will return the correct result for a complex nested string", () => {
			const testObj1 = {
				"items": [{
					"_id": 1,
					"title": "A night to remember",
					"author": "Foobar",
					"stockedBy": ["Bookshop1", "Bookshop4"]
				}]
			};

			const testObj2 = {
				"items": [{
					"_id": 2,
					"title": "Dream a little dream",
					"author": "Foobar",
					"stockedBy": ["Bookshop1", "Bookshop2"]
				}]
			};

			const result = isNotEqual(testObj1, testObj2, ["items.0.author", "items.0.stockedBy.0"]);

			assert.strictEqual(result, false);
		});

		it("Will return the correct result when checking deep equality with positive outcome", () => {
			const testObj1 = {
				"items": [{
					"_id": 2,
					"title": "Dream a little dream",
					"author": "Foobar",
					"stockedBy": ["Bookshop1", "Bookshop2", {
						"arr": [{
							"id": 1
						}, {
							"id": 2
						}]
					}]
				}]
			};

			const testObj2 = {
				"items": [{
					"_id": 2,
					"title": "Dream a little dream",
					"author": "Foobar",
					"stockedBy": ["Bookshop1", "Bookshop2", {
						"arr": [{
							"id": 1
						}, {
							"id": 2
						}]
					}]
				}]
			};

			const testObj3 = {
				"items": [{
					"_id": 2,
					"title": "Dream a little dream",
					"author": "Foobar",
					"stockedBy": ["Bookshop1", "Bookshop2", {
						"arr": [{
							"id": 1
						}, {
							"id": 3
						}]
					}]
				}]
			};

			const result1 = isNotEqual(testObj1, testObj2, ["items"], true);
			const result2 = isNotEqual(testObj1, testObj3, ["items"], true);

			assert.strictEqual(result1, false);
			assert.strictEqual(result2, true);
		});
	});

	describe("isEqual()", () => {
		it("Will compare objects by reference when not deep", () => {
			const shared = {};

			assert.strictEqual(isEqual({a: {}}, {a: {}}, "a"), false);
			assert.strictEqual(isEqual({a: shared}, {a: shared}, "a"), true);
		});

		it("Will treat the same reference as deeply equal", () => {
			const shared = {b: 1};

			assert.strictEqual(isEqual({a: shared}, {a: shared}, "a", true), true);
		});

		it("Will use strict or non-strict equality", () => {
			assert.strictEqual(isEqual({a: 1}, {a: "1"}, "a"), true);
			assert.strictEqual(isEqual({a: 1}, {a: "1"}, "a", false, true), false);
			assert.strictEqual(isEqual({a: {b: 1}}, {a: {b: "1"}}, "a", true), true);
			assert.strictEqual(isEqual({a: {b: 1}}, {a: {b: "1"}}, "a", true, true), false);
		});

		it("Will detect keys that only exist in the second object", () => {
			assert.strictEqual(isEqual({a: {}}, {a: {b: 1}}, "a", true), false);
		});

		it("Will detect a missing value in the second object", () => {
			assert.strictEqual(isEqual({a: {}}, {}, "a", true), false);
			assert.strictEqual(isEqual({a: {b: 1}}, {a: null}, "a", true), false);
		});

		it("Will not treat an object and a primitive as deeply equal", () => {
			assert.strictEqual(isEqual({a: "[object Object]"}, {a: {}}, "a", true), false);
		});

		it("Will not treat an array and an object as deeply equal", () => {
			assert.strictEqual(isEqual({a: [1]}, {a: {0: 1}}, "a", true), false);
		});

		it("Will compare keys that contain periods", () => {
			assert.strictEqual(isEqual({a: {"x.y": 1}}, {a: {"x.y": 2}}, "a", true), false);
			assert.strictEqual(isEqual({a: {"x.y": 1}}, {a: {"x.y": 1}}, "a", true), true);
		});

		it("Will compare Dates and RegExps by value when deep", () => {
			assert.strictEqual(isEqual({d: new Date(0)}, {d: new Date(0)}, "d", true), true);
			assert.strictEqual(isEqual({d: new Date(0)}, {d: new Date(1)}, "d", true), false);
			assert.strictEqual(isEqual({r: /a/g}, {r: /a/g}, "r", true), true);
			assert.strictEqual(isEqual({r: /a/}, {r: /b/}, "r", true), false);
		});

		it("Will compare every path in an array of paths", () => {
			assert.strictEqual(isEqual({a: 1, b: 2}, {a: 1, b: 2}, ["a", "b"]), true);
			assert.strictEqual(isEqual({a: 1, b: 2}, {a: 1, b: 3}, ["a", "b"]), false);
		});
	});

	describe("leafNodes()", () => {
		it("Will return an array of paths for all leafs in an array structure", () => {
			const structure = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const result = leafNodes(structure);

			assert.strictEqual(result instanceof Array, true, "The result is an array");
			assert.strictEqual(result[0], "0.arr.0.id", "The result value is correct");
			assert.strictEqual(result[1], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(result[2], "0.arr.2.id", "The result value is correct");
			assert.strictEqual(result[3], "0.name", "The result value is correct");
			assert.strictEqual(result[4], "0.type", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an object structure", () => {
			const structure = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const result = leafNodes(structure);

			assert.strictEqual(result instanceof Array, true, "The result is an array");
			assert.strictEqual(result[0], "rootArray.0.arr.0.id", "The result value is correct");
			assert.strictEqual(result[1], "rootArray.0.arr.1.id", "The result value is correct");
			assert.strictEqual(result[2], "rootArray.0.arr.2.id", "The result value is correct");
			assert.strictEqual(result[3], "rootArray.0.name", "The result value is correct");
			assert.strictEqual(result[4], "rootArray.0.type", "The result value is correct");
		});

		it("Will return every leaf of an object that is referenced more than once", () => {
			const shared = {x: 1};

			assert.deepStrictEqual(leafNodes({a: shared, b: shared}), ["a.x", "b.x"], "Shared references are not cycles");
		});

		it("Will treat a cyclic reference as a leaf", () => {
			const obj: any = {a: 1};
			obj.self = obj;

			assert.deepStrictEqual(leafNodes(obj), ["a", "self"], "The cycle was not followed");
		});

		it("Will escape keys so every path can be used with get()", () => {
			const obj = {"a.b": {c: 1}};
			const result = leafNodes(obj);

			assert.deepStrictEqual(result, ["a\\.b.c"], "The path is escaped");
			assert.strictEqual(get(obj, result[0]), 1, "The path resolves");
		});

		it("Will include nulls, skip undefined values and apply a parent path", () => {
			assert.deepStrictEqual(leafNodes({a: null, b: undefined, c: 1}, "root"), ["root.a", "root.c"], "The result value is correct");
		});
	});

	describe("hasMatchingPathsInObject()", () => {
		it("Will return true when every path exists", () => {
			assert.strictEqual(hasMatchingPathsInObject({a: {b: 1}, c: null}, {a: {b: 2, d: 3}, c: 1}), true);
		});

		it("Will return false when a path is missing", () => {
			assert.strictEqual(hasMatchingPathsInObject({a: 1}, {}), false);
			assert.strictEqual(hasMatchingPathsInObject({a: {b: 1}}, {a: {}}), false);
		});

		it("Will return false instead of throwing when a parent is null or missing", () => {
			assert.strictEqual(hasMatchingPathsInObject({a: {b: 1}}, {a: null}), false);
			assert.strictEqual(hasMatchingPathsInObject({a: 1}, undefined as any), false);
		});

		it("Will not treat inherited properties as matching paths", () => {
			assert.strictEqual(hasMatchingPathsInObject({toString: 1}, {}), false);
		});
	});

	describe("countMatchingPathsInObject()", () => {
		it("Will match the README example", () => {
			const result = countMatchingPathsInObject({"moo": true}, {"foo": {"bar": null}, "moo": true});

			assert.deepStrictEqual(result, {
				"matchedKeyCount": 1,
				"matchedKeys": {"foo": {"bar": false}, "moo": true},
				"totalKeyCount": 2
			});
		});

		it("Will not throw when nested keys are missing from testKeys", () => {
			const result = countMatchingPathsInObject({}, {a: {b: {c: 1}}});

			assert.deepStrictEqual(result, {matchedKeys: {a: {b: {c: false}}}, matchedKeyCount: 0, totalKeyCount: 1});
		});

		it("Will not match a leaf against an object in testKeys", () => {
			const result = countMatchingPathsInObject({a: {b: 1}}, {a: 1});

			assert.deepStrictEqual(result, {matchedKeys: {a: false}, matchedKeyCount: 0, totalKeyCount: 1});
		});

		it("Will not treat inherited properties as matching paths", () => {
			assert.strictEqual(countMatchingPathsInObject({}, {toString: 1}).matchedKeyCount, 0);
		});
	});

	describe("Inherited enumerable properties", () => {
		// e.g. a polluted Object.prototype or a prototype with enumerable keys
		const withInherited = (own: ObjectType) => Object.assign(Object.create({inherited: 1}), own);

		it("Are ignored by flatten() and flattenValues()", () => {
			assert.deepStrictEqual(flatten(withInherited({own: 2})), ["own"]);
			assert.deepStrictEqual(Object.keys(flattenValues(withInherited({own: 2}))), ["own"]);
		});

		it("Are ignored by hasMatchingPathsInObject() and countMatchingPathsInObject()", () => {
			assert.strictEqual(hasMatchingPathsInObject(withInherited({}), {}), true);
			assert.strictEqual(countMatchingPathsInObject({}, withInherited({})).totalKeyCount, 0);
		});

		it("Are ignored by query()", () => {
			assert.deepStrictEqual(query({own: 1}, withInherited({own: {$in: [1]}})), {own: ["own"]});
		});
	});

	describe("distill()", () => {
		it("Will match the README example", () => {
			const obj = {"user": {"firstName": "Jim", "lastName": "Jones", "age": 22}};

			assert.deepStrictEqual(distill(obj, ["user.firstName", "user.lastName"]), {
				"user.firstName": "Jim",
				"user.lastName": "Jones"
			});
		});

		it("Will include missing paths as undefined", () => {
			assert.deepStrictEqual(distill({}, ["a.b"]), {"a.b": undefined});
		});
	});

	describe("diff()", () => {
		it("Will not fail if given circular referenced data", () => {
			const circle: any = {};
			circle.circle = circle;

			const circle2: any = {};
			circle2.circle = circle;

			try {
				const result = diff(circle, circle2);
				assert.ok(true, "We didn't fail!");
			} catch (e) {
				assert.ok(false, "We failed!");
			}
		});

		it("Will handle differences in arrays correctly", () => {
			const obj1 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj2 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj3 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 4
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 43
			}];

			const result1 = diff(obj1, obj2);
			const result2 = diff(obj1, obj3);

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Array, true, "The result is an array");
			assert.strictEqual(result2.length, 2, "The result value is correct");
			assert.strictEqual(result2[0], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(result2[1], "0.type", "The result value is correct");
		});

		it("Will handle blank arrays correctly", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diff(obj1, obj2, {basePath: "", strict: true});

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 3, "The result value is correct");
			assert.strictEqual(result1[0], "events", "The result value is correct");
			assert.strictEqual(result1[1], "events.0", "The result value is correct");
			assert.strictEqual(result1[2], "events.0.id", "The result value is correct");
		});

		it("Will handle max depth correctly 1", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diff(obj1, obj2, {basePath: "", strict: true, maxDepth: 1});

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 1, "The result value is correct");
			assert.strictEqual(result1[0], "events", "The result value is correct");
		});

		it("Will handle max depth correctly 2", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diff(obj1, obj2, {basePath: "", strict: true, maxDepth: 2});

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 2, "The result value is correct");
			assert.strictEqual(result1[0], "events", "The result value is correct");
			assert.strictEqual(result1[1], "events.0", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an array structure that differ from the other structure independent of which object is passed as the first param and which is passed as second", () => {
			const obj1 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj2 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj3 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 4
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 43,
				"someExtraField": "foo"
			}];

			const result1 = diff(obj1, obj2);
			const result2 = diff(obj1, obj3);

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Array, true, "The result is an array");
			assert.strictEqual(result2.length, 3, "The result value is correct");
			assert.strictEqual(result2[0], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(result2[1], "0.type", "The result value is correct");
			assert.strictEqual(result2[2], "0.someExtraField", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an object structure that differ from the other structure", () => {
			const obj1 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj2 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj3 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 4
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 43
				}]
			};

			const result1 = diff(obj1, obj2);
			const result2 = diff(obj1, obj3);

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Array, true, "The result is an array");
			assert.strictEqual(result2.length, 2, "The result value is correct");
			assert.strictEqual(result2[0], "rootArray.0.arr.1.id", "The result value is correct");
			assert.strictEqual(result2[1], "rootArray.0.type", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an object structure under a specific path that differ from the other structure", () => {
			const obj1 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj2 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj3 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 4
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 43
				}]
			};

			const result1 = diff(obj1, obj2, {basePath: "rootArray.0.arr"});
			const result2 = diff(obj1, obj3, {basePath: "rootArray.0.arr"});

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Array, true, "The result is an array");
			assert.strictEqual(result2.length, 1, "The result value is correct");
			assert.strictEqual(result2[0], "rootArray.0.arr.1.id", "The result value is correct");
		});
	});

	describe("diffValues()", () => {
		it("Will not fail if given circular referenced data", () => {
			const circle: any = {};
			circle.circle = circle;

			const circle2: any = {};
			circle2.circle = circle;

			try {
				const result = diffValues(circle, circle2);
				assert.ok(true, "We didn't fail!");
			} catch (e) {
				assert.ok(false, "We failed!");
			}
		});

		it("Will handle differences in arrays correctly", () => {
			const obj1 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj2 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj3 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 4 // Difference in value
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": "42" // Difference in type
			}];

			const result1 = diffValues(obj1, obj2); // These should be the same
			const result2 = diffValues(obj1, obj3, {basePath: "", strict: true}); // These should detect a difference

			assert.strictEqual(Object.keys(result1).length, 0, "The result value is correct");
			assert.strictEqual(Object.keys(result2).length, 2, "The result value is correct");
			assert.strictEqual(Object.keys(result2)[0], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(Object.keys(result2)[1], "0.type", "The result value is correct");
			assert.deepStrictEqual(result2["0.arr.1.id"], {
				val1: 2,
				val2: 4,
				type1: "number",
				type2: "number",
				difference: "value"
			}, "The result value is correct");
			assert.deepStrictEqual(result2["0.type"], {
				val1: 42,
				val2: "42",
				type1: "number",
				type2: "string",
				difference: "type"
			}, "The result value is correct");
		});

		it("Will handle blank arrays correctly", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diffValues(obj1, obj2, {basePath: "", strict: true});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 3, "The result value is correct");
			assert.strictEqual(Object.keys(result1)[0], "events", "The result value is correct");
			assert.strictEqual(Object.keys(result1)[1], "events.0", "The result value is correct");
			assert.strictEqual(Object.keys(result1)[2], "events.0.id", "The result value is correct");
		});

		it("Will handle strict=false correctly", () => {
			const obj1 = {
				events: [{
					id: 1
				}]
			};

			const obj2 = {
				events: [{
					id: "1"
				}]
			};

			const result1 = diffValues(obj1, obj2, {basePath: "", strict: false});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 0, "The result value is correct");
		});

		it("Will handle strict=true correctly", () => {
			const obj1 = {
				events: [{
					id: 1
				}]
			};

			const obj2 = {
				events: [{
					id: "1"
				}]
			};

			const result1 = diffValues(obj1, obj2, {basePath: "", strict: true});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 1, "The result value is correct");
			assert.strictEqual(Object.keys(result1)[0], "events.0.id", "The result value is correct");
			assert.deepEqual(result1["events.0.id"], {
				"val1": 1,
				"val2": "1",
				"type1": "number",
				"type2": "string",
				"difference": "type"
			}, "The result value is correct");
		});

		it("Will handle exclusive=true correctly", () => {
			const obj1 = {
				events: [{
					id: 1
				}],
				otherStuff: "foo",
				otherArr: [],
				otherObj: {}
			};

			const obj2 = {
				events: [{
					id: "1"
				}]
			};

			// Exclusive mode will only diff keys that exist in obj2 and not the other way around.
			// This allows you to do a partial diff where the second object is a partial of the first
			// so we only want to identify paths that have changed in obj2 compared to obj1.
			const result1 = diffValues(obj1, obj2, {basePath: "", strict: true, exclusive: true});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 1, "The result value is correct");
			assert.strictEqual(Object.keys(result1)[0], "events.0.id", "The result value is correct");
			assert.deepEqual(result1["events.0.id"], {
				"val1": 1,
				"val2": "1",
				"type1": "number",
				"type2": "string",
				"difference": "type"
			}, "The result value is correct");
		});

		it("Will handle max depth correctly 1", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diffValues(obj1, obj2, {basePath: "", strict: true, maxDepth: 1});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 1, "The result value is correct");
			assert.strictEqual(Object.keys(result1)[0], "events", "The result value is correct");
		});

		it("Will handle max depth correctly 2", () => {
			const obj1 = {
				events: [{
					id: "foo"
				}]
			};

			const obj2 = {events: []};

			const result1 = diffValues(obj1, obj2, {basePath: "", strict: true, maxDepth: 2});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 2, "The result value is correct");
			assert.strictEqual(Object.keys(result1)[0], "events", "The result value is correct");
			assert.strictEqual(Object.keys(result1)[1], "events.0", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an array structure that differ from the other structure independent of which object is passed as the first param and which is passed as second", () => {
			const obj1 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj2 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 2
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 42
			}];

			const obj3 = [{
				"arr": [{
					"id": 1
				}, {
					"id": 4
				}, {
					"id": 3
				}],
				"name": "An array",
				"type": 43,
				"someExtraField": "foo"
			}];

			const result1 = diffValues(obj1, obj2);
			const result2 = diffValues(obj1, obj3);

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result2).length, 3, "The result value is correct");
			assert.strictEqual(Object.keys(result2)[0], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(Object.keys(result2)[1], "0.type", "The result value is correct");
			assert.strictEqual(Object.keys(result2)[2], "0.someExtraField", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an object structure that differ from the other structure", () => {
			const obj1 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj2 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj3 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 4
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 43
				}]
			};

			const result1 = diffValues(obj1, obj2);
			const result2 = diffValues(obj1, obj3);

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result2).length, 2, "The result value is correct");
			assert.strictEqual(Object.keys(result2)[0], "rootArray.0.arr.1.id", "The result value is correct");
			assert.strictEqual(Object.keys(result2)[1], "rootArray.0.type", "The result value is correct");
		});

		it("Will return an array of paths for all leafs in an object structure under a specific path that differ from the other structure", () => {
			const obj1 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj2 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 2
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 42
				}]
			};

			const obj3 = {
				"rootArray": [{
					"arr": [{
						"id": 1
					}, {
						"id": 4
					}, {
						"id": 3
					}],
					"name": "An array",
					"type": 43
				}]
			};

			const result1 = diffValues(obj1, obj2, {basePath: "rootArray.0.arr"});
			const result2 = diffValues(obj1, obj3, {basePath: "rootArray.0.arr"});

			assert.strictEqual(result1 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result1).length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Object, true, "The result is an array");
			assert.strictEqual(Object.keys(result2).length, 1, "The result value is correct");
			assert.strictEqual(Object.keys(result2)[0], "rootArray.0.arr.1.id", "The result value is correct");
			assert.deepEqual(result2["rootArray.0.arr.1.id"], {
				"val1": 2,
				"val2": 4,
				"type1": "number",
				"type2": "number",
				"difference": "value"
			}, "The result value is correct");
		});
	});

	describe("diff() / diffValues() edge cases", () => {
		it("Will match the README examples", () => {
			const obj1 = {"user": {"_id": 1, "firstName": "Jimbo", "lastName": "Jetson"}};
			const obj2 = {"user": {"_id": "1", "firstName": "James", "lastName": "Jetson"}};

			assert.deepStrictEqual(diff(obj1, obj2, {basePath: "", strict: false}), ["user.firstName"]);
			assert.deepStrictEqual(diff(obj1, obj2, {basePath: "", strict: true}), ["user._id", "user.firstName"]);
			assert.deepStrictEqual(diffValues(obj1, obj2, {basePath: "", strict: true}), {
				"user._id": {val1: 1, val2: "1", type1: "number", type2: "string", difference: "type"},
				"user.firstName": {val1: "Jimbo", val2: "James", type1: "string", type2: "string", difference: "value"}
			});
		});

		it("Will report an object that changed to null in non-strict mode", () => {
			assert.deepStrictEqual(diffValues({a: {}}, {a: null}), {
				a: {val1: {}, val2: null, type1: "object", type2: "null", difference: "value"}
			});
		});

		it("Will report an object that changed to null as a type and value difference in strict mode", () => {
			assert.deepStrictEqual(diffValues({a: {}}, {a: null}, {strict: true}), {
				a: {val1: {}, val2: null, type1: "object", type2: "null", difference: "both"}
			});
		});

		it("Will report an array that changed to an object", () => {
			assert.deepStrictEqual(diff({a: []}, {a: {}}), ["a"]);
		});

		it("Will report the same paths whichever object is passed first", () => {
			assert.deepStrictEqual(diff({a: {b: 1}}, {}), ["a", "a.b"]);
			assert.deepStrictEqual(diff({}, {a: {b: 1}}), ["a", "a.b"]);
		});

		it("Will not report a missing field that is undefined in the other object", () => {
			assert.deepStrictEqual(diff({a: undefined}, {}), []);
		});

		it("Will report changes to keys that contain periods using escaped paths", () => {
			const obj1 = {"a.b": 1};
			const obj2 = {"a.b": 2};
			const result = diff(obj1, obj2);

			assert.deepStrictEqual(result, ["a\\.b"]);
			assert.strictEqual(get(obj2, result[0]), 2, "The path resolves");
		});

		it("Will count escaped keys as a single level for maxDepth", () => {
			const obj1 = {"a.b": {c: {d: 1}}};
			const obj2 = {"a.b": {c: {d: 2}}};

			assert.deepStrictEqual(diff(obj1, obj2, {maxDepth: 2}), ["a\\.b.c"]);
		});

		it("Will compare objects that are referenced more than once", () => {
			const shared = {v: 1};

			assert.deepStrictEqual(diff({a: shared, b: shared}, {a: shared, b: {v: 2}}), ["b.v"]);
		});

		it("Will report differences in two different cyclic structures", () => {
			const obj1: any = {a: 1};
			const obj2: any = {a: 2};
			obj1.self = obj1;
			obj2.self = obj2;

			assert.deepStrictEqual(diff(obj1, obj2), ["a"]);
		});

		it("Will return no differences for the same object", () => {
			const obj = {a: {b: 1}};

			assert.deepStrictEqual(diff(obj, obj), []);
		});

		it("Will check each path in an array of base paths", () => {
			const obj1 = {a: 1, b: 1, c: 1};
			const obj2 = {a: 2, b: 2, c: 2};

			assert.deepStrictEqual(diff(obj1, obj2, {basePath: ["a", "c"]}), ["a", "c"]);
		});

		it("Will only check keys from the second object in exclusive mode", () => {
			assert.deepStrictEqual(diff({a: 1, b: 2}, {a: 2}, {exclusive: true}), ["a"]);
			assert.deepStrictEqual(diff({}, {a: {b: 1}}, {exclusive: true}), ["a", "a.b"]);
		});

		it("Will not modify the options object passed in", () => {
			const options = {strict: true};
			diff({a: 1}, {a: 2}, options);

			assert.deepStrictEqual(options, {strict: true}, "The options were not modified");
		});
	});

	describe("pushVal()", () => {
		it("Will push a value to an array at the given path", () => {
			const obj = {
				"foo": []
			};

			assert.strictEqual(obj.foo.length, 0, "The array is empty");

			pushVal(obj, "foo", "New val");

			assert.strictEqual(obj.foo.length, 1, "The array is no longer empty");
			assert.strictEqual(obj.foo[0], "New val", "The value is correct");
		});

		it("Will push a value to an array that doesn't yet exist at the given path", () => {
			const obj: any = {};

			assert.strictEqual(obj.foo, undefined, "The key has no array yet");

			pushVal(obj, "foo", "New val");

			assert.strictEqual(obj.foo instanceof Array, true, "The array was created");
			assert.strictEqual(obj.foo.length, 1, "The array is no longer empty");
			assert.strictEqual(obj.foo[0], "New val", "The value is correct");
		});

		it("Will push a value to an array at the given path with immutability", () => {
			const obj = {
				"foo": []
			};

			const oldFoo = obj.foo;
			const newObj = pushVal(obj, "foo", "New val", {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo, true, "The old array and new array are not the same reference");
		});

		it("Will push a value to an array with a blank path (root)", () => {
			const obj: any = [];

			assert.strictEqual(obj.length, 0, "The array is empty");

			pushVal(obj, "", "New val");

			assert.strictEqual(obj.length, 1, "The array is no longer empty");
			assert.strictEqual(obj[0], "New val", "The value is correct");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			obj.__proto__.pushValPolluted = [];

			try {
				pushVal(obj, "__proto__.pushValPolluted", "newValue");
				assert.strictEqual(obj.pushValPolluted.length, 0, "The object prototype cannot be polluted");
			} finally {
				delete obj.__proto__.pushValPolluted;
			}
		});

		it("Will create the path to a new array", () => {
			const obj: any = {};
			pushVal(obj, "a.b.c", 1);

			assert.deepStrictEqual(obj, {a: {b: {c: [1]}}}, "The path was created");
		});

		it("Will replace a primitive in the middle of the path", () => {
			const obj: any = {a: "str"};
			pushVal(obj, "a.b", 1);

			assert.deepStrictEqual(obj, {a: {b: [1]}}, "The primitive was replaced");
		});

		it("Will push to keys that contain periods", () => {
			const obj: any = {"a.b": [1]};
			pushVal(obj, escape("a.b"), 2);

			assert.deepStrictEqual(obj, {"a.b": [1, 2]}, "No stray keys were created");
		});

		it("Will throw an Error when the leaf is not an array", () => {
			assert.throws(() => pushVal({a: "str"}, "a", 1), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
			assert.throws(() => pushVal({}, "", 1), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
		});

		it("Will return the input when there is nothing to push to", () => {
			assert.strictEqual(pushVal(undefined as any, "a", 1), undefined, "Missing object");
			assert.strictEqual(pushVal(null as any, "a", 1), null, "Null object");
			assert.strictEqual(pushVal("str" as any, "a", 1), "str", "Non-object");

			const obj = {};
			assert.strictEqual(pushVal(obj, undefined as any, 1), obj, "Missing path");
		});
	});

	describe("pushValImmutable()", () => {
		it("Will not modify the original object", () => {
			const untouched = {};
			const original = {a: {b: [] as number[]}, untouched};
			const originalA = original.a;
			const result: any = pushValImmutable(original, "a.b", 1);

			assert.deepStrictEqual(original, {a: {b: []}, untouched: {}}, "The original data was not modified");
			assert.strictEqual(original.a, originalA, "The original reference was not replaced");
			assert.deepStrictEqual(result.a.b, [1], "The new object was modified");
			assert.notStrictEqual(result.a, original.a, "Modified objects are not shared");
			assert.strictEqual(result.untouched, untouched, "Unmodified objects are shared");
		});

		it("Will push to a root array without modifying it", () => {
			const original = [1];
			const result: any = pushValImmutable(original, "", 2);

			assert.deepStrictEqual(original, [1], "The original was not modified");
			assert.deepStrictEqual(result, [1, 2], "The new array was modified");
		});
	});

	describe("pullVal()", () => {
		it("Will pull a string literal from an array at the given path", () => {
			const obj = {
				"foo": ["valueToPull"]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is not the correct length");

			pullVal(obj, "foo", "valueToPull");

			assert.strictEqual(obj.foo.length, 0, "The array is empty");
			assert.strictEqual(obj.foo[0], undefined, "The value is correct");
		});

		it("Will pull a string literal from an array at the given path with immutability", () => {
			const obj = {
				"foo": ["valueToPull"]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is not the correct length");

			const oldFoo = obj.foo;
			const newObj = pullVal(obj, "foo", "valueToPull", {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo, true, "The old array and new array are not the same reference");
			assert.strictEqual(newObj.foo.length, 0, "The array length is correct");
			assert.strictEqual(obj.foo.length, 1, "The array length is correct");
		});

		it("Will pull a string literal from a nested array at the given path with immutability", () => {
			const obj = {
				"foo": {
					"bar": {
						"moo": ["valueToPull"]
					}
				}
			};

			assert.strictEqual(obj.foo.bar.moo.length, 1, "The array is not the correct length");

			const oldFoo = obj.foo.bar.moo;
			const newObj = pullVal(obj, "foo.bar.moo", "valueToPull", {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo.bar.moo, true, "The old array and new array are not the same reference");
			assert.strictEqual(newObj.foo.bar.moo.length, 0, "The array is not the correct length");
			assert.strictEqual(obj.foo.bar.moo.length, 1, "The array is not empty");
		});

		it("Will pull a string literal from an array with a blank path (root)", () => {
			const obj = ["valueToPull"];

			assert.strictEqual(obj.length, 1, "The array is not the correct length");

			pullVal(obj, "", "valueToPull");

			assert.strictEqual(obj.length, 0, "The array length is correct");
			assert.strictEqual(obj[0], undefined, "The value is correct");
		});

		it("Will pull a object from an array at the given path", () => {
			const objToPull = {"bar": "ram you"};
			const obj = {
				"foo": [objToPull]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is not the correct length");
			assert.strictEqual(obj.foo[0], objToPull, "The value is correct");

			pullVal(obj, "foo", objToPull);

			assert.strictEqual(obj.foo.length, 0, "The array length is correct");
			assert.strictEqual(obj.foo[0], undefined, "The value is correct");
		});

		it("Will pull an object that matches the search criteria from an array at the given path (strict off)", () => {
			const obj = {
				"foo": [{
					"_id": "1",
					"name": "bar"
				}, {
					"_id": "2",
					"name": "bar"
				}]
			};

			assert.strictEqual(obj.foo.length, 2, "The array is not the correct length");
			assert.strictEqual(obj.foo[0]._id, "1", "The value is correct");
			assert.strictEqual(obj.foo[1]._id, "2", "The value is correct");

			pullVal(obj, "foo", {_id: "2"}, {"strict": false});

			assert.strictEqual(obj.foo.length, 1, "The array length is correct");
			assert.strictEqual(obj.foo[0]._id, "1", "The value is correct");
			assert.strictEqual(obj.foo[1], undefined, "The value is correct");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			obj.__proto__.pushValPolluted = ["myExistingValue"];

			try {
				pullVal(obj, "__proto__.pushValPolluted", "myExistingValue");
				assert.strictEqual(obj.pushValPolluted.length, 1, "The object prototype cannot be polluted");
			} finally {
				delete obj.__proto__.pushValPolluted;
			}
		});

		it("Will do nothing when the path does not exist", () => {
			const obj = {a: "str"};

			assert.strictEqual(pullVal(obj, "missing.path", 1), obj, "Missing parent");
			assert.strictEqual(pullVal(obj, "missing", 1), obj, "Missing leaf");
			assert.strictEqual(pullVal(obj, "a.b", 1), obj, "Primitive parent");
			assert.deepStrictEqual(obj, {a: "str"}, "No keys were created");
		});

		it("Will throw an Error when the leaf is not an array", () => {
			assert.throws(() => pullVal({a: "str"}, "a", 1), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
			assert.throws(() => pullVal({}, "", 1), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
		});

		it("Will pull from keys that contain periods", () => {
			const obj = {"a.b": [1, 2]};
			pullVal(obj, escape("a.b"), 1);

			assert.deepStrictEqual(obj, {"a.b": [2]}, "No stray keys were created");
		});

		it("Will only remove the first matching value", () => {
			const obj = {a: [1, 2, 1]};
			pullVal(obj, "a", 1);

			assert.deepStrictEqual(obj, {a: [2, 1]}, "Only the first match was removed");
		});

		it("Will leave the array unchanged when the value is not found", () => {
			const obj = {a: [1, 2]};
			pullVal(obj, "a", 3);

			assert.deepStrictEqual(obj, {a: [1, 2]}, "Nothing was removed");
		});

		it("Will match strictly by default even when other options are passed", () => {
			const lookAlike = () => ({a: [{x: 1}]});

			assert.strictEqual(pullVal(lookAlike(), "a", {x: 1}).a.length, 1, "Default options are strict");
			assert.strictEqual(pullVal(lookAlike(), "a", {x: 1}, {}).a.length, 1, "Empty options are strict");
			assert.strictEqual(pullVal(lookAlike(), "a", {x: 1}, {immutable: true}).a.length, 1, "Immutable options are strict");
			assert.strictEqual(pullVal(lookAlike(), "a", {x: 1}, {strict: false}).a.length, 0, "Non-strict matches by structure");
		});

		it("Will match null values in non-strict mode", () => {
			const obj = {a: [{x: 1}, null]};
			pullVal(obj, "a", null, {strict: false});

			assert.deepStrictEqual(obj, {a: [{x: 1}]}, "The null was removed");
		});

		it("Will return the input when there is nothing to pull from", () => {
			assert.strictEqual(pullVal(undefined as any, "a", 1), undefined, "Missing object");
			assert.strictEqual(pullVal(null as any, "a", 1), null, "Null object");

			const obj = {};
			assert.strictEqual(pullVal(obj, undefined as any, 1), obj, "Missing path");
		});
	});

	describe("pullValImmutable()", () => {
		it("Will not modify the original object", () => {
			const untouched = {};
			const original = {a: {b: [1, 2]}, untouched};
			const result: any = pullValImmutable(original, "a.b", 1);

			assert.deepStrictEqual(original, {a: {b: [1, 2]}, untouched: {}}, "The original was not modified");
			assert.deepStrictEqual(result.a.b, [2], "The new object was modified");
			assert.strictEqual(result.untouched, untouched, "Unmodified objects are shared");
		});

		it("Will match strictly by default", () => {
			const value = {x: 1};
			const original = {a: [{x: 1}, value]};

			assert.strictEqual(pullValImmutable(original, "a", {x: 1}).a.length, 2, "A look-alike object is not removed");
			assert.deepStrictEqual(pullValImmutable(original, "a", value).a, [{x: 1}], "The exact reference is removed");
			assert.strictEqual(pullValImmutable(original, "a", {x: 1}, {strict: false}).a.length, 1, "Non-strict matches by structure");
		});

		it("Will return the original when the path does not exist", () => {
			const original = {};

			assert.strictEqual(pullValImmutable(original, "a.b", 1), original, "Nothing changed so the original is returned");
		});
	});

	describe("splicePath()", () => {
		it("Will push a string literal into an array at the given path with index", () => {
			const obj = {
				"foo": ["otherValToKeep", "valueToPull", "someOtherValToKeep"]
			};

			assert.strictEqual(obj.foo.length, 3, "The array is not the correct length");

			splicePath(obj, "foo", 2, 0, ["newValue"]);

			assert.strictEqual(obj.foo.length, 4, "The array is the correct length");
			assert.strictEqual(obj.foo[0], "otherValToKeep", "The value is correct");
			assert.strictEqual(obj.foo[1], "valueToPull", "The value is correct");
			assert.strictEqual(obj.foo[2], "newValue", "The value is correct");
			assert.strictEqual(obj.foo[3], "someOtherValToKeep", "The value is correct");
		});

		it("Will pull a string literal from an array at the given path with index", () => {
			const obj = {
				"foo": ["otherValToKeep", "valueToPull", "someOtherValToKeep"]
			};

			assert.strictEqual(obj.foo.length, 3, "The array is not the correct length");

			splicePath(obj, "foo", 1, 1);

			assert.strictEqual(obj.foo.length, 2, "The array is the correct length");
			assert.strictEqual(obj.foo[0], "otherValToKeep", "The value is correct");
			assert.strictEqual(obj.foo[1], "someOtherValToKeep", "The value is correct");
		});

		it("Will pull a string literal from an array at the given path with index with immutability", () => {
			const obj = {
				"foo": ["otherValToKeep", "valueToPull", "someOtherValToKeep"]
			};

			assert.strictEqual(obj.foo.length, 3, "The array is not the correct length");

			const oldFoo = obj.foo;
			const newObj = splicePath(obj, "foo", 1, 1, [], {immutable: true});

			assert.strictEqual(obj.foo.length, 3, "The array is not the correct length");
			assert.strictEqual(newObj.foo.length, 2, "The array is not the correct length");
			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo, true, "The old array and new array are not the same reference");
		});

		it("Will pull a string literal from a nested array at the given path with immutability", () => {
			const obj = {
				"foo": {
					"bar": {
						"moo": ["otherValToKeep", "valueToPull", "someOtherValToKeep"]
					}
				}
			};

			assert.strictEqual(obj.foo.bar.moo.length, 3, "The array is not the correct length");

			const oldFoo = obj.foo.bar.moo;
			const newObj = splicePath(obj, "foo.bar.moo", 1, 1, [], {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo.bar.moo, true, "The old array and new array are not the same reference");
			assert.strictEqual(newObj.foo.bar.moo.length, 2, "The array is not the correct length");
			assert.strictEqual(obj.foo.bar.moo.length, 3, "The array is not the correct length");
		});

		it("Will pull a string literal from an array with a blank path (root)", () => {
			const obj = ["otherValToKeep", "valueToPull", "someOtherValToKeep"];

			assert.strictEqual(obj.length, 3, "The array is not the correct length");

			splicePath(obj, "", 1, 1);

			assert.strictEqual(obj.length, 2, "The array length is correct");
			assert.strictEqual(obj[0], "otherValToKeep", "The value is correct");
			assert.strictEqual(obj[1], "someOtherValToKeep", "The value is correct");
		});

		it("Will pull a object from an array at the given path", () => {
			const objToPull = {"bar": "ram you"};
			const obj = {
				"foo": [objToPull]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is not the correct length");
			assert.strictEqual(obj.foo[0], objToPull, "The value is correct");

			splicePath(obj, "foo", 0, 1, []);

			assert.strictEqual(obj.foo.length, 0, "The array length is correct");
			assert.strictEqual(obj.foo[0], undefined, "The value is correct");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			obj.__proto__.pullPathPolluted = ["myExistingValue"];

			try {
				splicePath(obj, "__proto__.pullPathPolluted", 0, 1, []);
				assert.strictEqual(obj.pullPathPolluted.length, 1, "The object prototype cannot be polluted");
			} finally {
				delete obj.__proto__.pullPathPolluted;
			}
		});

		it("Will do nothing when the path does not exist", () => {
			const obj = {a: "str"};

			assert.strictEqual(splicePath(obj, "missing.path", 0, 0, [1]), obj, "Missing parent");
			assert.strictEqual(splicePath(obj, "missing", 0, 0, [1]), obj, "Missing leaf");
			assert.strictEqual(splicePath(obj, "a.b", 0, 0, [1]), obj, "Primitive parent");
			assert.strictEqual(splicePath(obj, "missing", 0, 0, [1], {immutable: true}), obj, "Nothing changed so the original is returned");
			assert.deepStrictEqual(obj, {a: "str"}, "No keys were created");
		});

		it("Will throw an Error when the leaf is not an array", () => {
			assert.throws(() => splicePath({a: "str"}, "a", 0, 0), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
			assert.throws(() => splicePath({}, "", 0, 0), (err: any) => err instanceof Error && /leaf node is not an array/.test(err.message));
		});

		it("Will splice keys that contain periods", () => {
			const obj = {"a.b": [1, 2]};
			splicePath(obj, escape("a.b"), 0, 1);

			assert.deepStrictEqual(obj, {"a.b": [2]}, "No stray keys were created");
		});

		it("Will not modify the original when immutable", () => {
			const untouched = {};
			const original = {a: {b: [1, 2]}, untouched};
			const result: any = splicePath(original, "a.b", 0, 1, [], {immutable: true});

			assert.deepStrictEqual(original, {a: {b: [1, 2]}, untouched: {}}, "The original was not modified");
			assert.deepStrictEqual(result.a.b, [2], "The new object was modified");
			assert.strictEqual(result.untouched, untouched, "Unmodified objects are shared");
		});

		it("Will return the input when there is nothing to splice", () => {
			assert.strictEqual(splicePath(undefined as any, "a", 0, 0), undefined, "Missing object");

			const obj = {};
			assert.strictEqual(splicePath(obj, undefined as any, 0, 0), obj, "Missing path");
		});
	});

	describe("up()", () => {
		it("Returns the new path correctly", () => {
			const path = "foo.bar.thing";
			const result = up(path);

			assert.strictEqual(result, "foo.bar", "The path is correct");
		});

		it("Returns the new path correctly when levels are specified", () => {
			const path = "foo.bar.thing";
			const result = up(path, 2);

			assert.strictEqual(result, "foo", "The path is correct");
		});

		it("Returns the new path correctly when too many levels are specified", () => {
			const path = "foo.bar.thing";
			const result = up(path, 5);

			assert.strictEqual(result, "", "The path is correct");
		});
	});

	describe("down()", () => {
		it("Returns the new path correctly", () => {
			const path = "foo.bar.thing";
			const result = down(path);

			assert.strictEqual(result, "bar.thing", "The path is correct");
		});

		it("Returns the new path correctly when levels are specified", () => {
			const path = "foo.bar.thing";
			const result = down(path, 2);

			assert.strictEqual(result, "thing", "The path is correct");
		});

		it("Returns the new path correctly when too many levels are specified", () => {
			const path = "foo.bar.thing";
			const result = down(path, 5);

			assert.strictEqual(result, "", "The path is correct");
		});
	});

	describe("pop()", () => {
		it("Returns the new path correctly", () => {
			const path = "foo.bar.thing";
			const result = pop(path);

			assert.strictEqual(result, "thing", "The path is correct");
		});

		it("Returns the new path correctly when levels are specified", () => {
			const path = "foo.bar.thing";
			const result = pop(path, 2);

			assert.strictEqual(result, "bar", "The path is correct");
		});

		it("Returns the new path correctly when too many levels are specified", () => {
			const path = "foo.bar.thing";
			const result = pop(path, 5);

			assert.strictEqual(result, "", "The path is correct");
		});
	});

	describe("shift()", () => {
		it("Returns the new path correctly", () => {
			const path = "foo.bar.thing";
			const result = shift(path);

			assert.strictEqual(result, "foo", "The path is correct");
		});

		it("Returns the new path correctly when levels are specified", () => {
			const path = "foo.bar.thing";
			const result = shift(path, 2);

			assert.strictEqual(result, "bar", "The path is correct");
		});

		it("Returns the new path correctly when too many levels are specified", () => {
			const path = "foo.bar.thing";
			const result = shift(path, 5);

			assert.strictEqual(result, "", "The path is correct");
		});
	});

	describe("update()", () => {
		it("Applies the correct values to multiple paths", () => {
			const obj = {};
			const resultObj = update(obj, "", {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});

			assert.strictEqual(resultObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.strictEqual(obj, resultObj, "The changes were made by reference");
		});

		// it("Applies the correct values to multiple paths with a where clause", () => {
		// 	const obj = {};
		// 	const resultObj = update(obj, "", {
		// 		"foo": "fooVal",
		// 		"bar.one.two": "Three"
		// 	}, {
		// 		"foo":
		// 	});
		//
		// 	assert.strictEqual(resultObj.foo, "fooVal", "Value is correct for single noted path");
		// 	assert.strictEqual(resultObj.bar.one.two, "Three", "Value is correct for multi noted path");
		// 	assert.strictEqual(obj, resultObj, "The changes were made by reference");
		// });

		it("Applies the correct values to multiple paths with a basePath", () => {
			const obj = {
				"subObj": {}
			};
			const resultObj = update(obj, "subObj", {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});

			assert.strictEqual(resultObj.subObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.subObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.strictEqual(obj, resultObj, "The changes were made by reference");
			assert.strictEqual(obj.subObj, resultObj.subObj, "The changes were made by reference");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			update(obj, "", json('{"__proto__": {"polluted": true}}'));
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
			assert.strictEqual(({} as any).polluted, undefined, "Object.prototype cannot be polluted");
		});

		it("Will match the README example", () => {
			const obj: any = {"foo": {"bar": [{"moo": true, "baa": "ram you"}]}};

			update(obj, "", {
				"foo.bar.0.baa": "hello I've been updated",
				"and.so": "have I!"
			});

			assert.strictEqual(obj.foo.bar[0].baa, "hello I've been updated", "Value is correct");
			assert.strictEqual(obj.and.so, "have I!", "Value is correct");
		});

		it("Will apply escaped paths", () => {
			const obj: any = {"a.b": {c: 1}};
			update(obj, "", {[`${escape("a.b")}.d`]: 2});

			assert.deepStrictEqual(obj, {"a.b": {c: 1, d: 2}}, "No stray keys and no data loss");
		});

		it("Will apply an update key named hasOwnProperty", () => {
			assert.deepStrictEqual(update({}, "", json('{"hasOwnProperty": 1, "a": 2}')), {hasOwnProperty: 1, a: 2});
		});

		it("Will treat an undefined basePath as the root", () => {
			assert.deepStrictEqual(update({}, undefined as any, {a: 1}), {a: 1});
			assert.deepStrictEqual(updateImmutable({}, undefined as any, {a: 1}), {a: 1});
		});

		it("Will ignore inherited enumerable keys in the update data", () => {
			const updateData = Object.create({inherited: 1});
			updateData.own = 2;

			assert.deepStrictEqual(update({}, "", updateData), {own: 2});
		});
	});

	describe("updateImmutable()", () => {
		it("Applies the correct values to multiple paths", () => {
			const obj = {};
			const resultObj = updateImmutable(obj, "", {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});

			assert.strictEqual(resultObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.notStrictEqual(obj, resultObj, "The changes were made by value");
		});

		it("Applies the correct values to multiple paths with a basePath", () => {
			const obj = {
				"subObj": {}
			};
			const resultObj = updateImmutable(obj, "subObj", {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});

			assert.strictEqual(resultObj.subObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.subObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.notStrictEqual(obj, resultObj, "The changes were made by value");
			assert.notStrictEqual(obj.subObj, resultObj.subObj, "The changes were made by value");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			const result = updateImmutable(obj, "", json('{"__proto__": {"polluted": true}}'));
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
			assert.strictEqual(result.polluted, undefined, "The result prototype cannot be polluted");
			assert.strictEqual(({} as any).polluted, undefined, "Object.prototype cannot be polluted");
		});
	});

	describe("merge()", () => {
		it("Merges two objects mutably", () => {
			const obj1 = {
				obj: {
					shouldNotChange: false,
					shouldChange: false
				},
				arr: [{
					shouldHaveNewKey: true
				}, true]
			};

			const obj2 = {
				obj: {
					shouldChange: true
				},
				arr: [{
					shouldHaveNewKey: true,
					newKey: "foo"
				}, false, 2]
			};

			const resultObj = merge(obj1, obj2);

			assert.strictEqual(resultObj.obj.shouldNotChange, false, "Value is correct for single noted path");
			assert.strictEqual(resultObj.obj.shouldChange, true, "Value is correct for single noted path");
			assert.strictEqual(resultObj.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.strictEqual(resultObj.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.strictEqual(obj1, resultObj, "The changes were made by value");
		});

		it("Merges two objects immutably", () => {
			const obj1 = {
				obj: {
					shouldNotChange: false,
					shouldChange: false
				},
				arr: [{
					shouldHaveNewKey: true
				}, true]
			};

			const obj2 = {
				obj: {
					shouldChange: true
				},
				arr: [{
					shouldHaveNewKey: true,
					newKey: "foo"
				}, false, 2]
			};

			const resultObj = mergeImmutable(obj1, obj2);

			assert.strictEqual(resultObj.obj.shouldNotChange, false, "Value is correct for single noted path");
			assert.strictEqual(resultObj.obj.shouldChange, true, "Value is correct for single noted path");
			assert.strictEqual(resultObj.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.strictEqual(resultObj.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.notStrictEqual(obj1, resultObj, "The changes were made by value");
		});

		it("Merges and correctly applies the ignoreUndefined option flag", () => {
			const obj1 = {
				obj: {
					shouldNotChange: false,
					shouldChange: false,
					shouldStayTheSame: "hello"
				},
				arr: [{
					shouldHaveNewKey: true
				}, true]
			};

			const obj2 = {
				obj: {
					shouldChange: true,
					shouldStayTheSame: undefined
				},
				arr: [{
					shouldHaveNewKey: true,
					newKey: "foo"
				}, false, 2]
			};

			const resultObj1 = merge(obj1, obj2, {ignoreUndefined: true, immutable: true});
			const resultObj2 = merge(obj1, obj2, {ignoreUndefined: false, immutable: true});

			assert.strictEqual(resultObj1.obj.shouldStayTheSame, "hello", "Value is correct for single noted path");
			assert.strictEqual(resultObj1.obj.shouldChange, true, "Value is correct for single noted path");
			assert.strictEqual(resultObj1.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.strictEqual(resultObj1.arr[0].newKey, "foo", "Value is correct for multi noted path");

			assert.strictEqual(resultObj2.obj.shouldStayTheSame, undefined, "Value is correct for single noted path");
			assert.strictEqual(resultObj2.obj.shouldChange, true, "Value is correct for single noted path");
			assert.strictEqual(resultObj2.arr[0].newKey, "foo", "Value is correct for multi noted path");
			assert.strictEqual(resultObj2.arr[0].newKey, "foo", "Value is correct for multi noted path");
		});

		it("Will replace a primitive with an object or array", () => {
			assert.deepStrictEqual(merge({a: 5}, {a: {b: 1}}), {a: {b: 1}});
			assert.deepStrictEqual(mergeImmutable({a: 5}, {a: {b: 1}}), {a: {b: 1}});
			assert.deepStrictEqual(merge({a: "str"}, {a: [1]}), {a: [1]});
		});

		it("Will replace a value whose type does not match", () => {
			assert.deepStrictEqual(merge({a: [1, 2]}, {a: {x: 1}}), {a: {x: 1}});
			assert.deepStrictEqual(merge({a: {x: 1}}, {a: [1]}), {a: [1]});
			assert.deepStrictEqual(merge({a: new Date(0)}, {a: {x: 1}}), {a: {x: 1}});
		});

		it("Will keep Dates and class instances from the second object", () => {
			const date = new Date(0);
			const instance = new ExampleClass(1);

			const result = merge({}, {date, instance});
			const immutableResult = mergeImmutable({date: new Date(1)}, {date, instance});

			assert.strictEqual(result.date, date, "The Date was assigned");
			assert.strictEqual(result.instance, instance, "The instance was assigned");
			assert.strictEqual(immutableResult.date, date, "The Date was assigned");
			assert.strictEqual(immutableResult.instance, instance, "The instance was assigned");
		});

		it("Will treat a missing second object as an empty one", () => {
			const obj = {a: 1};

			assert.strictEqual(merge(obj, undefined as any), obj, "The original is returned");
			assert.deepStrictEqual(mergeImmutable(obj, null as any), {a: 1}, "A copy is returned");
		});

		it("Will not modify nested objects of the original when immutable", () => {
			const original = {a: {b: 1}, untouched: {}};
			const result = mergeImmutable(original, {a: {c: 2}});

			assert.deepStrictEqual(original, {a: {b: 1}, untouched: {}}, "The original was not modified");
			assert.deepStrictEqual(result.a, {b: 1, c: 2}, "The values were merged");
			assert.strictEqual(result.untouched, original.untouched, "Unmodified objects are shared");
		});

		it("Will merge into an object without a prototype", () => {
			const target = Object.create(null);
			target.a = {b: 1};

			const result = merge(target, {a: {c: 2}});

			assert.deepStrictEqual({...result.a}, {b: 1, c: 2}, "The values were merged");
		});
	});

	describe("query()", () => {
		describe("$in", () => {
			it("Can query objects with nested paths inside arrays", () => {
				const obj = {
					arr: [{
						name: "",
						items: [{
							moreItems: [{
								name: "OK"
							}, {
								name: ""
							}, {
								name: "OK"
							}, {
								name: ""
							}]
						}, {
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}, {
								name: "OK"
							}, {
								name: ""
							}]
						}]
					}, {
						name: "Jim"
					}, {
						name: null
					}, {}]
				};

				const queryToPathsResult = query(obj, {
					"arr.items.moreItems.name": {$in: ["", undefined, null]},
					"arr.items.notDefined": {$in: () => true},
					"notDefined": {$in: () => true}
				});

				expect(queryToPathsResult).toEqual({
					"arr.items.moreItems.name": [
						"arr.0.items.0.moreItems.1.name",
						"arr.0.items.0.moreItems.3.name",
						"arr.0.items.1.moreItems.3.name"

					],
					"arr.items.notDefined": [
						"arr.0.items.0.notDefined",
						"arr.0.items.1.notDefined"
					],
					"notDefined": [
						"notDefined"
					]
				});
			});

			it("Can query with $in criteria as an array of functions", () => {
				const obj = {
					arr: [{
						name: "",
						items: [{
							moreItems: [{
								name: "OK"
							}, {
								name: ""
							}, {
								name: "OK"
							}, {
								name: ""
							}]
						}, {
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}, {
								name: "OK"
							}, {
								name: ""
							}]
						}]
					}, {
						name: "Jim"
					}, {
						name: null
					}, {}]
				};

				const queryToPathsResult = query(obj, {
					"arr.items.moreItems.name": {$in: [() => true, undefined, null]},
					"arr.items.notDefined": {$in: [() => true, () => true]},
					"notDefined": {$in: () => true}
				});

				expect(queryToPathsResult).toEqual({
					"arr.items.moreItems.name": [
						"arr.0.items.0.moreItems.0.name",
						"arr.0.items.0.moreItems.1.name",
						"arr.0.items.0.moreItems.2.name",
						"arr.0.items.0.moreItems.3.name",
						"arr.0.items.1.moreItems.0.name",
						"arr.0.items.1.moreItems.1.name",
						"arr.0.items.1.moreItems.2.name",
						"arr.0.items.1.moreItems.3.name"
					],
					"arr.items.notDefined": [
						"arr.0.items.0.notDefined",
						"arr.0.items.1.notDefined"
					],
					"notDefined": [
						"notDefined"
					]
				});
			});

			it("Can query keys that contain periods", () => {
				const obj = {"a.b": [{c: 1}, {c: 2}]};
				const queryKey = `${escape("a.b")}.c`;

				expect(query(obj, {[queryKey]: {$in: [1]}})).toEqual({[queryKey]: ["a\\.b.0.c"]});
			});

			it("Ignores unknown operators", () => {
				expect(query({a: 1}, {a: {$unknown: [1]} as any})).toEqual({a: []});
			});
		});

		// describe("$or", () => {
		// 	it("Can query objects with nested paths inside arrays", () => {
		// 		const obj = {
		// 			arr: [{
		// 				name: "",
		// 				items: [{
		// 					moreItems: [{
		// 						name: "OK"
		// 					}, {
		// 						name: ""
		// 					}, {
		// 						name: "OK"
		// 					}, {
		// 						name: ""
		// 					}]
		// 				}, {
		// 					moreItems: [{
		// 						name: "OK"
		// 					}, {
		// 						name: "OK"
		// 					}, {
		// 						name: "OK"
		// 					}, {
		// 						name: ""
		// 					}]
		// 				}]
		// 			}, {
		// 				name: "Jim"
		// 			}, {
		// 				name: null
		// 			}, {}]
		// 		};
		//
		// 		const queryToPathsResult = query(obj, {
		// 			$or: [{
		// 				"arr.items.moreItems.name": {
		// 					$in: ["", undefined, null]
		// 				}
		// 			}],
		// 		});
		//
		// 		expect(queryToPathsResult).toEqual({
		// 			"arr.items.moreItems.name": [
		// 				"arr.0.items.0.moreItems.1.name",
		// 				"arr.0.items.0.moreItems.3.name",
		// 				"arr.0.items.1.moreItems.3.name"
		// 			]
		// 		});
		// 	});
		// });

		describe("traverse()", () => {
			it("Calls the operation function for each path iteration on nested arrays", () => {
				const obj = {
					arr: [{
						items: [{
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}]
						}]
					}]
				};

				const traversedPaths: string[] = [];

				traverse(obj, "arr.items.moreItems.name", ({purePath}) => {
					traversedPaths.push(purePath);
					return true;
				});

				expect(traversedPaths).toEqual([
					"arr",
					"arr.0",
					"arr.0.items",
					"arr.0.items.0",
					"arr.0.items.0.moreItems",
					"arr.0.items.0.moreItems.0",
					"arr.0.items.0.moreItems.0.name",
					"arr.0.items.0.moreItems.1",
					"arr.0.items.0.moreItems.1.name"
				]);
			});

			it("Calls the operation function for each path iteration on nested objects", () => {
				const obj = {
					obj1: {
						item1: {
							anotherItem: {
								name: "OK"
							}
						},
						item2: {
							anotherItem: {
								name: "OK"
							}
						}
					},
					obj2: {
						item1: {
							anotherItem: {
								name: "OK"
							}
						},
						item2: {
							anotherItem: {
								name: "OK"
							}
						}
					}
				};

				const traversedPaths: string[] = [];

				traverse(obj, "obj2.item2.anotherItem.name", ({purePath}) => {
					traversedPaths.push(purePath);
					return true;
				});

				expect(traversedPaths).toEqual([
					"obj2",
					"obj2.item2",
					"obj2.item2.anotherItem",
					"obj2.item2.anotherItem.name"
				]);
			});

			it("Calls the operation function for each path iteration on nested objects and arrays", () => {
				const obj = {
					obj1: {
						items: [{
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}]
						}, {
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}]
						}]
					},
					obj2: {
						items: [{
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}]
						}, {
							moreItems: [{
								name: "OK"
							}, {
								name: "OK"
							}]
						}]
					}
				};

				const traversedPaths: string[] = [];

				traverse(obj, "obj2.items.moreItems.name", ({purePath}) => {
					traversedPaths.push(purePath);
					return true;
				});

				expect(traversedPaths).toEqual([
					"obj2",
					"obj2.items",
					"obj2.items.0",
					"obj2.items.0.moreItems",
					"obj2.items.0.moreItems.0",
					"obj2.items.0.moreItems.0.name",
					"obj2.items.0.moreItems.1",
					"obj2.items.0.moreItems.1.name",
					"obj2.items.1",
					"obj2.items.1.moreItems",
					"obj2.items.1.moreItems.0",
					"obj2.items.1.moreItems.0.name",
					"obj2.items.1.moreItems.1",
					"obj2.items.1.moreItems.1.name"
				]);
			});

			it('should correctly traverse multiple paths when an array of strings is provided', () => {
				const paths = ['user.name', 'user.contacts.phone'];
				const results: any[] = [];

				const sampleObject = {
					user: {
						name: 'John Doe',
						age: 30,
						contacts: {
							phone: '123-456-7890',
							email: 'john.doe@example.com'
						}
					},
					items: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }]
				};

				traverse(sampleObject, paths, ({ purePath, value }) => {
					results.push({ path: purePath, value });
					return true;
				});

				expect(results).toEqual([
					{
						"path": "user",
						"value": {
							"name": "John Doe",
							"age": 30,
							"contacts": {
								"phone": "123-456-7890",
								"email": "john.doe@example.com"
							}
						}
					},
					{
						"path": "user.name",
						"value": "John Doe"
					},
					{
						"path": "user",
						"value": {
							"name": "John Doe",
							"age": 30,
							"contacts": {
								"phone": "123-456-7890",
								"email": "john.doe@example.com"
							}
						}
					},
					{
						"path": "user.contacts",
						"value": {
							"phone": "123-456-7890",
							"email": "john.doe@example.com"
						}
					},
					{
						"path": "user.contacts.phone",
						"value": "123-456-7890"
					}
				]);
			});

			it("Will escape keys that contain periods in the reported paths", () => {
				const results: any[] = [];

				traverse({"a.b": {c: 1}}, `${escape("a.b")}.c`, ({purePath, flatPath, key, value}) => {
					results.push({purePath, flatPath, key, value});
					return true;
				});

				expect(results).toEqual([
					{purePath: "a\\.b", flatPath: "a\\.b", key: "a.b", value: {c: 1}},
					{purePath: "a\\.b.c", flatPath: "a\\.b.c", key: "c", value: 1}
				]);
			});

			it("Will pass options through when given an array of paths", () => {
				const paths: string[] = [];

				traverse({A: 1, B: 2}, ["a", "b"], ({purePath}) => {
					paths.push(purePath);
					return true;
				}, {transformKey: (key: string) => key.toUpperCase()});

				expect(paths).toEqual(["A", "B"]);
			});

			it("Will stop at missing or primitive values instead of throwing", () => {
				const results: any[] = [];
				const operation = ({purePath, value}: any) => {
					results.push({purePath, value});
					return true;
				};

				traverse(null, "a.b", operation);
				traverse(undefined, "a.b", operation);
				traverse(null, "a", operation);
				traverse({a: {b: "str"}}, "a.b.length", operation);

				expect(results).toEqual([
					{purePath: "a", value: undefined},
					{purePath: "a", value: undefined},
					{purePath: "a", value: undefined},
					{purePath: "a", value: {b: "str"}},
					{purePath: "a.b", value: "str"}
				]);
			});

			it("Will do nothing for a blank path", () => {
				const operation = jest.fn(() => true);
				traverse({a: 1}, "", operation);

				expect(operation).not.toHaveBeenCalled();
			});

			it("Will throw if the path is not a string", () => {
				expect(() => traverse({}, 5 as any, () => true)).toThrow("Path argument must be a string");
			});
		});
	});
});