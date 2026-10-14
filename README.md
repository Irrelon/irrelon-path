# Irrelon Path

A powerful JSON path processor with no third-party dependencies.
Read, write, delete, compare, search and flatten JavaScript object
trees using a simple dot-delimited path format e.g. `"user.address.city"`.

* Get, set and delete deeply nested values, including inside arrays
* Push, pull and splice array values at any path
* Immutable versions of every write operation with structural sharing,
  ideal for React, Redux and other state management systems
* Diff and compare objects, find the paths to matching data and flatten
  objects into paths
* Safe by default: protected against prototype pollution
* TypeScript types included, zero runtime dependencies

# Contents

* [Install](#install)
* [Quick Start](#quick-start)
* [Paths](#paths)
	* [Path Syntax](#path-syntax)
	* [Keys Containing Periods or Backslashes](#keys-containing-periods-or-backslashes)
* [Behaviour](#behaviour)
	* [Missing Data Never Throws](#missing-data-never-throws)
	* [Default Values](#default-values)
	* [How set() Creates Missing Path Parts](#how-set-creates-missing-path-parts)
	* [Mutable and Immutable Operations](#mutable-and-immutable-operations)
	* [Options](#options)
* [Security](#security)
* [API Reference](#api-reference)
	* [Reading Data](#reading-data): [get()](#get), [getMany()](#getmany), [values()](#values),
	  [furthest()](#furthest), [distill()](#distill), [traverse()](#traverse), [query()](#query)
	* [Writing Data](#writing-data): [set()](#set), [setImmutable()](#setimmutable),
	  [unSet()](#unset), [unSetImmutable()](#unsetimmutable), [update()](#update),
	  [updateImmutable()](#updateimmutable), [pushVal()](#pushval),
	  [pushValImmutable()](#pushvalimmutable), [pullVal()](#pullval),
	  [pullValImmutable()](#pullvalimmutable), [splicePath()](#splicepath),
	  [merge()](#merge), [mergeImmutable()](#mergeimmutable), [decouple()](#decouple)
	* [Comparing and Searching](#comparing-and-searching): [diff()](#diff),
	  [diffValues()](#diffvalues), [isEqual()](#isequal), [isNotEqual()](#isnotequal),
	  [match()](#match), [findPath()](#findpath), [findOnePath()](#findonepath),
	  [hasMatchingPathsInObject()](#hasmatchingpathsinobject),
	  [countMatchingPathsInObject()](#countmatchingpathsinobject)
	* [Inspecting Structure](#inspecting-structure): [flatten()](#flatten),
	  [flattenValues()](#flattenvalues), [leafNodes()](#leafnodes),
	  [countLeafNodes()](#countleafnodes), [type()](#type)
	* [Working With Path Strings](#working-with-path-strings): [join()](#join),
	  [joinEscaped()](#joinescaped), [escape()](#escape), [unEscape()](#unescape),
	  [split()](#split), [clean()](#clean), [chop()](#chop), [up()](#up),
	  [down()](#down), [pop()](#pop), [shift()](#shift), [push()](#push),
	  [isCompositePath()](#iscompositepath), [isNonCompositePath()](#isnoncompositepath)
	* [Helpers](#helpers): [keyDedup()](#keydedup),
	  [returnWhatWasGiven()](#returnwhatwasgiven), [wildcardToZero()](#wildcardtozero),
	  [numberToWildcard()](#numbertowildcard)
* [TypeScript](#typescript)
* [Upgrading](#upgrading)
	* [Version 8.x Breaking Changes](#version-8x-breaking-changes)
	* [Version 5.x Breaking Changes](#version-5x-breaking-changes)
	* [Version 3.x Breaking Changes](#version-3x-breaking-changes)
	* [Version 2.x Breaking Changes](#version-2x-breaking-changes)
* [Contributing](#contributing)
* [License](#license)

# Install

```bash
npm i @irrelon/path
```

The package is published as CommonJS compiled to ES2015 and works in
Node.js and in browsers via any bundler. TypeScript type definitions are
included.

# Quick Start

```js
const {get, set, setImmutable, unSet, diff} = require("@irrelon/path");

const user = {
	"name": "Jim",
	"address": {
		"city": "London"
	},
	"roles": ["admin", "editor"]
};

console.log(get(user, "address.city")); // Logs: London
console.log(get(user, "roles.1")); // Logs: editor
console.log(get(user, "address.postcode", "Unknown")); // Logs: Unknown

// Set a value, creating any missing objects on the way
set(user, "address.postcode", "N1 9GU");
console.log(user.address.postcode); // Logs: N1 9GU

// Remove a value
unSet(user, "address.postcode");
console.log("postcode" in user.address); // Logs: false

// Get a new object with the change, leaving the original untouched
const renamed = setImmutable(user, "name", "James");
console.log(user.name); // Logs: Jim
console.log(renamed.name); // Logs: James
console.log(renamed.address === user.address); // Logs: true

// Find what changed
console.log(diff(user, renamed)); // Logs: ["name"]
```

With ES modules or TypeScript:

```ts
import {get, set} from "@irrelon/path";
```

# Paths

## Path Syntax

A path is a string of keys separated by periods. Array elements are
addressed by their index like any other key.

```js
const {get} = require("@irrelon/path");

const obj = {
	"users": [{
		"name": "Jim",
		"pets": [{"name": "Rex"}]
	}]
};

console.log(get(obj, "users.0.name")); // Logs: Jim
console.log(get(obj, "users.0.pets.0.name")); // Logs: Rex
```

* A leading period is ignored, so `".users.0"` is the same as `"users.0"`
  (see [clean()](#clean)).
* An empty path `""` refers to the object itself when reading. Write
  functions like [set()](#set) do nothing when given an empty path, while
  [pushVal()](#pushval), [pullVal()](#pullval) and [splicePath()](#splicepath)
  treat it as "the passed object is the array to operate on".
* `$` is used as an array wildcard by some options, see
  [get()](#get) `wildcardExpansion`, [furthest()](#furthest) and
  [wildcardToZero()](#wildcardtozero).

## Keys Containing Periods or Backslashes

Keys such as email addresses or domain names contain periods that would
otherwise be read as path delimiters:

```js
const {get, escape, joinEscaped} = require("@irrelon/path");

const obj = {
	"users": {
		"test@test.com": {
			"name": "My Test User"
		}
	}
};

// Without escaping, this looks for "test@test" then "com"
console.log(get(obj, "users.test@test.com.name")); // Logs: undefined

// Escape the key to use it as a single path part
console.log(get(obj, `users.${escape("test@test.com")}.name`)); // Logs: My Test User

// Or escape and join several keys at once
console.log(get(obj, joinEscaped("users", "test@test.com", "name"))); // Logs: My Test User
```

The escaping rules are:

* `\.` is a literal period inside a key.
* `\\` is a literal backslash inside a key, so keys containing backslashes
  (e.g. `C:\temp`) can be escaped safely with [escape()](#escape).
* A backslash followed by any other character is kept as it is, so
  `"C:\temp"` still refers to a key named `C:\temp`.

**Every path returned by this library is escaped.** Paths from
[flatten()](#flatten), [flattenValues()](#flattenvalues),
[leafNodes()](#leafnodes), [diff()](#diff), [diffValues()](#diffvalues),
[findPath()](#findpath), [findOnePath()](#findonepath),
[traverse()](#traverse) and [query()](#query) can always be passed
straight back to [get()](#get), [set()](#set) and the other functions:

```js
const {flatten, get, unEscape, split} = require("@irrelon/path");

const obj = {"domains": {"www.google.com": {"visits": 3}}};
const paths = flatten(obj);

console.log(paths); // Logs: ["domains", "domains.www\\.google\\.com", "domains.www\\.google\\.com.visits"]
console.log(get(obj, paths[2])); // Logs: 3

// Use split() and unEscape() to get the original keys back
console.log(split(paths[2]).map(unEscape)); // Logs: ["domains", "www.google.com", "visits"]
```

# Behaviour

## Missing Data Never Throws

If data or an object to traverse does not exist, read functions return
`undefined` (or your default value) and write functions either create the
missing path or do nothing. They do not throw:

```js
const {get, unSet, pullVal, furthest} = require("@irrelon/path");

const obj = {
	"foo": null
};

console.log(get(obj, "foo.bar.one")); // Logs: undefined
console.log(furthest(obj, "foo.bar.one")); // Logs: foo
console.log(unSet(obj, "foo.bar.one") === obj); // Logs: true
console.log(pullVal(obj, "missing.array", "value") === obj); // Logs: true
```

Errors are only thrown for programming mistakes such as passing a path
that is not a string, or asking [pushVal()](#pushval),
[pullVal()](#pullval) or [splicePath()](#splicepath) to operate on an
existing value that is not an array.

Traversal stops at values that are not objects or arrays, so a path
never reads properties from inside strings, numbers or functions:

```js
const {get} = require("@irrelon/path");

console.log(get({"name": "Jim"}, "name.length")); // Logs: undefined
```

## Default Values

[get()](#get) and [getMany()](#getmany) accept a default value that is
returned when the value at the path is `undefined`. A `null` value is a
real value, so the default is not used:

```js
const {get} = require("@irrelon/path");

const obj = {
	"foo": null
};

console.log(get(obj, "foo")); // Logs: null
console.log(get(obj, "foo.bar.one", "My Default Value")); // Logs: My Default Value
console.log(get(obj, "missing", 0)); // Logs: 0
```

## How set() Creates Missing Path Parts

When [set()](#set), [update()](#update) or [pushVal()](#pushval) need to
create part of a path, they create an **array** if the next key is an
array index (`0`, `1`, `2`...) and an **object** otherwise. Keys such as
`"-1"`, `"01"` or `"1.5"` are not array indexes, so they create objects.

```js
const {set} = require("@irrelon/path");

console.log(set({}, "users.0.name", "Jim")); // Logs: {"users": [{"name": "Jim"}]}
console.log(set({}, "grid.0.1", "x")); // Logs: {"grid": [[null, "x"]]}
console.log(set({}, "scores.-1", 10)); // Logs: {"scores": {"-1": 10}}
```

> The second example logs `null` because JSON cannot show the empty slot
> at index `0` of the inner array.

If a value in the middle of the path exists but is not an object or
array (e.g. a string or `null`), [set()](#set) replaces it with a new
object or array so the value can be set:

```js
const {set} = require("@irrelon/path");

console.log(set({"profile": null}, "profile.age", 42)); // Logs: {"profile": {"age": 42}}
```

## Mutable and Immutable Operations

By default write functions modify the object you pass in and return it.
Every write function also has an immutable mode that leaves the original
untouched and returns a new object instead:

| Mutable                      | Immutable                                        |
|------------------------------|--------------------------------------------------|
| [set()](#set)                | [setImmutable()](#setimmutable)                  |
| [unSet()](#unset)            | [unSetImmutable()](#unsetimmutable)              |
| [update()](#update)          | [updateImmutable()](#updateimmutable)            |
| [pushVal()](#pushval)        | [pushValImmutable()](#pushvalimmutable)          |
| [pullVal()](#pullval)        | [pullValImmutable()](#pullvalimmutable)          |
| [splicePath()](#splicepath)  | `splicePath(..., {immutable: true})`             |
| [merge()](#merge)            | [mergeImmutable()](#mergeimmutable)              |

The immutable versions are the same as passing `{immutable: true}` in the
options of the mutable version.

Immutable operations use **structural sharing**: only the objects and
arrays on the path that changed are copied, everything else keeps the
same reference. This means you can detect exactly what changed with a
cheap `===` check, which is what React, Redux and similar libraries rely
on:

```js
const {setImmutable} = require("@irrelon/path");

const state = {
	"user": {"name": "Jim", "settings": {"theme": "dark"}},
	"todos": [{"title": "Write docs"}]
};

const newState = setImmutable(state, "user.name", "James");

console.log(newState === state); // Logs: false
console.log(newState.user === state.user); // Logs: false
console.log(newState.user.settings === state.user.settings); // Logs: true
console.log(newState.todos === state.todos); // Logs: true
console.log(state.user.name); // Logs: Jim
```

When an immutable operation has nothing to change (e.g. unsetting a key
that doesn't exist, or pulling a value that isn't in the array), the
original object is returned so `===` comparisons stay `true`.

When copying, the library keeps the type of each value:

* Plain objects and arrays are shallow copied.
* Class instances keep their prototype, so their methods still work.
* `Date`, `RegExp`, `Map` and `Set` instances are copied with their data.
* Objects without a prototype (`Object.create(null)`) stay without one.
* Primitives and functions are used as they are.

See [decouple()](#decouple) for the function that does this.

## Options

Many functions accept an optional `options` object. The library never
modifies an options object you pass in, so it is safe to reuse one
between calls.

| Option              | Type       | Used by                                                                                                     | Description |
|---------------------|------------|-------------------------------------------------------------------------------------------------------------|-------------|
| `immutable`         | `boolean`  | [set()](#set), [unSet()](#unset), [update()](#update), [pushVal()](#pushval), [pullVal()](#pullval), [splicePath()](#splicepath), [merge()](#merge), [decouple()](#decouple) | Leave the original untouched and return a new object. See [Mutable and Immutable Operations](#mutable-and-immutable-operations). |
| `strict`            | `boolean`  | [pullVal()](#pullval)                                                                                       | Defaults to `true`. When `false`, the first array item matching the structure of the value is removed (see [match()](#match)). |
| `transformKey`      | `function` | [get()](#get), [set()](#set), [unSet()](#unset), [furthest()](#furthest), [values()](#values), [flatten()](#flatten), [flattenValues()](#flattenvalues), [traverse()](#traverse) | Called with each key in the path (after unescaping) and returns the key to actually use. |
| `transformRead`     | `function` | [flatten()](#flatten), [flattenValues()](#flattenvalues), [traverse()](#traverse)                           | Called with each object before it is read and returns the object to read from. |
| `transformWrite`    | `function` | [flattenValues()](#flattenvalues)                                                                           | Called with each value before it is written to the result. |
| `leavesOnly`        | `boolean`  | [flattenValues()](#flattenvalues)                                                                           | Only include leaf values, not the objects and arrays containing them. |
| `ignore`            | `RegExp`   | [flatten()](#flatten)                                                                                       | Keys matching the expression (and everything inside them) are skipped. |
| `wildcardExpansion` | `boolean`  | [get()](#get), [getMany()](#getmany)                                                                        | Treat `$` in a path as "every item in this array". |
| `arrayTraversal`    | `boolean`  | [get()](#get), [getMany()](#getmany)                                                                        | Look inside arrays automatically without an index in the path. |
| `arrayExpansion`    | `boolean`  | [get()](#get), [getMany()](#getmany)                                                                        | With `arrayTraversal`, return every matching value instead of the first. |
| `pathData`          | `object`   | [get()](#get), [getMany()](#getmany)                                                                        | Pass `{directPaths: []}` to receive the concrete path of each value found by array expansion. |

# Security

**Prototype pollution protection.** Paths and keys are frequently built
from user input, such as the body of an HTTP request. This library makes
sure that data can never be written to `Object.prototype` (or any other
prototype) through it:

* Writes to a `__proto__` key or through a `__proto__` path part are
  ignored by every write function: [set()](#set), [unSet()](#unset),
  [update()](#update), [pushVal()](#pushval), [pullVal()](#pullval),
  [splicePath()](#splicepath), [merge()](#merge) and their immutable
  versions. This includes keys produced by a `transformKey` option.
* Write functions never traverse into inherited properties or functions,
  so paths like `constructor.prototype.x` cannot reach a prototype. Where
  needed, an own property is created instead.
* `__proto__` keys that exist in your data as own properties (which is
  what `JSON.parse()` produces) are treated as normal data. Copies made
  by immutable operations and the objects returned by
  [flattenValues()](#flattenvalues), [diffValues()](#diffvalues),
  [distill()](#distill), [values()](#values), [query()](#query) and
  [countMatchingPathsInObject()](#countmatchingpathsinobject) keep them as
  own properties and never change their prototype.
* Data containing a key named `hasOwnProperty`, and objects created with
  `Object.create(null)`, are handled safely.

```js
const {merge, set} = require("@irrelon/path");

const payload = JSON.parse('{"__proto__": {"isAdmin": true}, "constructor": {"prototype": {"isAdmin": true}}}');

merge({}, payload);
set({}, "__proto__.isAdmin", true);
set({}, "constructor.prototype.isAdmin", true);

console.log({}.isAdmin); // Logs: undefined
```

**Recommendations for untrusted input.** The library is safe to use with
untrusted paths and data, but you should still validate them for your
application's own rules. For example, decide which paths a user is
allowed to change rather than accepting any path. Also be aware that a
path with a very large array index (e.g. `"items.4000000000"`) creates a
sparse array with a huge `length`. This library copies such arrays
efficiently, but other code such as `JSON.stringify()` will try to
output every empty slot.

**Reporting a vulnerability.** Please report security issues privately
through GitHub's [private vulnerability reporting](https://github.com/irrelon/irrelon-path/security/advisories/new)
rather than opening a public issue.

**Security history.**

| Advisory | Affected | Fixed in | Description |
|----------|----------|----------|-------------|
| Prototype pollution in `merge()` | 6.2.2 to 7.0.2 | 7.0.3, 8.0.0 | `merge()` and `mergeImmutable()` did not ignore `__proto__` keys or inherited properties in the merged data. Related hardening was applied to `pushVal()`, `pullVal()`, `splicePath()`, the immutable copy functions and functions that build result objects. Reported by Vishal Suwalka. |
| [CVE-2020-7708](https://github.com/advisories/GHSA-j7cg-h9v9-6vqp) | Before 4.7.0 | 4.7.0 | Prototype pollution in `set()`, `unSet()`, `pushVal()` and `pullVal()`. |

# API Reference

All functions are named exports:

```js
const {get, set} = require("@irrelon/path");
```

Some functions accept extra trailing parameters such as `objCache`,
`parentPath` or `tracking` that are documented as internal. They are used
when the function calls itself and should not be passed.

## Reading Data

### get

`get(obj, path, defaultVal?, options?)`

Gets a value from `obj` at the given `path`. If the value is `undefined`,
returns `defaultVal`.

> **Changed in 8.0.0**
>
> * An array of paths now returns the values. It previously returned an array of `undefined`.
> * Paths with a single key now apply `transformKey` and unescaping, e.g. `get({"a.b": 1}, "a\\.b")` now returns `1` instead of `undefined`.
> * The options object is no longer modified. Reusing an options object between calls no longer mixes results from previous calls, and `pathData.directPaths` is now correct for paths with several parts.
> * A path that is not a string throws `"Path argument must be a string"` instead of a `TypeError`.

| Param      | Type                 | Required | Default     | Description |
|------------|----------------------|----------|-------------|-------------|
| obj        | `Object` or `Array`  | Yes      |             | The object to read from. If `null` or `undefined`, `defaultVal` is returned. |
| path       | `string` or `string[]` | Yes    |             | The path to read. An empty path returns `obj`. An array of paths returns an array of values. |
| defaultVal | `any`                | No       | `undefined` | Returned when the value at the path is `undefined`. |
| options    | `Object`             | No       | `{}`        | Supports `transformKey`, `wildcardExpansion`, `arrayTraversal`, `arrayExpansion` and `pathData`. See [Options](#options). |

**Returns** the value at the path, or `defaultVal`.

**Throws** if `path` is not a string or an array of strings.

```js
const {get} = require("@irrelon/path");

const obj = {
	"myArr": [
		"hello",
		{"bar": "goodbye"}
	],
	"user": {"name": "Jim", "age": 22}
};

console.log(get(obj, "myArr.0")); // Logs: hello
console.log(get(obj, "myArr.1.bar")); // Logs: goodbye
console.log(get(obj, "user.missing", "default")); // Logs: default
console.log(get(obj, ["user.name", "user.age"])); // Logs: ["Jim", 22]
```

#### Searching arrays without an index

With `arrayTraversal`, arrays in the middle of a path are searched
automatically and the first defined value is returned. Add
`arrayExpansion` to get every value instead:

```js
const {get} = require("@irrelon/path");

const obj = {
	"orders": [
		{"items": [{"sku": "A1"}, {"sku": "B2"}]},
		{"items": [{"sku": "C3"}]}
	]
};

console.log(get(obj, "orders.items.sku", undefined, {arrayTraversal: true})); // Logs: A1
console.log(get(obj, "orders.items.sku", undefined, {arrayTraversal: true, arrayExpansion: true})); // Logs: ["A1", "B2", "C3"]
```

To find out where each value came from, pass a `pathData` object. Its
`directPaths` array receives the concrete path of each value:

```js
const {get} = require("@irrelon/path");

const obj = {
	"orders": [
		{"items": [{"sku": "A1"}, {"sku": "B2"}]},
		{"items": [{"sku": "C3"}]}
	]
};

const pathData = {"directPaths": []};
get(obj, "orders.items.sku", undefined, {arrayTraversal: true, arrayExpansion: true, pathData});

console.log(pathData.directPaths); // Logs: ["orders.0.items.0.sku", "orders.0.items.1.sku", "orders.1.items.0.sku"]
```

#### Wildcards

With `wildcardExpansion`, a `$` in the path means "every item in this
array". The result is an array of every value found:

```js
const {get} = require("@irrelon/path");

const obj = {
	"teams": [
		{"members": [{"name": "Ann"}, {"name": "Bob"}]},
		{"members": [{"name": "Cat"}]}
	]
};

console.log(get(obj, "teams.$.members.$.name", undefined, {wildcardExpansion: true})); // Logs: ["Ann", "Bob", "Cat"]
console.log(get(obj, "teams.$.members", undefined, {wildcardExpansion: true})); // Logs: [[{"name": "Ann"}, {"name": "Bob"}], [{"name": "Cat"}]]
```

### getMany

`getMany(data, path, defaultVal?, options?)`

Like [get()](#get) but always returns an array. If `data` is an array,
the path is read from every item in it. If the first key of the path
points to an array inside an item, every element of that array is
included too.

> **Changed in 8.0.0**
>
> * `null` and primitive items in an array are skipped instead of throwing a `TypeError`.
> * An escaped first key now finds arrays nested inside each item.
> * The options object is no longer modified, and `pathData.directPaths` is now correct for paths with several parts.

| Param      | Type                | Required | Default     | Description |
|------------|---------------------|----------|-------------|-------------|
| data       | `Object` or `Array` | Yes      |             | The object or array to read from. |
| path       | `string`            | Yes      |             | The path to read from `data` or from each item. |
| defaultVal | `any`               | No       | `undefined` | Used in place of values that are `undefined`. |
| options    | `Object`            | No       | `{}`        | The same options as [get()](#get). |

**Returns** an array of values. If nothing is found, returns `[]`, or
`[defaultVal]` when a default value is given.

```js
const {getMany} = require("@irrelon/path");

console.log(getMany({"user": {"name": "Jim"}}, "user.name")); // Logs: ["Jim"]
console.log(getMany([{"name": "Jim"}, {"name": "Ann"}, {"age": 3}], "name")); // Logs: ["Jim", "Ann"]
console.log(getMany([{"tags": ["a", "b"]}, {"tags": ["c"]}], "tags")); // Logs: ["a", "b", "c"]
console.log(getMany([], "name", "Nobody")); // Logs: ["Nobody"]
```

### values

`values(obj, path, options?)`

Walks the path and returns the value at every step of it, keyed by the
path to that step.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object to read from. |
| path    | `string`            | Yes      |         | The path to walk. |
| options | `Object`            | No       | `{}`    | Supports `transformKey`. |

**Returns** an object where each key is a path and each value is the
value at that path.

```js
const {values} = require("@irrelon/path");

const obj = {"user": {"address": {"city": "London"}}};

console.log(values(obj, "user.address.city"));
```

Outputs:

```json
{
	"user": {"address": {"city": "London"}},
	"user.address": {"city": "London"},
	"user.address.city": "London"
}
```

### furthest

`furthest(obj, path, options?)`

Finds how far along `path` the data exists and returns the path to the
deepest value that is not `undefined`.

> **Changed in 8.0.0**
>
> * No longer throws a `TypeError` when the path reaches `null`.
> * Paths with a single key now apply unescaping and `transformKey`, e.g. `furthest(["a"], "$")` now returns `"$"` instead of `""`.
> * Stops at primitive values instead of reading their properties, e.g. `furthest({a: "str"}, "a.length")` now returns `"a"` instead of `"a.length"`.
> * A path that is not a string throws `"Path argument must be a string"` instead of a `TypeError`.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object to read from. |
| path    | `string`            | Yes      |         | The path to follow. |
| options | `Object`            | No       | `{}`    | Supports `transformKey`, which defaults to [wildcardToZero()](#wildcardtozero) so that `$` matches the first array item. |

**Returns** the longest part of `path` that exists, or `""` if none of it
exists.

**Throws** if `path` is not a string.

```js
const {furthest} = require("@irrelon/path");

const myData = {
	"profile": {
		"id": 1,
		"name": "Ron Swanson"
	},
	"posts": [{"title": "Hello"}]
};

console.log(furthest(myData, "profile.id.bson")); // Logs: profile.id
console.log(furthest(myData, "posts.$.title.length")); // Logs: posts.$.title
console.log(furthest(myData, "missing.path")); // Logs:
```

### distill

`distill(obj, pathArr)`

Gets the value of each path in `pathArr` and returns them as an object
keyed by path.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object to read from. |
| pathArr | `string[]`          | Yes      |         | The paths to read. |

**Returns** an object where each key is one of the paths and each value is
the value at that path (or `undefined`).

```js
const {distill} = require("@irrelon/path");

const obj = {
	"user": {
		"firstName": "Jim",
		"lastName": "Jones",
		"age": 22
	}
};

console.log(distill(obj, ["user.firstName", "user.lastName"])); // Logs: {"user.firstName": "Jim", "user.lastName": "Jones"}
```

### traverse

`traverse(obj, path, operation, options?)`

Calls `operation` for every step of `path`. When a step is an array, the
operation is called for each item in the array and the rest of the path
is followed inside every item.

> **Changed in 8.0.0**
>
> * Reported paths are escaped.
> * Stops at missing or primitive values. The operation was previously called for the rest of the path with incorrect paths, e.g. `"b"` instead of `"a.b"`.
> * Single-key paths containing an escaped period now read the right key.
> * `options` are now applied when an array of paths is passed and inside array items.
> * A path that is not a string throws `"Path argument must be a string"` instead of a `TypeError`.

| Param     | Type                   | Required | Default | Description |
|-----------|------------------------|----------|---------|-------------|
| obj       | `Object` or `Array`    | Yes      |         | The object to walk. |
| path      | `string` or `string[]` | Yes      |         | The path to walk. An array of paths walks each of them in turn. |
| operation | `function`             | Yes      |         | Called with `{purePath, flatPath, key, value}` for each step. |
| options   | `Object`               | No       | `{}`    | Supports `transformKey` and `transformRead`. |

The `operation` function receives an object with:

| Property   | Description |
|------------|-------------|
| `purePath` | The escaped path to this value including array indexes, e.g. `"teams.0.name"`. |
| `flatPath` | The escaped path without array indexes, e.g. `"teams.name"`. |
| `key`      | The key of this value in its parent. |
| `value`    | The value at this step, or `undefined` if it doesn't exist. |

Walking stops at a value that is missing or not an object, because the
rest of the path cannot exist inside it.

**Throws** if `path` is not a string or an array of strings.

```js
const {traverse} = require("@irrelon/path");

const obj = {
	"teams": [
		{"name": "Red"},
		{"name": "Blue"}
	]
};

const visited = [];

traverse(obj, "teams.name", ({purePath, flatPath}) => {
	visited.push(`${purePath} (${flatPath})`);
	return true;
});

console.log(visited);
```

Outputs:

```json
[
	"teams (teams)",
	"teams.0 (teams)",
	"teams.0.name (teams.name)",
	"teams.1 (teams)",
	"teams.1.name (teams.name)"
]
```

### query

`query(obj, query)`

Finds the paths to every value that matches a set of criteria. Each key
of `query` is a path (array indexes are not needed, arrays are searched
automatically) and each value describes the criteria for that path.

> **Changed in 8.0.0**
>
> * Returned paths are escaped, and query paths containing escaped periods now match.

| Param | Type     | Required | Default | Description |
|-------|----------|----------|---------|-------------|
| obj   | `Object` | Yes      |         | The object to search. |
| query | `Object` | Yes      |         | The query, see below. |

Supported operators:

| Operator | Value | Matches when |
|----------|-------|--------------|
| `$in`    | An array of values and/or functions, or a single function | The value is strictly equal (`===`) to one of the values, or one of the functions returns `true` for it. |

**Returns** an object with the same keys as `query`, each containing an
array of the escaped paths to the matching values.

```js
const {query} = require("@irrelon/path");

const obj = {
	"users": [
		{"name": "Jim", "role": "admin"},
		{"name": "Ann", "role": "user"},
		{"name": "", "role": "admin"}
	]
};

const result = query(obj, {
	"users.role": {"$in": ["admin"]},
	"users.name": {"$in": [(name) => name.length === 0]}
});

console.log(result);
```

Outputs:

```json
{
	"users.role": ["users.0.role", "users.2.role"],
	"users.name": ["users.2.name"]
}
```

## Writing Data

### set

`set(obj, path, val, options?)`

Sets `val` in `obj` at the given `path`, creating any missing objects or
arrays along the way (see
[How set() Creates Missing Path Parts](#how-set-creates-missing-path-parts)).
This modifies `obj` unless `options.immutable` is `true`. Use
[setImmutable()](#setimmutable) for an immutable update.

> **Changed in 8.0.0**
>
> * `set({}, "arr.0.name", "x")` now creates `{arr: [{name: "x"}]}`. It previously created an array inside the array and the value was lost.
> * Negative numbers such as `"-1"` now create objects instead of arrays. Other keys that are not canonical array indexes, such as `"01"`, already created objects.
> * An escaped key in the middle of a path no longer creates a stray key containing the backslash, and no longer replaces existing data inside the escaped key.
> * A path that is not a string throws `"Path argument must be a string"` instead of a `TypeError`.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object to set the value in. |
| path    | `string`            | Yes      |         | The path to set. |
| val     | `any`               | Yes      |         | The value to set. |
| options | `Object`            | No       | `{}`    | Supports `immutable` and `transformKey`. |

**Returns** `obj` (or the new object when immutable). Returns `undefined`
and does nothing if `obj` is not an object or `path` is empty.

**Throws** if `path` is not a string.

```js
const {set, get} = require("@irrelon/path");

const obj = {
	"foo": null
};

console.log(get(obj, "foo.bar")); // Logs: undefined

set(obj, "foo.bar", "hello");

console.log(get(obj, "foo.bar")); // Logs: hello
console.log(set(obj, "list.0", "first")); // Logs: {"foo": {"bar": "hello"}, "list": ["first"]}
```

### setImmutable

`setImmutable(obj, path, val, options?)`

The same as [set()](#set) with `options.immutable` set to `true`. Returns
a new object with the change and does not modify `obj`. Objects that were
not on the changed path keep the same reference (see
[Mutable and Immutable Operations](#mutable-and-immutable-operations)).

> **Changed in 8.0.0**
>
> * Includes all the changes to [set()](#set).
> * Copies keep the prototype of class instances, the data of `Date`, `RegExp`, `Map` and `Set` values and the `null` prototype of `Object.create(null)` objects. They previously became plain objects.
> * An own `__proto__` key in the data (e.g. from `JSON.parse()`) is kept as data. It previously became the prototype of the copy.

```js
const {setImmutable, get} = require("@irrelon/path");

const obj = {
	"foo": {
		"bar": "goodbye",
		"subBar": {
			"somethingElse": true
		}
	},
	"otherObj": {
		"enabled": true
	}
};

const newObj = setImmutable(obj, "foo.bar", "hello");

// The original object is unmodified
console.log(get(obj, "foo.bar")); // Logs: goodbye

// The new object has the new value
console.log(get(newObj, "foo.bar")); // Logs: hello

// Objects that were not modified still share a reference
console.log(obj.otherObj === newObj.otherObj); // Logs: true
console.log(obj.foo.subBar === newObj.foo.subBar); // Logs: true

// Objects on the modified path are new
console.log(obj.foo === newObj.foo); // Logs: false
```

### unSet

`unSet(obj, path, options?)`

Deletes the key at the given `path`. Only own properties are deleted,
inherited properties are never touched.

> **Changed in 8.0.0**
>
> * A primitive in the middle of the path is no longer replaced with `undefined`. `unSet({a: "hello"}, "a.b")` previously set `a` to `undefined`.
> * Paths through inherited properties such as `constructor.prototype.x` are ignored. They previously set `constructor` to `undefined`.
> * `transformKey` is used both to check for and to delete the key. The untransformed key was previously checked.
> * Data with a key named `hasOwnProperty`, and `Object.create(null)` objects, no longer throw.
> * A path that is not a string throws `"Path argument must be a string"` instead of a `TypeError`.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object to delete from. |
| path    | `string`            | Yes      |         | The path of the key to delete. |
| options | `Object`            | No       | `{}`    | Supports `immutable` and `transformKey`. |

**Returns** `obj` (or the new object when immutable). If there is nothing
to delete, the original `obj` is returned even in immutable mode. Returns
`undefined` if `obj` is not an object or `path` is empty.

**Throws** if `path` is not a string.

> Deleting an array index with unSet() leaves an empty slot, the same as
> the `delete` operator. Use [splicePath()](#splicepath) or
> [pullVal()](#pullval) to remove array items.

```js
const {unSet} = require("@irrelon/path");

const obj = {
	"foo": {
		"bar": [{
			"moo": true,
			"baa": "ram you"
		}]
	}
};

unSet(obj, "foo.bar.0.baa");

console.log(obj.foo.bar[0]); // Logs: {"moo": true}
console.log(unSet(obj, "foo.missing.key") === obj); // Logs: true
```

### unSetImmutable

`unSetImmutable(obj, path, options?)`

The same as [unSet()](#unset) with `options.immutable` set to `true`.

> **Changed in 8.0.0**
>
> * Includes all the changes to [unSet()](#unset) and the copy changes listed for [setImmutable()](#setimmutable).

```js
const {unSetImmutable} = require("@irrelon/path");

const obj = {"user": {"name": "Jim", "password": "secret"}, "other": {}};
const safe = unSetImmutable(obj, "user.password");

console.log(safe.user); // Logs: {"name": "Jim"}
console.log(obj.user.password); // Logs: secret
console.log(safe.other === obj.other); // Logs: true
```

### update

`update(obj, basePath, updateData, options?)`

Applies several [set()](#set) operations at once. Each key of
`updateData` is a path (relative to `basePath`) and each value is the
value to set at that path.

> **Changed in 8.0.0**
>
> * Includes all the changes to [set()](#set).
> * Update data containing a key named `hasOwnProperty` no longer throws.

| Param      | Type                | Required | Default | Description |
|------------|---------------------|----------|---------|-------------|
| obj        | `Object` or `Array` | Yes      |         | The object to update. |
| basePath   | `string`            | Yes      | `""`    | The path inside `obj` that the update paths are relative to. Use `""` to update `obj` itself. |
| updateData | `Object`            | Yes      |         | An object of paths to values. Only its own keys are used. |
| options    | `Object`            | No       | `{}`    | Supports `immutable` and `transformKey`. |

**Returns** `obj` (or the new object when immutable).

```js
const {update} = require("@irrelon/path");

const obj = {
	"foo": {
		"bar": [{
			"moo": true,
			"baa": "ram you"
		}]
	}
};

update(obj, "", {
	"foo.bar.0.baa": "hello I've been updated",
	"and.so": "have I!"
});

console.log(obj.foo.bar[0].baa); // Logs: hello I've been updated
console.log(obj.and.so); // Logs: have I!

update(obj, "foo.bar.0", {"moo": false});

console.log(obj.foo.bar[0].moo); // Logs: false
```

### updateImmutable

`updateImmutable(obj, basePath, updateData, options?)`

The same as [update()](#update) with `options.immutable` set to `true`.

> **Changed in 8.0.0**
>
> * Includes all the changes to [update()](#update) and the copy changes listed for [setImmutable()](#setimmutable).

```js
const {updateImmutable} = require("@irrelon/path");

const obj = {"settings": {"theme": "dark", "fontSize": 12}};
const newObj = updateImmutable(obj, "settings", {"theme": "light", "fontSize": 14});

console.log(newObj.settings); // Logs: {"theme": "light", "fontSize": 14}
console.log(obj.settings); // Logs: {"theme": "dark", "fontSize": 12}
```

### pushVal

`pushVal(obj, path, val, options?)`

Pushes `val` onto the end of the array at `path`. If the array (or any
part of the path to it) does not exist, it is created.

> **Changed in 8.0.0**
>
> * Paths containing escaped periods now push to the right key. They previously created a key containing the backslash.
> * A primitive, function or inherited property in the middle of the path is replaced with an object. Truthy primitives previously threw a `TypeError`, and inherited properties such as `constructor` were traversed.
> * Throws an `Error` instead of a string when the value at the path is not an array.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object containing the array. |
| path    | `string`            | Yes      |         | The path to the array. Use `""` if `obj` is the array. |
| val     | `any`               | Yes      |         | The value to push. |
| options | `Object`            | No       | `{}`    | Supports `immutable`. |

**Returns** `obj` (or the new object when immutable). If `obj` is `null`,
`undefined` or a primitive, it is returned unchanged.

**Throws** an `Error` if the value at `path` exists but is not an array.

```js
const {pushVal} = require("@irrelon/path");

const obj = {"todos": ["Write docs"]};

pushVal(obj, "todos", "Ship it");
pushVal(obj, "projects.irrelon.tags", "open-source");

console.log(obj); // Logs: {"todos": ["Write docs", "Ship it"], "projects": {"irrelon": {"tags": ["open-source"]}}}
```

### pushValImmutable

`pushValImmutable(obj, path, val, options?)`

The same as [pushVal()](#pushval) with `options.immutable` set to `true`.

> **Changed in 8.0.0**
>
> * No longer modifies the original object. Objects along the path in the original were previously replaced with copies.
> * Includes all the changes to [pushVal()](#pushval) and the copy changes listed for [setImmutable()](#setimmutable).

```js
const {pushValImmutable} = require("@irrelon/path");

const obj = {"todos": ["Write docs"]};
const newObj = pushValImmutable(obj, "todos", "Ship it");

console.log(newObj.todos); // Logs: ["Write docs", "Ship it"]
console.log(obj.todos); // Logs: ["Write docs"]
```

### pullVal

`pullVal(obj, path, val, options?)`

Removes the first item equal to `val` from the array at `path`. By
default items are compared with strict equality (`===`), so objects must
be the same reference. Pass `{strict: false}` to remove the first item
that matches the structure of `val` instead (see [match()](#match)).

> **Changed in 8.0.0**
>
> * Does nothing when the path doesn't exist. It previously created keys containing `undefined` along the path.
> * Uses strict equality unless `strict` is `false`. Passing an options object without `strict`, such as `{immutable: true}`, previously switched to structural matching.
> * In immutable mode, returns the original object when nothing was removed instead of a copy.
> * Paths containing escaped periods now pull from the right key.
> * Inherited properties such as `constructor` are no longer traversed.
> * Pulling `null` with `strict: false` no longer throws a `TypeError`.
> * Throws an `Error` instead of a string when the value at the path is not an array.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj     | `Object` or `Array` | Yes      |         | The object containing the array. |
| path    | `string`            | Yes      |         | The path to the array. Use `""` if `obj` is the array. |
| val     | `any`               | Yes      |         | The value to remove. |
| options | `Object`            | No       | `{}`    | Supports `immutable` and `strict` (defaults to `true`). |

**Returns** `obj` (or the new object when immutable). If the path does not
exist or the value is not found, nothing changes and the original `obj`
is returned.

**Throws** an `Error` if the value at `path` exists but is not an array.

```js
const {pullVal} = require("@irrelon/path");

const obj = {
	"tags": ["a", "b", "a"],
	"users": [{"_id": "1", "name": "Jim"}, {"_id": "2", "name": "Ann"}]
};

pullVal(obj, "tags", "a");
console.log(obj.tags); // Logs: ["b", "a"]

// A different object with the same data is not strictly equal...
pullVal(obj, "users", {"_id": "2"});
console.log(obj.users.length); // Logs: 2

// ...but it matches when strict is false
pullVal(obj, "users", {"_id": "2"}, {strict: false});
console.log(obj.users); // Logs: [{"_id": "1", "name": "Jim"}]
```

### pullValImmutable

`pullValImmutable(obj, path, val, options?)`

The same as [pullVal()](#pullval) with `options.immutable` set to `true`.
Like [pullVal()](#pullval), it uses strict equality unless
`{strict: false}` is passed.

> **Changed in 8.0.0**
>
> * Uses strict equality by default, like [pullVal()](#pullval). It previously removed the first item matching the structure of the value. Pass `{strict: false}` for the old behaviour.
> * Includes all the changes to [pullVal()](#pullval).

```js
const {pullValImmutable} = require("@irrelon/path");

const obj = {"tags": ["a", "b"]};
const newObj = pullValImmutable(obj, "tags", "a");

console.log(newObj.tags); // Logs: ["b"]
console.log(obj.tags); // Logs: ["a", "b"]
console.log(pullValImmutable(obj, "tags", "z") === obj); // Logs: true
```

### splicePath

`splicePath(obj, path, start, deleteCount, itemsToAdd?, options?)`

Calls `Array.prototype.splice()` on the array at `path`, removing
`deleteCount` items from `start` and inserting `itemsToAdd` in their
place.

> **Changed in 8.0.0**
>
> * Does nothing when the path doesn't exist. It previously threw when the array was missing and created keys containing `undefined` when a parent was missing.
> * In immutable mode, returns the original object when the path doesn't exist.
> * Paths containing escaped periods now splice the right key.
> * Throws an `Error` instead of a string when the value at the path is not an array.

| Param       | Type                | Required | Default | Description |
|-------------|---------------------|----------|---------|-------------|
| obj         | `Object` or `Array` | Yes      |         | The object containing the array. |
| path        | `string`            | Yes      |         | The path to the array. Use `""` if `obj` is the array. |
| start       | `number`            | Yes      |         | The index to start at. |
| deleteCount | `number`            | Yes      |         | The number of items to remove. |
| itemsToAdd  | `any[]`             | No       | `[]`    | Items to insert at `start`. |
| options     | `Object`            | No       | `{}`    | Supports `immutable`. |

**Returns** `obj` (or the new object when immutable). If the path does not
exist, nothing changes and the original `obj` is returned.

**Throws** an `Error` if the value at `path` exists but is not an array.

```js
const {splicePath} = require("@irrelon/path");

const obj = {"letters": ["a", "b", "c", "d"]};

splicePath(obj, "letters", 1, 2, ["x"]);
console.log(obj.letters); // Logs: ["a", "x", "d"]

const newObj = splicePath(obj, "letters", 0, 0, ["start"], {immutable: true});
console.log(newObj.letters); // Logs: ["start", "a", "x", "d"]
console.log(obj.letters); // Logs: ["a", "x", "d"]
```

### merge

`merge(obj1, obj2, options?)`

Deeply merges `obj2` into `obj1`, like a "deep spread". This modifies
`obj1` unless `options.immutable` is `true`.

> **Changed in 8.0.0**
>
> * `__proto__` keys in `obj2` are ignored, and inherited properties of `obj1` are never merged into. This fixes a prototype pollution vulnerability, see [Security](#security).
> * Values from `obj2` that are not plain objects or arrays, such as `Date`s and class instances, are now assigned as they are. They were previously merged into new plain objects, so `Date`s became `{}`.
> * A value in `obj1` of a different kind to the value in `obj2` is now replaced. Primitives previously threw a `TypeError` and objects were merged into arrays.
> * An `obj2` that is `null` or `undefined` no longer throws.

| Param   | Type                | Required | Default | Description |
|---------|---------------------|----------|---------|-------------|
| obj1    | `Object` or `Array` | Yes      |         | The object to merge into. |
| obj2    | `Object` or `Array` | Yes      |         | The object to merge from. If it is not an object, nothing is merged. |
| options | `Object`            | No       | `{}`    | Supports `immutable` and `ignoreUndefined`. |

| Option            | Description |
|-------------------|-------------|
| `immutable`       | Leave `obj1` untouched and return a new object. |
| `ignoreUndefined` | Values in `obj2` that are `undefined` do not overwrite values in `obj1`. |

The merge rules are:

* Plain objects in `obj2` are merged key by key into the plain object at
  the same key in `obj1`, and arrays are merged index by index into the
  array at the same key.
* If `obj1` has no value at that key, or a value of a different kind
  (e.g. an array where `obj2` has an object), the value from `obj2`
  replaces it.
* Every other value from `obj2` (strings, numbers, `null`, `Date`s, class
  instances and so on) replaces the value in `obj1` as it is.
* `__proto__` keys in `obj2` are ignored, and inherited properties of
  `obj1` (like `constructor`) are never merged into. See
  [Security](#security).

**Returns** `obj1` (or the new object when immutable).

```js
const {merge} = require("@irrelon/path");

const defaults = {
	"theme": {"colour": "blue", "fontSize": 12},
	"plugins": ["a", "b"],
	"createdAt": null
};

const userSettings = {
	"theme": {"fontSize": 16},
	"plugins": ["c"],
	"createdAt": new Date(0)
};

const result = merge(defaults, userSettings);

console.log(result.theme); // Logs: {"colour": "blue", "fontSize": 16}
console.log(result.plugins); // Logs: ["c", "b"]
console.log(result.createdAt === userSettings.createdAt); // Logs: true
console.log(result === defaults); // Logs: true
```

### mergeImmutable

`mergeImmutable(obj1, obj2, options?)`

The same as [merge()](#merge) with `options.immutable` set to `true`.

> **Changed in 8.0.0**
>
> * Includes all the changes to [merge()](#merge) and the copy changes listed for [setImmutable()](#setimmutable).

```js
const {mergeImmutable} = require("@irrelon/path");

const obj1 = {"a": {"b": 1}, "untouched": {}};
const result = mergeImmutable(obj1, {"a": {"c": 2}});

console.log(result.a); // Logs: {"b": 1, "c": 2}
console.log(obj1.a); // Logs: {"b": 1}
console.log(result.untouched === obj1.untouched); // Logs: true
```

### decouple

`decouple(obj, options?)`

If `options.immutable` is `true`, returns a shallow copy of `obj`.
Otherwise returns `obj` itself. This is the function the immutable
operations use to copy each object on a changed path. See
[Mutable and Immutable Operations](#mutable-and-immutable-operations)
for how each type of value is copied.

> **Changed in 8.0.0**
>
> * Primitives and functions are returned as they are. They previously returned `undefined` in immutable mode.
> * Copies keep the prototype of class instances, the data of `Date`, `RegExp`, `Map` and `Set` values and the `null` prototype of `Object.create(null)` objects. They previously became plain objects.
> * An own `__proto__` key in the data is kept as data. It previously became the prototype of the copy.
> * Empty slots in sparse arrays stay empty instead of becoming `undefined`, and very large sparse arrays no longer exhaust memory.

| Param             | Type      | Required | Default | Description |
|-------------------|-----------|----------|---------|-------------|
| obj               | `any`     | Yes      |         | The value to copy. |
| options           | `Object`  | No       | `{}`    |             |
| options.immutable | `boolean` | No       | `false` | If `true`, a copy is returned. |

```js
const {decouple} = require("@irrelon/path");

const obj = {"foo": {"bar": true}};
const copy = decouple(obj, {immutable: true});

console.log(copy); // Logs: {"foo": {"bar": true}}
console.log(copy === obj); // Logs: false
console.log(copy.foo === obj.foo); // Logs: true
console.log(decouple(obj) === obj); // Logs: true
```

## Comparing and Searching

### diff

`diff(obj1, obj2, options?)`

Compares two objects or arrays and returns the paths to the values that
are different. Use [diffValues()](#diffvalues) to also get the values
and how they differ.

> **Changed in 8.0.0**
>
> * Returned paths are escaped. Changes to keys containing periods were previously missed entirely.
> * A field changing between an object or array and another type is reported in non-strict mode too. `diff({a: {}}, {a: null})` previously returned `[]`.
> * The same paths are reported whichever object is passed first. `diff({}, {a: {b: 1}})` previously returned `["a"]` while `diff({a: {b: 1}}, {})` returned `["a.b"]`. Both now return `["a", "a.b"]`.
> * Objects referenced from more than one place are compared at every place. Only the first place was previously compared.
> * Escaped keys count as a single level for `maxDepth`.
> * The options object is no longer modified.

| Param             | Type                   | Required | Default    | Description |
|-------------------|------------------------|----------|------------|-------------|
| obj1              | `Object` or `Array`    | Yes      |            | The first object. |
| obj2              | `Object` or `Array`    | Yes      |            | The second object. |
| options           | `Object`               | No       | `{}`       |             |
| options.strict    | `boolean`              | No       | `false`    | Compare values with `===` instead of `==`. |
| options.maxDepth  | `number`               | No       | `Infinity` | The number of path levels to compare. Objects at the maximum depth are compared by reference. |
| options.basePath  | `string` or `string[]` | No       | `""`       | Only compare inside this path, or each of these paths. |
| options.exclusive | `boolean`              | No       | `false`    | Only compare the keys present in `obj2`. Useful when `obj2` is a partial update of `obj1`. |

**Returns** an array of escaped paths.

How differences are reported:

* Values are compared field by field. A field that is `undefined` in one
  object and missing from the other is not a difference.
* When a field changes between an object or array and a different type
  (e.g. `{}` to `null`), the field itself is reported, followed by any
  leaf paths inside it that changed.
* When an array changes length, the array itself is reported as well as
  the items that differ.
* The same paths are reported whichever object is passed first (unless
  `exclusive` is `true`).

```js
const {diff} = require("@irrelon/path");

const obj1 = {
	"user": {
		"_id": 1,
		"firstName": "Jimbo",
		"lastName": "Jetson"
	}
};

const obj2 = {
	"user": {
		"_id": "1", // Notice string instead of numerical _id
		"firstName": "James", // We also changed the name from "Jimbo" to "James"
		"lastName": "Jetson"
	}
};

console.log(diff(obj1, obj2)); // Logs: ["user.firstName"]
console.log(diff(obj1, obj2, {strict: true})); // Logs: ["user._id", "user.firstName"]
console.log(diff(obj1, obj2, {basePath: "user.lastName"})); // Logs: []
console.log(diff({"a": {"b": 1}}, {"a": null})); // Logs: ["a", "a.b"]
console.log(diff({"tags": ["x"]}, {"tags": ["x", "y"]})); // Logs: ["tags", "tags.1"]
console.log(diff({"a": 1, "b": 2}, {"a": 3}, {exclusive: true})); // Logs: ["a"]
```

### diffValues

`diffValues(obj1, obj2, options?)`

The same as [diff()](#diff) but returns an object where each key is a
path to a difference and each value describes it:

> **Changed in 8.0.0**
>
> * Includes all the changes to [diff()](#diff).
> * In strict mode, a field changing between an object and a value of another type now has the `difference` `"both"` instead of `"type"` when the values also differ.

| Property     | Description |
|--------------|-------------|
| `val1`       | The value in `obj1`. |
| `val2`       | The value in `obj2`. |
| `type1`      | The type of `val1`, see [type()](#type). |
| `type2`      | The type of `val2`, see [type()](#type). |
| `difference` | `"value"` if the values differ, `"type"` if only the types differ (e.g. `1` and `"1"` in strict mode), or `"both"`. |

```js
const {diffValues} = require("@irrelon/path");

const obj1 = {"user": {"_id": 1, "firstName": "Jimbo", "lastName": "Jetson"}};
const obj2 = {"user": {"_id": "1", "firstName": "James", "lastName": "Jetson"}};

console.log(diffValues(obj1, obj2, {strict: true}));
```

Outputs:

```json
{
	"user._id": {
		"val1": 1,
		"val2": "1",
		"type1": "number",
		"type2": "string",
		"difference": "type"
	},
	"user.firstName": {
		"val1": "Jimbo",
		"val2": "James",
		"type1": "string",
		"type2": "string",
		"difference": "value"
	}
}
```

### isEqual

`isEqual(obj1, obj2, path, deep?, strict?)`

Checks if the values at `path` in both objects are equal.

> **Changed in 8.0.0**
>
> * Deep comparison now compares the keys of both objects. Keys that only existed in the second object were previously ignored, so `isEqual({a: {}}, {a: {b: 1}}, "a", true)` was `true`.
> * Deep comparison now requires both values to be the same kind of object. An object was previously equal to a missing value if it had no keys, and arrays could equal plain objects.
> * `Date`s and `RegExp`s are compared by value in deep comparison. Any two were previously equal.
> * Keys containing periods are compared correctly in deep comparison, and circular references no longer overflow the stack.

| Param  | Type                   | Required | Default | Description |
|--------|------------------------|----------|---------|-------------|
| obj1   | `any`                  | Yes      |         | The first object. |
| obj2   | `any`                  | Yes      |         | The second object. |
| path   | `string` or `string[]` | Yes      |         | The path to compare. Use `""` to compare the objects themselves. If an array is passed, every path must be equal. |
| deep   | `boolean`              | No       | `false` | Compare objects and arrays by their contents instead of by reference. |
| strict | `boolean`              | No       | `false` | Compare values with `===` instead of `==`. |

When `deep` is `true`:

* Every key of both objects is compared, so extra keys on either side
  make them unequal.
* Objects must be the same kind (e.g. an array is never equal to a plain
  object, and a class instance is only equal to an instance of the same
  class).
* `Date`s are equal if they represent the same time, and `RegExp`s are
  equal if they have the same pattern and flags.
* Circular references are supported.

**Returns** `true` if the values are equal.

```js
const {isEqual} = require("@irrelon/path");

const obj1 = {"user": {"id": 1, "tags": ["a"]}};
const obj2 = {"user": {"id": "1", "tags": ["a"]}};

console.log(isEqual(obj1, obj2, "user.id")); // Logs: true
console.log(isEqual(obj1, obj2, "user.id", false, true)); // Logs: false
console.log(isEqual(obj1, obj2, "user.tags")); // Logs: false
console.log(isEqual(obj1, obj2, "user.tags", true)); // Logs: true
console.log(isEqual(obj1, obj2, ["user.id", "user.tags"], true)); // Logs: true
```

### isNotEqual

`isNotEqual(obj1, obj2, path, deep?, strict?)`

The opposite of [isEqual()](#isequal), with the same parameters.

> **Changed in 8.0.0**
>
> * Includes all the changes to [isEqual()](#isequal).

```js
const {isNotEqual} = require("@irrelon/path");

console.log(isNotEqual({"a": 1}, {"a": 2}, "a")); // Logs: true
```

### match

`match(source, query)`

Checks if `source` contains the structure and values of `query`. Every
key in `query` must exist in `source` with an equal (`===`) value, but
`source` may contain other keys too. Nested objects and arrays are
checked recursively, with arrays compared index by index.

> **Changed in 8.0.0**
>
> * Returns `false` when `query` is `null` and `source` is an object. It previously threw a `TypeError`.

| Param  | Type  | Required | Description |
|--------|-------|----------|-------------|
| source | `any` | Yes      | The data to check. |
| query  | `any` | Yes      | The structure and values to look for. |

**Returns** `true` if `source` matches `query`.

```js
const {match} = require("@irrelon/path");

const user = {"name": "Jim", "address": {"city": "London", "postcode": "N1"}};

console.log(match(user, {"address": {"city": "London"}})); // Logs: true
console.log(match(user, {"address": {"city": "Paris"}})); // Logs: false
console.log(match("Jim", "Jim")); // Logs: true
console.log(match([1, 2, 3], [1, 2])); // Logs: true
```

### findPath

`findPath(source, query, options?)`

Finds every value in `source` that matches `query` (see
[match()](#match)) and returns the paths to them.

> **Changed in 8.0.0**
>
> * Returned paths are escaped.
> * Circular references no longer overflow the stack.

| Param               | Type      | Required | Default    | Description |
|---------------------|-----------|----------|------------|-------------|
| source              | `any`     | Yes      |            | The data to search. |
| query               | `any`     | Yes      |            | The structure and values to look for. |
| options             | `Object`  | No       | `{}`       |             |
| options.maxDepth    | `number`  | No       | `Infinity` | The number of levels to search. |
| options.includeRoot | `boolean` | No       | `true`     | Whether `source` itself can match (with the path `""`). |

**Returns** `{match: boolean, path: string[]}` where `path` contains the
escaped path to every match. Circular references are supported.

```js
const {findPath} = require("@irrelon/path");

const myData = {
	"profile": {
		"id": 1,
		"name": "Ron Swanson",
		"data": {
			"mobile": "+001293284732"
		}
	},
	"backup": {
		"data": {
			"mobile": "+001293284732"
		}
	}
};

console.log(findPath(myData, {"data": {"mobile": "+001293284732"}})); // Logs: {"match": true, "path": ["profile", "backup"]}
console.log(findPath(myData, "+001293284732")); // Logs: {"match": true, "path": ["profile.data.mobile", "backup.data.mobile"]}
console.log(findPath(myData, "+001293284732", {maxDepth: 2})); // Logs: {"match": false, "path": []}
```

### findOnePath

`findOnePath(source, query, options?)`

The same as [findPath()](#findpath) but stops at the first match.

> **Changed in 8.0.0**
>
> * Includes all the changes to [findPath()](#findpath).

**Returns** `{match: true, path: string}` for the first match, or
`{match: false}`.

```js
const {findOnePath} = require("@irrelon/path");

const myDataArray = [{
	"profile": {
		"id": 1,
		"name": "Ron Swanson"
	}
}, {
	"profile": {
		"id": 2,
		"name": "April Ludgate"
	}
}];

// Find the item that has a "profile" with an "id" of 1
console.log(findOnePath(myDataArray, {"profile": {"id": 1}})); // Logs: {"match": true, "path": "0"}

// Find the first object with an "id" of 2
console.log(findOnePath(myDataArray, {"id": 2})); // Logs: {"match": true, "path": "1.profile"}

console.log(findOnePath(myDataArray, {"id": 3})); // Logs: {"match": false}
```

> See the unit tests for findPath() and findOnePath() for many more
> examples of usage.

### hasMatchingPathsInObject

`hasMatchingPathsInObject(testKeys, testObj)`

Checks if every key path in `testKeys` exists in `testObj` with a value
that is not `undefined`. Only the structure of `testKeys` is used, not its
values. Only own properties are considered.

> **Changed in 8.0.0**
>
> * Only own properties of `testObj` count as existing. Inherited properties like `toString` previously matched.
> * Returns `false` when a parent in `testObj` is `null` or missing. It previously threw a `TypeError`.

| Param    | Type                | Required | Description |
|----------|---------------------|----------|-------------|
| testKeys | `Object` or `Array` | Yes      | An object whose key structure describes the paths to check. |
| testObj  | `Object` or `Array` | Yes      | The object to check. |

**Returns** `true` if every path exists.

> Not safe for circular structures in `testKeys`.

```js
const {hasMatchingPathsInObject} = require("@irrelon/path");

const testObj = {"user": {"name": "Jim", "age": null}};

console.log(hasMatchingPathsInObject({"user": {"name": true}}, testObj)); // Logs: true
console.log(hasMatchingPathsInObject({"user": {"age": true}}, testObj)); // Logs: true
console.log(hasMatchingPathsInObject({"user": {"email": true}}, testObj)); // Logs: false
```

### countMatchingPathsInObject

`countMatchingPathsInObject(testKeys, testObj)`

For every leaf key in `testObj`, checks if `testKeys` has the same key
with a truthy, non-object value. Only own properties are considered.

> **Changed in 8.0.0**
>
> * Only own properties of `testKeys` count as matches. Inherited properties like `toString` previously matched.
> * No longer throws when `testKeys` is missing a nested object that `testObj` has.

| Param    | Type                | Required | Description |
|----------|---------------------|----------|-------------|
| testKeys | `Object` or `Array` | Yes      | The keys to look for. |
| testObj  | `Object` or `Array` | Yes      | The object whose leaf keys are counted. |

**Returns** an object with:

| Property          | Description |
|-------------------|-------------|
| `matchedKeys`     | The same structure as `testObj` with each leaf replaced by `true` if it was matched or `false` if not. |
| `matchedKeyCount` | The number of matched leaves. |
| `totalKeyCount`   | The total number of leaves in `testObj`. |

> Not safe for circular structures in `testObj`.

```js
const {countMatchingPathsInObject} = require("@irrelon/path");

const result = countMatchingPathsInObject({
	"moo": true
}, {
	"foo": {
		"bar": null
	},
	"moo": true
});

console.log(result);
```

Outputs:

```json
{
	"matchedKeys": {
		"foo": {
			"bar": false
		},
		"moo": true
	},
	"matchedKeyCount": 1,
	"totalKeyCount": 2
}
```

## Inspecting Structure

### flatten

`flatten(obj, finalArr?, parentPath?, options?)`

Returns the path to every value in `obj`, including the objects and
arrays along the way. Circular references are included once but not
followed.

> **Changed in 8.0.0**
>
> * Returned paths are escaped.
> * Objects referenced from more than one place are included at every place. Only the first place was previously included.

| Param      | Type                | Required | Default | Description |
|------------|---------------------|----------|---------|-------------|
| obj        | `Object` or `Array` | Yes      |         | The object to scan. |
| finalArr   | `string[]`          | No       | `[]`    | An array to add the paths to. Pass `undefined` to get a new array. |
| parentPath | `string`            | No       | `""`    | A path to prefix every path with. |
| options    | `Object`            | No       | `{}`    | Supports `ignore`, `transformKey` and `transformRead`. |

**Returns** an array of escaped paths, each parent before its children.

```js
const {flatten, numberToWildcard} = require("@irrelon/path");

const myData = {
	"profile": {
		"id": 1,
		"name": "Ron Swanson"
	},
	"tags": ["a", "b"]
};

console.log(flatten(myData)); // Logs: ["profile", "profile.id", "profile.name", "tags", "tags.0", "tags.1"]
console.log(flatten(myData, undefined, "", {ignore: /^profile$/})); // Logs: ["tags", "tags.0", "tags.1"]
console.log(flatten(myData, undefined, "", {transformKey: numberToWildcard})); // Logs: ["profile", "profile.id", "profile.name", "tags", "tags.$", "tags.$"]
```

### flattenValues

`flattenValues(obj, finalObj?, parentPath?, options?)`

Returns an object where each key is the path to a value in `obj` and each
value is the value at that path. `Date`s, `RegExp`s and `null` are
treated as leaf values. Circular references are included once but not
followed.

> **Changed in 8.0.0**
>
> * Returned paths are escaped.
> * Objects referenced from more than one place are included at every place.
> * `null` values are included when `leavesOnly` is `true`, and `info.isFlat` is `true` for them.

| Param      | Type                | Required | Default | Description |
|------------|---------------------|----------|---------|-------------|
| obj        | `Object` or `Array` | Yes      |         | The object to scan. |
| finalObj   | `Object`            | No       | `{}`    | An object to add the paths to. Pass `undefined` to get a new object. |
| parentPath | `string`            | No       | `""`    | A path to prefix every path with. |
| options    | `Object`            | No       | `{}`    | Supports `leavesOnly`, `transformKey`, `transformRead` and `transformWrite`. |

For this function `transformKey` is called with `(key, info)` where
`info` is `{type, isArrayIndex, isFlat}`: the `typeof` the value, whether
the key is an array index and whether the value is a leaf.

**Returns** an object of escaped paths to values. Each object's own
children are listed before the object itself.

```js
const {flattenValues} = require("@irrelon/path");

const myData = {
	"profile": {
		"id": 1,
		"name": "Ron Swanson"
	}
};

console.log(flattenValues(myData));
```

Outputs:

```json
{
	"profile.id": 1,
	"profile.name": "Ron Swanson",
	"profile": {
		"id": 1,
		"name": "Ron Swanson"
	}
}
```

Only the leaf values, with array indexes replaced by a wildcard:

```js
const {flattenValues} = require("@irrelon/path");

const myData = {
	"users": [{"name": "Jim"}, {"name": "Ann"}],
	"deletedAt": null
};

const result = flattenValues(myData, undefined, "", {
	leavesOnly: true,
	transformKey: (key, info) => info.isArrayIndex ? "$" : key
});

console.log(result); // Logs: {"users.$.name": "Ann", "deletedAt": null}
```

> Paths that are the same after transforming overwrite each other, which
> is why only `"Ann"` remains above.

### leafNodes

`leafNodes(obj, parentPath?)`

Returns the paths to every leaf value in `obj`. Unlike
[flatten()](#flatten) it does not include the objects and arrays along
the way. Values that are `undefined` are skipped, `null` is a leaf, and
circular references are treated as leaves.

> **Changed in 8.0.0**
>
> * Returned paths are escaped.
> * Objects referenced from more than one place are included at every place.

| Param      | Type                | Required | Default | Description |
|------------|---------------------|----------|---------|-------------|
| obj        | `Object` or `Array` | Yes      |         | The object to scan. |
| parentPath | `string`            | No       | `""`    | A path to prefix every path with. |

**Returns** an array of escaped paths.

```js
const {leafNodes} = require("@irrelon/path");

const structure = {
	"rootArray": [{
		"arr": [{"id": 1}, {"id": 2}],
		"name": "An array",
		"type": null
	}]
};

console.log(leafNodes(structure)); // Logs: ["rootArray.0.arr.0.id", "rootArray.0.arr.1.id", "rootArray.0.name", "rootArray.0.type"]
```

### countLeafNodes

`countLeafNodes(obj)`

Counts the leaf values in `obj`, using the same rules as
[leafNodes()](#leafnodes).

> **Changed in 8.0.0**
>
> * Objects referenced from more than one place are counted at every place.

| Param | Type                | Required | Description |
|-------|---------------------|----------|-------------|
| obj   | `Object` or `Array` | Yes      | The object to count leaf values in. |

**Returns** the number of leaf values.

```js
const {countLeafNodes} = require("@irrelon/path");

console.log(countLeafNodes({"foo": {"bar": null}, "moo": true})); // Logs: 2
```

### type

`type(item)`

Like `typeof` but distinguishes arrays and `null` from objects.

**Returns** one of `"undefined"`, `"object"`, `"boolean"`, `"number"`,
`"string"`, `"function"`, `"symbol"`, `"bigint"`, `"null"` or `"array"`.

```js
const {type} = require("@irrelon/path");

console.log(type([])); // Logs: array
console.log(type(null)); // Logs: null
console.log(type({})); // Logs: object
console.log(type("hello")); // Logs: string
```

## Working With Path Strings

### join

`join(...parts)`

Joins path parts with periods, ignoring empty and `undefined` parts. The
parts are not escaped, use [joinEscaped()](#joinescaped) for keys that
may contain periods.

```js
const {join} = require("@irrelon/path");

console.log(join("users", "0", "name")); // Logs: users.0.name
console.log(join("", "users", undefined, "name")); // Logs: users.name
```

### joinEscaped

`joinEscaped(...keys)`

[Escapes](#escape) each key and joins them into a path.

> **Changed in 8.0.0**
>
> * Backslashes in keys are escaped, see [escape()](#escape).

```js
const {joinEscaped} = require("@irrelon/path");

console.log(joinEscaped("domains", "www.google.com")); // Logs: domains.www\.google\.com
```

### escape

`escape(key)`

Escapes the periods and backslashes in a key so it is treated as a single
path part. See
[Keys Containing Periods or Backslashes](#keys-containing-periods-or-backslashes).

> **Changed in 8.0.0**
>
> * Backslashes are now escaped as `\\`, e.g. `escape("C:\\temp")` returns `"C:\\\\temp"`. Keys ending in a backslash previously could not be used.

```js
const {escape} = require("@irrelon/path");

console.log(escape("www.google.com")); // Logs: www\.google\.com
console.log(escape("C:\\temp")); // Logs: C:\\temp
```

### unEscape

`unEscape(key)`

Reverses [escape()](#escape), returning the original key.

> **Changed in 8.0.0**
>
> * Only `\.` and `\\` are unescaped. Previously a backslash followed by any character became a period, e.g. `"C:\\temp"` became `"C:.emp"`.

```js
const {unEscape} = require("@irrelon/path");

console.log(unEscape("www\\.google\\.com")); // Logs: www.google.com
```

### split

`split(path)`

Splits a path into its parts on every period that is not escaped. Each
part is still escaped, use [unEscape()](#unescape) to get the original
key.

> **Changed in 8.0.0**
>
> * A period after an escaped backslash (`\\.`) is now a delimiter.
> * Keys containing the text `[--]` are no longer corrupted.
> * These changes also apply to [chop()](#chop), [up()](#up), [down()](#down), [pop()](#pop) and [shift()](#shift).

```js
const {split} = require("@irrelon/path");

console.log(split("users.test@test\\.com.name")); // Logs: ["users", "test@test\\.com", "name"]
```

### clean

`clean(path)`

Removes a leading period from the path.

```js
const {clean} = require("@irrelon/path");

console.log(clean(".foo.bar.one")); // Logs: foo.bar.one
```

### chop

`chop(path, level)`

Shortens `path` to the given number of parts. A path shorter than
`level` is returned intact.

```js
const {chop} = require("@irrelon/path");

console.log(chop("foo.bar.ram.you.too", 2)); // Logs: foo.bar
console.log(chop("foo", 2)); // Logs: foo
```

### up

`up(path, levels = 1)`

Removes `levels` parts from the end of the path.

```js
const {up} = require("@irrelon/path");

console.log(up("user.friends.0.firstName")); // Logs: user.friends.0
console.log(up("user.friends.0.firstName", 2)); // Logs: user.friends
```

### down

`down(path, levels = 1)`

Removes `levels` parts from the start of the path.

```js
const {down} = require("@irrelon/path");

console.log(down("user.friends.0.firstName")); // Logs: friends.0.firstName
console.log(down("user.friends.0.firstName", 2)); // Logs: 0.firstName
```

### pop

`pop(path, levels = 1)`

Returns the last part of the path, or the part `levels` from the end.

```js
const {pop} = require("@irrelon/path");

console.log(pop("user.friends.0.firstName")); // Logs: firstName
console.log(pop("user.friends.0.firstName", 2)); // Logs: 0
```

### shift

`shift(path, levels = 1)`

Returns the first part of the path, or the part `levels` from the start.

```js
const {shift} = require("@irrelon/path");

console.log(shift("user.friends.0.firstName")); // Logs: user
console.log(shift("user.friends.0.firstName", 2)); // Logs: friends
```

### push

`push(path, key = "")`

Adds a part to the end of the path. An empty path or key does not add a
period.

> **Changed in 8.0.0**
>
> * An empty path or key no longer adds a period. `push("user")` previously returned `"user."`.

```js
const {push} = require("@irrelon/path");

console.log(push("user.friends", "0")); // Logs: user.friends.0
console.log(push("", "user")); // Logs: user
```

### isCompositePath

`isCompositePath(path)`

Checks if the path has more than one part (i.e. contains a period that is
not escaped).

> **Changed in 8.0.0**
>
> * A period after an escaped backslash (`\\.`) now makes the path composite.

```js
const {isCompositePath} = require("@irrelon/path");

console.log(isCompositePath("user.name")); // Logs: true
console.log(isCompositePath("user")); // Logs: false
console.log(isCompositePath("test@test\\.com")); // Logs: false
```

### isNonCompositePath

`isNonCompositePath(path)`

The opposite of [isCompositePath()](#iscompositepath).

> **Changed in 8.0.0**
>
> * Includes the change to [isCompositePath()](#iscompositepath).

```js
const {isNonCompositePath} = require("@irrelon/path");

console.log(isNonCompositePath("user")); // Logs: true
```

## Helpers

### keyDedup

`keyDedup(keys)`

Removes duplicate strings from an array, keeping the first occurrence of
each.

```js
const {keyDedup} = require("@irrelon/path");

console.log(keyDedup(["b", "a", "b", "c"])); // Logs: ["b", "a", "c"]
```

### returnWhatWasGiven

`returnWhatWasGiven(val)`

Returns its first argument. This is the default `transform` function for
the [options](#options) that accept one.

### wildcardToZero

`wildcardToZero(key)`

Returns `"0"` if the key is the wildcard `"$"`, otherwise returns the key.
Use it as a `transformKey` option to make `$` mean "the first array
item".

```js
const {get, wildcardToZero} = require("@irrelon/path");

const obj = {"users": [{"name": "Jim"}, {"name": "Ann"}]};

console.log(get(obj, "users.$.name", undefined, {transformKey: wildcardToZero})); // Logs: Jim
```

### numberToWildcard

`numberToWildcard(key)`

Returns `"$"` if the key is a number such as `"12"`, otherwise returns
the key. Use it as a `transformKey` option to replace array indexes with a
wildcard, see [flatten()](#flatten).

```js
const {numberToWildcard} = require("@irrelon/path");

console.log(numberToWildcard("12")); // Logs: $
console.log(numberToWildcard("name")); // Logs: name
```

# TypeScript

Type definitions are included. The following types are exported for use
in your own code:

| Type                         | Description |
|------------------------------|-------------|
| `ObjectType`                 | Any object with string keys. |
| `ValueType`                  | The values returned by [type()](#type). |
| `DifferenceType`             | `"value"`, `"type"` or `"both"`, see [diffValues()](#diffvalues). |
| `DiffValue`                  | A single difference returned by [diffValues()](#diffvalues). |
| `DiffOptionsType`            | The options for [diff()](#diff) and [diffValues()](#diffvalues). |
| `OptionsType`                | The common `transform*` and `leavesOnly` options. |
| `GetOptionsType`             | The options for [get()](#get) and [getMany()](#getmany). |
| `SetOptionsType`             | The options for the write functions. |
| `FindOptionsType`            | The options for [findPath()](#findpath) and [findOnePath()](#findonepath). |
| `MergeOptionsType`           | The options for [merge()](#merge). |
| `PathData`                   | The `pathData` option of [get()](#get). |
| `FindPathReturn`             | The result of [findPath()](#findpath). |
| `FindOnePathReturn`          | The result of [findOnePath()](#findonepath). |
| `OperationFunctionProps`     | The argument passed to a [traverse()](#traverse) operation. |
| `QueryMatchFunction`         | A function used as `$in` criteria in [query()](#query). |

```ts
import {get, type DiffValue, diffValues} from "@irrelon/path";

const changes: Record<string, DiffValue> = diffValues({a: 1}, {a: 2});
```

# Upgrading

## Version 8.x Breaking Changes

Version 8 fixes a prototype pollution vulnerability (see
[Security](#security)) along with a large number of bugs. Some of the bug
fixes change results that your code may rely on, so they are released as
a new major version. If you can't upgrade yet, version 7.0.3 contains the
security fixes without these changes.

The most wide-reaching change is that **paths returned by the library
are now escaped**, so keys containing periods or backslashes can be
passed straight back to [get()](#get) and [set()](#set). Keys without
those characters are unaffected:

```javascript
// 7.x
flatten({"a.b": 1}); // ["a.b"], which get() can't find
// 8.x
flatten({"a.b": 1}); // ["a\\.b"]
```

The table below summarises what changed in each function. Each
function's section in the [API Reference](#api-reference) has a
**Changed in 8.0.0** note with the full details and before / after
behaviour.

| Function | What changed |
|----------|--------------|
| [get()](#get) | An array of paths returns the values instead of `undefined`s. Single-key paths are unescaped and use `transformKey`. The options object is not modified. |
| [getMany()](#getmany) | Skips `null` items instead of throwing. The options object is not modified and `pathData` paths are correct. |
| [furthest()](#furthest) | No longer throws at `null`. Stops at primitives. Single-key paths are unescaped and use `transformKey`. |
| [traverse()](#traverse) | Paths are escaped. Stops at missing or primitive values. Options apply to arrays of paths. |
| [query()](#query) | Paths are escaped and escaped query paths match. |
| [set()](#set) | `"arr.0.name"` creates an object in the array. Negative numbers create objects. Escaped keys in a path no longer create stray keys or lose data. |
| [setImmutable()](#setimmutable) | As [set()](#set), plus copies keep class instances, built-ins and own `__proto__` data keys. |
| [unSet()](#unset) / [unSetImmutable()](#unsetimmutable) | No longer replaces a primitive in the path with `undefined`. Uses the transformed key consistently. |
| [update()](#update) / [updateImmutable()](#updateimmutable) | As [set()](#set). |
| [pushVal()](#pushval) | Escaped keys work. Primitives in the path are replaced. Throws `Error` objects. |
| [pushValImmutable()](#pushvalimmutable) | No longer modifies the original object. |
| [pullVal()](#pullval) | Missing paths do nothing. Always strict unless `strict: false`. Returns the original when nothing is removed. Throws `Error` objects. |
| [pullValImmutable()](#pullvalimmutable) | **Strict equality by default.** Pass `{strict: false}` for the old behaviour. |
| [splicePath()](#splicepath) | Missing paths do nothing instead of throwing. Throws `Error` objects. |
| [merge()](#merge) / [mergeImmutable()](#mergeimmutable) | Ignores `__proto__` (security fix). Keeps `Date`s and class instances. Replaces values of a different kind. |
| [decouple()](#decouple) | Returns primitives as they are. Copies keep class instances, built-ins and sparse array holes. |
| [diff()](#diff) / [diffValues()](#diffvalues) | Paths are escaped. Reports object / non-object changes in non-strict mode. Symmetric results. Compares shared objects everywhere. |
| [isEqual()](#isequal) / [isNotEqual()](#isnotequal) | Deep comparison checks both objects' keys, object kinds, `Date`s and `RegExp`s, and supports circular references. |
| [match()](#match) | Returns `false` instead of throwing for a `null` query. |
| [findPath()](#findpath) / [findOnePath()](#findonepath) | Paths are escaped. Supports circular references. |
| [hasMatchingPathsInObject()](#hasmatchingpathsinobject) / [countMatchingPathsInObject()](#countmatchingpathsinobject) | Only own properties match. No longer throw on missing or `null` parents. |
| [flatten()](#flatten) / [flattenValues()](#flattenvalues) / [leafNodes()](#leafnodes) / [countLeafNodes()](#countleafnodes) | Paths are escaped. Shared objects are included everywhere. `leavesOnly` includes `null`. |
| [escape()](#escape) / [joinEscaped()](#joinescaped) | Backslashes are escaped. |
| [unEscape()](#unescape) | Only `\.` and `\\` are unescaped. |
| [split()](#split) and the functions using it | Handles escaped backslashes. Keys containing `[--]` are no longer corrupted. |
| [isCompositePath()](#iscompositepath) / [isNonCompositePath()](#isnoncompositepath) | A period after an escaped backslash is a delimiter. |
| [push()](#push) | No trailing period for an empty key. |

Unchanged: [values()](#values), [distill()](#distill), [join()](#join),
[clean()](#clean), [chop()](#chop), [up()](#up), [down()](#down),
[pop()](#pop), [shift()](#shift), [type()](#type), [keyDedup()](#keydedup),
[returnWhatWasGiven()](#returnwhatwasgiven),
[wildcardToZero()](#wildcardtozero) and
[numberToWildcard()](#numbertowildcard), apart from the escaping changes
inherited from [split()](#split) and the security hardening described in
[Security](#security).

Across every function, a path that is not a string now throws
`"Path argument must be a string"` as intended, instead of an unrelated
`TypeError`, and data containing a key named `hasOwnProperty` or created
with `Object.create(null)` no longer causes errors.

## Version 5.x Breaking Changes

The update() and updateImmutable() functions have their signature changed
to include a base path in the arguments. If migrating from a previous
version you can simply add an empty string as the basePath argument to
have the functions operate in the same way as before e.g.

#### Before Version 5.x

```javascript
update(obj, updateObj);
updateImmutable(obj, updateObj);
```

#### After Version 5.x

```javascript
update(obj, "", updateObj);
updateImmutable(obj, "", updateObj);
```

The basePath argument was added so that you can target a path within
the passed `obj` to receive the update e.g.

```js
const {update} = require("@irrelon/path");

const obj = {"subObj": {}};
update(obj, "subObj", {"foo": true});

console.log(obj.subObj.foo); // Logs: true
```

The update above will modify `obj.subObj.foo` to equal `true`.

## Version 3.x Breaking Changes

There was a bug in the get() function that would return an incorrect value
when a non-object was passed to get data from and a path was passed e.g.

```javascript
get("foo-im-not-an-object", "some.path.to.get.data.from"); // Version 2.x returned "foo-im-not-an-object"
```

In version 3.x, this call will return `undefined` as expected.

## Version 2.x Breaking Changes

Version 1.x exported a class that you could instantiate. Version 2.x
exports an object with all available functions. You can require version
2.x either all at once (all functions) or you can destructure to require
only the functions you need. This change is primarily to support tree
shaking, as well as move to a more functional programming style, albeit
not pure functional style :)

Version 2.x is a breaking change from version 1.x and you will need to
migrate your code to work with the new version. Migration is fairly simple
and instead of using an instance of the 1.x class, you simply require the
parts of the library you need e.g.

#### Version 1.x Style Code (Don't Do This)

```javascript
// DON'T DO THIS !!!!!!!!!!!
const Path = require("irrelon-path");
const pathSolver = new Path();
const a = {hello: {foo: true}};
const b = pathSolver.get(a, "hello.foo"); // b === true
```

#### Version 2.x Style Code (Please Use This)

```js
// DO THIS :)
const {get} = require("@irrelon/path");
const a = {hello: {foo: true}};
const b = get(a, "hello.foo");

console.log(b); // Logs: true
```

# Contributing

See [contributing.md](contributing.md) and the
[code of conduct](code-of-conduct.md). Run the tests with:

```bash
npm test
```

The test suite requires 100% code coverage.

# License

MIT, see [LICENSE](LICENSE).
