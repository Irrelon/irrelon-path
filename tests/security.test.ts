import assert from "node:assert";
import {
	countLeafNodes,
	countMatchingPathsInObject,
	decouple,
	diff,
	diffValues,
	distill,
	escape,
	findOnePath,
	findPath,
	flatten,
	flattenValues,
	get,
	hasMatchingPathsInObject,
	isEqual,
	leafNodes,
	merge,
	mergeImmutable,
	pullVal,
	pullValImmutable,
	pushVal,
	pushValImmutable,
	query,
	set,
	setImmutable,
	splicePath,
	unSet,
	unSetImmutable,
	update,
	updateImmutable,
	values
} from "../src/path";
import {createPrototypeGuard} from "./helpers/prototypeGuard";

const guard = createPrototypeGuard();

afterEach(() => {
	assert.deepStrictEqual(guard.collectAndRestore(), [], "A built-in prototype was modified");
});

// Untrusted payloads normally arrive as JSON. JSON.parse() is the only
// common way to get an own "__proto__" key (an object literal sets the
// prototype instead), so every attack payload must be built through it.
const json = (str: string) => JSON.parse(str);

const isPolluted = () => ({} as any).polluted !== undefined || "polluted" in {};

// Builds {"a": {"b": {"c": value}}} from "a.b.c" as raw JSON so that
// "__proto__" segments become own keys
const payloadFromPath = (path: string, value: string) => {
	return json(path.split(".").reduceRight((inner, key) => `{${JSON.stringify(key)}: ${inner}}`, JSON.stringify(value)));
};

