const {describe, it, assert} = require("mocha-expect");
const {
	get,
	set,
	setImmutable,
	furthest,
	values,
	flatten,
	flattenValues,
	countLeafNodes,
	findPath,
	findOnePath,
	type,
	match,
	isNotEqual,
	leafNodes,
	diff
} = require("../src/Path");

describe("Path", () => {
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
	});
	
	describe("set()", () => {
		it("Can set a value on the passed object at the correct path with auto-created objects", () => {
			const obj = {};
			
			set(obj, "foo.bar.thing", "foo");
			
			assert.strictEqual(obj.foo.bar.thing, "foo", "The value was set correctly");
		});
		
		it("Can set a value on the passed object with an array index at the correct path", () => {
			const obj = {
				"arr": [1]
			};
			
			set(obj, "arr.1", "foo");
			
			assert.strictEqual(obj.arr[0], 1, "The value was set correctly");
			assert.strictEqual(obj.arr[1], "foo", "The value was set correctly");
		});
		
		it("Can set a value on the passed object with an array index when no array currently exists at the correct path", () => {
			const obj = {};
			
			set(obj, "arr.0", "foo");
			
			assert.strictEqual(obj.arr[0], "foo", "The value was set correctly");
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
			
			set(obj, "foo.bar.ram", {copy: true});
			
			assert.strictEqual(obj.foo.bar.ram.copy, true, "The value was set correctly");
		});
		
		it("Can set a value on the passed object with a single path key", () => {
			const obj = {
				"foo": true
			};
			
			set(obj, "foo", false);
			
			assert.strictEqual(obj.foo, false, "The value was set correctly");
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
			
			const newObj = setImmutable(obj, "shouldChange1.shouldChange2.shouldChange3.value", true);
			
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
			
			const newObj = setImmutable(obj, "foo.0.value", true);
			const newFooType = type(newObj.foo);
			
			assert.notStrictEqual(newObj, obj, "Root object is not the same");
			assert.strictEqual(fooType, newFooType, "Array type has not changed");
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
		it("Will return an array of paths for all leafs in a structure that differ from the other structure", () => {
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
			assert.strictEqual(result2[0], "0.arr.1.id", "The result value is correct");
			assert.strictEqual(result2[1], "0.type", "The result value is correct");
		});
		
		it("Will return an array of paths for all leafs in an object structure", () => {
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
			assert.strictEqual(result2[0], "rootArray.0.arr.1.id", "The result value is correct");
			assert.strictEqual(result2[1], "rootArray.0.type", "The result value is correct");
		});
	});
});