import assert from "node:assert";
import {
	countLeafNodes,
	diff,
	diffValues,
	down,
	escape,
	findOnePath,
	findPath,
	flatten,
	flattenValues,
	furthest,
	get,
	getMany,
	isNotEqual,
	join,
	joinEscaped,
	leafNodes,
	match,
	merge,
	mergeImmutable,
	pop,
	pullVal,
	pushVal,
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
	values
} from "../src/path";

describe("Path", () => {
	describe("join()", () => {
		it("Will join multiple paths together", () => {
			const result = join("test1", "test2");
			assert.strictEqual(result, "test1.test2", "Path is correct");
		});
	});

	describe("joinEscape()", () => {
		it("Will join multiple paths together escaped", () => {
			const result = joinEscaped("test1.com", "test2.com");
			assert.strictEqual(result, "test1\\.com.test2\\.com", "Path is correct");
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
				unSet(obj, "__proto__.unsetPolluted");
				assert.strictEqual(obj.unsetPolluted, false, "The object prototype cannot be polluted");
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
				unSetImmutable(obj, "__proto__.unsetPolluted");
				assert.strictEqual(obj.unsetPolluted, false, "The object prototype cannot be polluted");
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

	describe("findPath()", () => {
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

			const result1 = diff(obj1, obj2, "", true);

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

			const result1 = diff(obj1, obj2, "", true, 1);

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

			const result1 = diff(obj1, obj2, "", true, 2);

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

			const result1 = diff(obj1, obj2, "rootArray.0.arr");
			const result2 = diff(obj1, obj3, "rootArray.0.arr");

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
			const result2 = diffValues(obj1, obj3, "", true); // These should detect a difference

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

			const result1 = diff(obj1, obj2, "", true);

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

			const result1 = diff(obj1, obj2, "", true, 1);

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

			const result1 = diff(obj1, obj2, "", true, 2);

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

			const result1 = diff(obj1, obj2, "rootArray.0.arr");
			const result2 = diff(obj1, obj3, "rootArray.0.arr");

			assert.strictEqual(result1 instanceof Array, true, "The result is an array");
			assert.strictEqual(result1.length, 0, "The result value is correct");
			assert.strictEqual(result2 instanceof Array, true, "The result is an array");
			assert.strictEqual(result2.length, 1, "The result value is correct");
			assert.strictEqual(result2[0], "rootArray.0.arr.1.id", "The result value is correct");
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
			pushVal(obj, "__proto__.pushValPolluted", "newValue");
			assert.strictEqual(obj.pushValPolluted.length, 0, "The object prototype cannot be polluted");
		});
	});

	describe("pullVal()", () => {
		it("Will pull a string literal from an array at the given path", () => {
			const obj = {
				"foo": ["valueToPull"]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is populated");

			pullVal(obj, "foo", "valueToPull");

			assert.strictEqual(obj.foo.length, 0, "The array is empty");
			assert.strictEqual(obj.foo[0], undefined, "The value is correct");
		});

		it("Will pull a string literal from an array at the given path with immutability", () => {
			const obj = {
				"foo": ["valueToPull"]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is populated");

			const oldFoo = obj.foo;
			const newObj = pullVal(obj, "foo", "valueToPull", {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo, true, "The old array and new array are not the same reference");
			assert.strictEqual(obj.foo.length, 0, "The array empty");
		});

		it("Will pull a string literal from a nested array at the given path with immutability", () => {
			const obj = {
				"foo": {
					"bar": {
						"moo": ["valueToPull"]
					}
				}
			};

			assert.strictEqual(obj.foo.bar.moo.length, 1, "The array is populated");

			const oldFoo = obj.foo.bar.moo;
			const newObj = pullVal(obj, "foo.bar.moo", "valueToPull", {immutable: true});

			assert.strictEqual(obj !== newObj, true, "The old obj and new obj are not the same reference");
			assert.strictEqual(oldFoo !== newObj.foo.bar.moo, true, "The old array and new array are not the same reference");
			assert.strictEqual(obj.foo.bar.moo.length, 0, "The array empty");
		});

		it("Will pull a string literal from an array with a blank path (root)", () => {
			const obj = ["valueToPull"];

			assert.strictEqual(obj.length, 1, "The array is populated");

			pullVal(obj, "", "valueToPull");

			assert.strictEqual(obj.length, 0, "The array is empty");
			assert.strictEqual(obj[0], undefined, "The value is correct");
		});

		it("Will pull a object from an array at the given path", () => {
			const objToPull = {"bar": "ram you"};
			const obj = {
				"foo": [objToPull]
			};

			assert.strictEqual(obj.foo.length, 1, "The array is populated");
			assert.strictEqual(obj.foo[0], objToPull, "The value is correct");

			pullVal(obj, "foo", objToPull);

			assert.strictEqual(obj.foo.length, 0, "The array is empty");
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

			assert.strictEqual(obj.foo.length, 2, "The array is populated");
			assert.strictEqual(obj.foo[0]._id, "1", "The value is correct");
			assert.strictEqual(obj.foo[1]._id, "2", "The value is correct");

			pullVal(obj, "foo", {_id: "2"}, {"strict": false});

			assert.strictEqual(obj.foo.length, 1, "The array is empty");
			assert.strictEqual(obj.foo[0]._id, "1", "The value is correct");
			assert.strictEqual(obj.foo[1], undefined, "The value is correct");
		});

		it("Is not vulnerable to __proto__ pollution", () => {
			const obj: any = {};
			obj.__proto__.pushValPolluted = ["myExistingValue"];
			pullVal(obj, "__proto__.pushValPolluted", "myExistingValue");
			assert.strictEqual(obj.pushValPolluted.length, 1, "The object prototype cannot be polluted");
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
			update(obj, "", {__proto__: {polluted: true}});
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
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
			updateImmutable(obj, "", {__proto__: {polluted: true}});
			assert.strictEqual(obj.polluted, undefined, "The object prototype cannot be polluted");
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
	});
});