describe("Security", () => {
	describe("Prototype pollution", () => {
		describe("merge()", () => {
			it("Ignores a __proto__ key in a JSON payload", () => {
				const result = merge({}, json('{"__proto__": {"polluted": "yes"}}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.strictEqual(Object.prototype.hasOwnProperty.call(result, "__proto__"), false, "The __proto__ key was not copied");
			});

			it("Ignores a nested __proto__ key in a JSON payload", () => {
				const result = merge({a: {}}, json('{"a": {"__proto__": {"polluted": "yes"}}}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(Object.getPrototypeOf(result.a), Object.prototype, "The nested prototype is unchanged");
			});

			it("Does not follow an inherited constructor into its prototype", () => {
				const result = merge({}, json('{"constructor": {"prototype": {"polluted": "yes"}}}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.deepStrictEqual(result.constructor, {prototype: {polluted: "yes"}}, "The data was merged as a plain own property");
			});

			it("Still merges into an own key named constructor", () => {
				const result = merge({constructor: {a: 1}}, json('{"constructor": {"b": 2}}'));

				assert.deepStrictEqual(result.constructor, {a: 1, b: 2}, "Own constructor key was merged");
			});

			it("Does not mutate built-in functions reached through inherited keys", () => {
				const result = merge({}, json('{"hasOwnProperty": {"injected": "yes"}}'));

				assert.strictEqual((Object.prototype.hasOwnProperty as any).injected, undefined, "The built-in function was modified");
				assert.deepStrictEqual(result.hasOwnProperty, {injected: "yes"}, "The data was merged as a plain own property");
			});

			it("Does not let a __proto__ payload change the prototype of an immutable result", () => {
				const result = mergeImmutable({}, json('{"__proto__": {"polluted": "yes"}}'));

				assert.strictEqual(result.polluted, undefined, "The result inherits attacker data");
				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
			});

			it("Handles a constructor.prototype payload immutably without throwing", () => {
				const result = mergeImmutable({}, json('{"constructor": {"prototype": {"polluted": "yes"}}}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.deepStrictEqual(result.constructor, {prototype: {polluted: "yes"}}, "The data was merged as a plain own property");
			});
		});

		describe("set() / setImmutable()", () => {
			it("Does not set the prototype via a single __proto__ key", () => {
				const obj: any = {};
				set(obj, "__proto__", {polluted: "yes"});

				assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype, "The prototype is unchanged");
				assert.strictEqual(obj.polluted, undefined, "The object does not inherit attacker data");
			});

			it("Replaces an inherited constructor with own data instead of reaching the prototype", () => {
				const obj: any = {};
				set(obj, "constructor.prototype.polluted", "yes");

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.deepStrictEqual(obj.constructor, {prototype: {polluted: "yes"}}, "Own data was created");
			});

			it("Does not pollute Array.prototype through an array", () => {
				set({arr: []}, "arr.__proto__.polluted", "yes");
				setImmutable([], "__proto__.polluted", "yes");

				assert.strictEqual(([] as any).polluted, undefined, "Array.prototype was polluted");
			});

			it("Blocks __proto__ when it is produced by transformKey", () => {
				const obj: any = {};
				set(obj, "a.polluted", "yes", {transformKey: (key: string) => key === "a" ? "__proto__" : key});
				setImmutable(obj, "a", {polluted: "yes"}, {transformKey: () => "__proto__"});

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype, "The prototype is unchanged");
			});

			it("Treats an escaped __proto__ segment as a harmless own key", () => {
				const obj: any = {};
				set(obj, escape("__proto__.polluted"), "yes");

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(obj["__proto__.polluted"], "yes", "The literal key was set");
			});
		});

		describe("unSet() / unSetImmutable()", () => {
			it("Cannot delete from Object.prototype via constructor.prototype", () => {
				const obj = {};
				const result = unSet(obj, "constructor.prototype.toString");

				assert.strictEqual(result, obj, "The original object is returned");
				assert.deepStrictEqual(Object.keys(obj), [], "No own keys were created");
			});

			it("Cannot delete from Object.prototype via __proto__ or transformKey", () => {
				unSet({}, "__proto__.toString");
				unSetImmutable({}, "__proto__.toString");
				unSet({a: {}}, "a.toString", {transformKey: (key: string) => key === "a" ? "__proto__" : key});
				unSet({}, "toString", {transformKey: () => "__proto__"});

				assert.strictEqual(typeof Object.prototype.toString, "function", "toString still exists");
			});
		});

		describe("update() / updateImmutable()", () => {
			it("Ignores __proto__ keys in a JSON update payload", () => {
				const obj: any = {};
				update(obj, "", json('{"__proto__": {"polluted": "yes"}}'));
				updateImmutable(obj, "", json('{"__proto__": {"polluted": "yes"}}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(Object.getPrototypeOf(obj), Object.prototype, "The prototype is unchanged");
			});

			it("Ignores __proto__ paths in a JSON update payload", () => {
				update({}, "", json('{"__proto__.polluted": "yes", "a.__proto__.polluted": "yes"}'));
				updateImmutable({}, "", json('{"__proto__.polluted": "yes"}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
			});

			it("Ignores a __proto__ basePath", () => {
				update({}, "__proto__", json('{"polluted": "yes"}'));

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
			});
		});

		describe("pushVal() / pullVal() / splicePath()", () => {
			it("pushVal() does not reach Object.prototype through constructor.prototype", () => {
				const obj: any = {};
				pushVal(obj, "constructor.prototype.polluted", "yes");

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.deepStrictEqual(obj.constructor, {prototype: {polluted: ["yes"]}}, "Own data was created");
			});

			it("pushVal() does not reach a writable function prototype", () => {
				function Legacy () {}
				const instance = new (Legacy as any)();

				pushVal(instance, "constructor.prototype.polluted", "yes");

				assert.strictEqual((Legacy.prototype as any).polluted, undefined, "Legacy.prototype was polluted");
				assert.strictEqual(new (Legacy as any)().polluted, undefined, "Other instances inherit attacker data");
			});

			it("pullVal() does not add keys to Object.prototype through constructor.prototype", () => {
				const obj = {};
				const result = pullVal(obj, "constructor.prototype.polluted", "x");

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(result, obj, "The original object is returned");
				assert.deepStrictEqual(Object.keys(obj), [], "No own keys were created");
			});

			it("splicePath() does not reach Object.prototype through constructor.prototype", () => {
				const obj = {};
				const result = splicePath(obj, "constructor.prototype.polluted", 0, 0, ["yes"]);

				assert.strictEqual(isPolluted(), false, "Object.prototype was polluted");
				assert.strictEqual(result, obj, "The original object is returned");
			});

			it("Does not modify an existing array on a prototype via __proto__", () => {
				const proto = {shared: ["original"]};
				const obj = Object.create(proto);

				pushVal(obj, "__proto__.shared", "yes");
				pullVal(obj, "__proto__.shared", "original");
				splicePath(obj, "__proto__.shared", 0, 1, []);
				pushValImmutable(obj, "__proto__.shared", "yes");
				pullValImmutable(obj, "__proto__.shared", "original");

				assert.deepStrictEqual(proto.shared, ["original"], "The prototype array was modified");
			});
		});

		describe("Every write function, every payload", () => {
			const payloadPaths = [
				"__proto__",
				"__proto__.polluted",
				"constructor.prototype",
				"constructor.prototype.polluted",
				"prototype.polluted",
				"a.__proto__.polluted",
				"a.constructor.prototype.polluted",
				"arr.__proto__.polluted",
				"arr.constructor.prototype.polluted",
				"arr.0.__proto__.polluted",
				"arr.0.constructor.prototype.polluted"
			];

			const writers: [string, (obj: any, path: string) => any][] = [
				["set", (obj, path) => set(obj, path, "yes")],
				["setImmutable", (obj, path) => setImmutable(obj, path, "yes")],
				["unSet", (obj, path) => unSet(obj, path)],
				["unSetImmutable", (obj, path) => unSetImmutable(obj, path)],
				["pushVal", (obj, path) => pushVal(obj, path, "yes")],
				["pushValImmutable", (obj, path) => pushValImmutable(obj, path, "yes")],
				["pullVal", (obj, path) => pullVal(obj, path, "yes")],
				["pullValImmutable", (obj, path) => pullValImmutable(obj, path, "yes")],
				["splicePath", (obj, path) => splicePath(obj, path, 0, 0, ["yes"])],
				["update", (obj, path) => update(obj, "", {[path]: "yes"})],
				["updateImmutable", (obj, path) => updateImmutable(obj, "", {[path]: "yes"})],
				["update (basePath)", (obj, path) => update(obj, path, {polluted: "yes"})],
				["merge", (obj, path) => merge(obj, payloadFromPath(path, "yes"))],
				["mergeImmutable", (obj, path) => mergeImmutable(obj, payloadFromPath(path, "yes"))]
			];

			describe.each(writers)("%s()", (name, write) => {
				it.each(payloadPaths)("Does not pollute built-ins with %s", (path) => {
					const fixture = {a: {}, arr: [{}]};

					assert.doesNotThrow(() => write(fixture, path), "The operation threw");
					assert.deepStrictEqual(guard.collectAndRestore(), [], "A built-in prototype was modified");
				});
			});
		});

		describe("Immutable copies of data with a __proto__ key", () => {
			const payload = () => json('{"__proto__": {"isAdmin": true}, "name": "x", "nested": {"__proto__": {"isAdmin": true}}}');

			const immutableOperations: [string, (obj: any) => any][] = [
				["setImmutable", (obj) => setImmutable(obj, "nested.name", "y")],
				["updateImmutable", (obj) => updateImmutable(obj, "nested", {name: "y"})],
				["unSetImmutable", (obj) => unSetImmutable(obj, "nested.missing.name")],
				["pushValImmutable", (obj) => pushValImmutable(obj, "nested.list", "y")],
				["mergeImmutable", (obj) => mergeImmutable(obj, {nested: {name: "y"}})],
				["decouple", (obj) => decouple(obj, {immutable: true})]
			];

			it.each(immutableOperations)("%s() keeps the key as own data instead of changing the prototype", (name, operation) => {
				const result = operation(payload());

				assert.strictEqual(result.isAdmin, undefined, "The result inherits attacker data");
				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.strictEqual(Object.prototype.hasOwnProperty.call(result, "__proto__"), true, "The own key was kept");
				assert.strictEqual(result.nested.isAdmin, undefined, "The nested result inherits attacker data");
			});
		});

		describe("Result objects built from data keys", () => {
			const payload = () => json('{"__proto__": {"isAdmin": true}}');

			it("flattenValues() stores a __proto__ key as own data", () => {
				const result = flattenValues(payload());

				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.strictEqual(result.isAdmin, undefined, "The result inherits attacker data");
				assert.deepStrictEqual(Object.keys(result), ["__proto__.isAdmin", "__proto__"], "Keys are own properties");
			});

			it("distill() stores a __proto__ path as own data", () => {
				const result = distill(payload(), ["__proto__"]);

				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.strictEqual(result.isAdmin, undefined, "The result inherits attacker data");
				assert.deepStrictEqual(Object.keys(result), ["__proto__"], "Keys are own properties");
			});

			it("values() stores a __proto__ path as own data", () => {
				const result = values(payload(), "__proto__.isAdmin");

				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.deepStrictEqual(Object.keys(result), ["__proto__", "__proto__.isAdmin"], "Keys are own properties");
			});

			it("diff() and diffValues() report a change under a __proto__ key", () => {
				const obj1 = json('{"__proto__": 1}');
				const obj2 = json('{"__proto__": 2}');
				const result = diffValues(obj1, obj2);

				assert.deepStrictEqual(diff(obj1, obj2), ["__proto__"], "The change was reported");
				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.strictEqual(result["__proto__"].val2, 2, "The difference is an own property");
			});

			it("query() stores a __proto__ query key as own data", () => {
				const result = query(json('{"__proto__": 1}'), json('{"__proto__": {"$in": [1]}}'));

				assert.strictEqual(Object.getPrototypeOf(result), Object.prototype, "The result prototype is unchanged");
				assert.deepStrictEqual(Object.keys(result), ["__proto__"], "Keys are own properties");
			});

			it("countMatchingPathsInObject() stores a __proto__ key as own data", () => {
				const result = countMatchingPathsInObject({}, payload());

				assert.strictEqual(Object.getPrototypeOf(result.matchedKeys), Object.prototype, "The result prototype is unchanged");
				assert.deepStrictEqual(Object.keys(result.matchedKeys), ["__proto__"], "Keys are own properties");
			});
		});
	});

	describe("Denial of service", () => {
		it("Copies a huge sparse array without allocating every index", () => {
			const start = Date.now();
			const result = updateImmutable({}, "", json('{"a.4000000000": 1, "a.0": 2}'));

			assert.ok(Date.now() - start < 1000, "The operation took too long");
			assert.strictEqual(result.a[0], 2, "The value was set");
			assert.strictEqual(result.a[4000000000], 1, "The value was kept");
			assert.strictEqual(result.a.length, 4000000001, "The length was kept");
			assert.strictEqual(1 in result.a, false, "Holes were preserved");
		});

		it("Repeated immutable operations on a huge sparse array stay fast", () => {
			const start = Date.now();
			const first = setImmutable({}, "a.4000000000", 1);
			const second = setImmutable(first, "a.1", 2);
			const third = unSetImmutable(second, "a.1");

			assert.ok(Date.now() - start < 1000, "The operations took too long");
			assert.strictEqual(first.a[1], undefined, "The original was not modified");
			assert.strictEqual(second.a[1], 2, "The value was set");
			assert.strictEqual(1 in third.a, false, "The value was removed");
		});

		it("Keeps decoupled copies of large dense arrays identical", () => {
			const arr = Array.from({length: 1000001}, (_, index) => index);
			const result = decouple(arr, {immutable: true});

			assert.notStrictEqual(result, arr, "A new array was returned");
			assert.strictEqual(result.length, arr.length, "The length is the same");
			assert.strictEqual(result[1000000], 1000000, "The values were copied");
		});

		describe("Data with an own hasOwnProperty key does not crash", () => {
			const data = () => json('{"hasOwnProperty": 1, "a": {"hasOwnProperty": 2, "b": 3}}');

			it("Works with update()", () => {
				assert.deepStrictEqual(update({}, "", data()), {hasOwnProperty: 1, a: {hasOwnProperty: 2, b: 3}});
			});

			it("Works with unSet()", () => {
				assert.deepStrictEqual(unSet(data(), "a.b"), {hasOwnProperty: 1, a: {hasOwnProperty: 2}});
				assert.deepStrictEqual(unSet(data(), "hasOwnProperty"), {a: {hasOwnProperty: 2, b: 3}});
			});

			it("Works with flatten(), flattenValues() and leafNodes()", () => {
				assert.deepStrictEqual(flatten(data()), ["hasOwnProperty", "a", "a.hasOwnProperty", "a.b"]);
				assert.deepStrictEqual(Object.keys(flattenValues(data())), ["hasOwnProperty", "a.hasOwnProperty", "a.b", "a"]);
				assert.deepStrictEqual(leafNodes(data()), ["hasOwnProperty", "a.hasOwnProperty", "a.b"]);
			});

			it("Works with countLeafNodes()", () => {
				assert.strictEqual(countLeafNodes(data()), 3);
			});

			it("Works with findPath() and findOnePath()", () => {
				assert.deepStrictEqual(findPath(data(), 3), {match: true, path: ["a.b"]});
				assert.deepStrictEqual(findOnePath(data(), 3), {match: true, path: "a.b"});
			});

			it("Works with hasMatchingPathsInObject() and countMatchingPathsInObject()", () => {
				assert.strictEqual(hasMatchingPathsInObject(data(), data()), true);
				assert.strictEqual(countMatchingPathsInObject(data(), data()).matchedKeyCount, 3);
			});

			it("Works with query()", () => {
				assert.deepStrictEqual(query(data(), json('{"hasOwnProperty": {"$in": [1]}}')), {hasOwnProperty: ["hasOwnProperty"]});
			});
		});

		describe("Objects without a prototype do not crash", () => {
			const data = () => {
				const inner = Object.create(null);
				inner.b = 1;

				const outer = Object.create(null);
				outer.a = inner;

				return outer;
			};

			it("Works with read functions", () => {
				assert.strictEqual(get(data(), "a.b"), 1);
				assert.deepStrictEqual(flatten(data()), ["a", "a.b"]);
				assert.deepStrictEqual(leafNodes(data()), ["a.b"]);
				assert.strictEqual(countLeafNodes(data()), 1);
				assert.deepStrictEqual(findPath(data(), 1), {match: true, path: ["a.b"]});
				assert.strictEqual(hasMatchingPathsInObject(data(), data()), true);
				assert.deepStrictEqual(diff(data(), {a: {b: 2}}), ["a.b"]);
				assert.strictEqual(isEqual(data(), data(), "", true), true);
			});

			it("Works with write functions", () => {
				assert.strictEqual(set(data(), "a.c", 2).a.c, 2);
				assert.strictEqual(unSet(data(), "a.b").a.b, undefined);
				assert.deepStrictEqual(Object.keys(update(data(), "", {"a.c": 2}).a), ["b", "c"]);
			});
		});
	});
});
