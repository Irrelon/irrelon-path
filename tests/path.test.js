const {describe, it, assert} = require("mocha-expect");
const {
	countLeafNodes,
	diff,
	down,
	findOnePath,
	findPath,
	flatten,
	flattenValues,
	furthest,
	get,
	isNotEqual,
	join,
	joinEscaped,
	leafNodes,
	match,
	pop,
	pullVal,
	pushVal,
	set,
	shift,
	type,
	unSet,
	up,
	update,
	updateImmutable,
	values,
	split
} = require("../src/Path");

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
			const obj = {
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
			const obj = {
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
			const obj = {
				"obj": [{
					"other": {
						moo: "foo"
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
						moo: "foo"
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
		
		it("Will handle an infinite recursive structure", () => {
			const obj = {
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
			debugger;
			const result = split(path);
			
			assert.strictEqual(result.length, 2, "The result length is correct");
			assert.strictEqual(result[0], "foo", "The result is correct");
			assert.strictEqual(result[1], "test@test\\.com", "The result is correct");
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
	});
	
	describe("set()", () => {
		it("Can set a value on the passed object at the correct path with auto-created objects", () => {
			const obj = {};
			
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
			const obj = {};
			
			const newObj = set(obj, "arr.0", "foo");
			
			assert.strictEqual(obj.arr[0], "foo", "The value was set correctly");
			assert.strictEqual(newObj, obj, "The object reference is the same");
		});
		
		it("Can set a value on the passed object where the leaf node is an object", () => {
			const obj = {
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
				const result = findPath("Bookshop1", "Bookshop1");
				
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
				
				assert.strictEqual(result.path, "");
			});
			
			it("Will return the correct path for an object nested string", () => {
				const result = findOnePath([{"_id": "Bookshop1"}], "Bookshop1");
				
				assert.strictEqual(result.path, "0._id");
			});
			
			it("Will return the correct path for a nested equal object", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"profile": {"_id": "Bookshop1"}});
				
				assert.strictEqual(result.path, "");
			});
			
			it("Will return the correct path for an array nested string", () => {
				const result = findOnePath([{"_id": "Bookshop1"}], {"_id": "Bookshop1"});
				
				assert.strictEqual(result.path, "0");
			});
			
			it("Will return the correct path for a single-level nested string", () => {
				const result = findOnePath({"profile": {"_id": "Bookshop1"}}, {"_id": "Bookshop1"});
				
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
		it("Will return an array of paths for all leafs in an array structure that differ from the other structure", () => {
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
			const obj = {};
			
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
			const obj = [];
			
			assert.strictEqual(obj.length, 0, "The array is empty");
			
			pushVal(obj, "", "New val");
			
			assert.strictEqual(obj.length, 1, "The array is no longer empty");
			assert.strictEqual(obj[0], "New val", "The value is correct");
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
			const resultObj = update(obj, {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});
			
			assert.strictEqual(resultObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.strictEqual(obj, resultObj, "The changes were made by reference");
		});
	});
	
	describe("updateImmutable()", () => {
		it("Applies the correct values to multiple paths", () => {
			const obj = {};
			const resultObj = updateImmutable(obj, {
				"foo": "fooVal",
				"bar.one.two": "Three"
			});
			
			assert.strictEqual(resultObj.foo, "fooVal", "Value is correct for single noted path");
			assert.strictEqual(resultObj.bar.one.two, "Three", "Value is correct for multi noted path");
			assert.notStrictEqual(obj, resultObj, "The changes were made by value");
		});
	});
});