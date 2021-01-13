# Irrelon Path
A powerful JSON path processor with no third-party dependencies.
Allows you to traverse JSON object trees with a simple dot-delimited
path format e.g. "obj.name"

## What Can It Do?
Irrelon Path is a JavaScript object manipulation library that uses
dot notation to denote object key / value field locations within 
the object structure. It allows you to easily access, modify or
remove data from an object at locations specified via a path string.

## Install

```bash
npm i @irrelon/path
```

# Quick Reference
* [Simple Usage](#simple-usage)
* [Escaping Fields with Periods](#escaping-fields-with-periods)
* [Behaviour](#behaviour)
* [Default Values](#default-values)
* Most Common
    * [get()](#get-obj-path-defaultvalue)
    * [set()](#set-obj-path-value)
    * [pushVal()]()
    * [pullVal()]()
    * [update()](#update-obj-updatedata-options)
    * [diff()](#diff-obj1-obj2-path-strict-maxdepth)
* All Functions (Alphabetically)
    * [chop()](#chop-path-level)
    * [clean()](#clean-path)
    * [countLeafNodes()](#countleafnodes-obj)
    * [countMatchingPathsInObject()](#countmatchingpathsinobject-testkeys-testobj)
	* [decouple()](#decouple-obj-options--)
	* [diff()](#diff-obj1-obj2-path-strict-maxdepth)
	* [distill()]()
	* [down()]()
	* [escape()]()
	* [findOnePath()](#findonepath-source-query)
	* [findPath()]()
	* [flatten()]()
	* [flattenValues()]()
	* [furthest()]()
	* [get()](#get-obj-path-defaultvalue)
	* [hasMatchingPathsInObject()]()
	* [isEqual()]()
	* [isNotEqual()]()
	* [join()]()
	* [joinEscaped()]()
	* [leafNodes()]()
	* [match()]()
	* [numberToWildcard()]()
	* [pop()]()
	* [pullVal()]()
	* [pullValImmutable()]()
	* [push()]()
	* [pushVal()]()
	* [pushValImmutable()]()
	* [set()](#set-obj-path-value)
	* [setImmutable()](#setimmutable-obj-path-value)
	* [shift()]()
	* [split()]()
	* [type()]()
	* [unSet()](#unset-obj-path)
	* [unSetImmutable()]()
	* [up()]()
	* [update()](#update-obj-updatedata-options)
	* [updateImmutable()]()
	* [values()]()
    * [wildcardToZero()]()

## Simple Usage
```js
const {get} = require("@irrelon/path");

// Define an object in JSON
const obj = {
  "users": {
    "test1": {
      "name": "My Test User"
    }
  }
};

// Grab data from the object via the path solver
const result = get(obj, 'users.test1.name');

console.log(result); // Logs: My Test User
```

## Escaping Fields with Periods
Sometimes you want to access data where a field name has periods in it like this:

```js
const obj = {
  "users": {
    "test@test.com": {
      "name": "My Test User"
    }
  }
};
```

The user email address "test@test.com" contains a period that the path solver
will interpret as a traversal indicator. If we try to ask the path solver to get
the data in the key "test@test.com" it will look for a field called "test@test"
with a sub-field "com".

To avoid this, escape the period using the escape() function:

```js
const {get, escape} = require("@irrelon/path");
const result = get(obj, `users.${escape('test@test.com')}.name`);

console.log(result); // Logs: My Test User
```

## Behaviour
If data or an object to traverse does not exist inside the base object, the
path solver will return undefined and will NOT throw an error:

```js
const {get} = require("@irrelon/path");

const obj = {
  "foo": null
};

const result = get(obj, "foo.bar.one");

console.log(result); // Logs: undefined
```

## Default Values
When using get() you can specify a default value to return if the value at
the given path is undefined.

```js
const {get} = require("@irrelon/path");

const obj = {
  "foo": null
};

const result = get(obj, "foo.bar.one", "My Default Value");

console.log(result); // Logs: My Default Value
```

## Methods
### chop (`path`, `level`)

|Param|Type|Required|Default|
|---|---|---|---|
|path|String|true|none|
|level|Number|true|none|

Chops a `path` string down to the given `level`. Given a `path` string
like "foo.bar.ram.you.too", chop will remove any path parts below
the given `level`. If we pass 2 as the `level` with that given `path`,
the result will be "foo.bar" as foo is level 1 and bar is level 2.

If the `path` is shorter than the given `level`, it is returned intact.

```js
const {chop} = require("@irrelon/path");

const result = chop("foo.bar.one", 2);

console.log(result); // Logs: foo.bar
```

### clean (`path`)

|Param|Type|Required|Default|
|---|---|---|---|
|path|String|true|none|

Removes leading period (.) from string and returns new string.

```js
const {clean} = require("@irrelon/path");

const result = clean(".foo.bar.one");

console.log(result); // Logs: foo.bar.one
```

### countLeafNodes (`obj`)

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|

Counts the total number of key leaf nodes in the passed object.
Leaf nodes are any key that does not have a value of object or
array.

```js
const {countLeafNodes} = require("@irrelon/path");

const result = countLeafNodes({"foo": {"bar": null}, "moo": true});

console.log(result); // Logs: 2
```

### countMatchingPathsInObject (`testKeys`, `testObj`)

|Param|Type|Required|Default|
|---|---|---|---|
|testKeys|Object or Array|true|none|
|testObj|Object or Array|true|none|

Tests if the passed object has the paths that are specified and that
a value exists in those paths and if so returns the number matched.
The output includes `matchedKeys` with an object where the same structure
exists as the `testObj` where each leaf node key will be a boolean that
describes if the leaf node exists in the `testKeys` object.

>MAY NOT BE INFINITE RECURSION SAFE.

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
  "matchedKeyCount": 1,
  "matchedKeys": {
    "foo": {
      "bar": false
    },
    "moo": true
  },
  "totalKeyCount": 2
}
```

### decouple (`obj`, `options` = {})

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|options|Object|false|{}|

If options.immutable === true then return a new de-referenced
instance of the passed object/array. If immutable is false
then simply return the same `obj` that was passed. The returned
instance is NOT deeply immutably cloned because we recurse through
object trees and only immutably clone when making changes. This is
useful so you can instantly compare two states with a strict
equality check such as when using [setImmutable()](#setimmutable-obj-path-value). 

```js
const {decouple} = require("@irrelon/path");

const obj = {"foo": true};
const result = decouple(obj);

console.log(result);
console.log(result === obj);
```

Outputs:
```json
{"foo":  true}
```
```
false
```

### diff (`obj1`, `obj2`, `path`, `strict`, `maxDepth`)

|Param|Type|Required|Default|
|---|---|---|---|
|obj1|Object or Array|true|none|
|obj2|Object or Array|true|none|
|path|String|false|""|
|strict|Boolean|false|false|
|maxDepth|Number|false|Infinity|

Compares two objects / arrays and returns the differences as an
array of paths to the different fields.

Fields are considered "different" if they do not contain equal
values. The equality check is either strict or non-strict based
on the `strict` argument.

> It is important to understand that this function detects differences
between field values, not differences between object structures. For
instance if a field in obj1 contains `undefined` and obj2 does not contain
that field at all, it's value in obj2 will also be `undefined` so there
would be no difference detected.

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

const resultArr1 = diff(obj1, obj2, "", false); // Non-strict equality check
const resultArr2 = diff(obj1, obj2, "", true); // Strict equality check

console.log(resultArr1); // Logs: ["user.firstName"]
console.log(resultArr2); // Logs: ["user._id", "user.firstName"]
```

### distill (`obj`, `pathArr`)

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|pathArr|Array<String>|true|none|

Gets the values of the paths in pathArr and returns them as an object
with each key matching the path and the value matching the value from
obj that was at that path.

```js
const {distill} = require("@irrelon/path");

const obj = {
    "user": {
        "firstName": "Jim",
        "lastName": "Jones",
        "age": 22
    }
};

const result = distill(obj, [
    "user.firstName",
    "user.lastName"
]);

console.log(result);
```

Outputs:
```json
{
  "user.firstName": "Jim",
  "user.lastName": "Jones"
}
```

### down (`path`, `levels` = 1)

|Param|Type|Required|Default|
|---|---|---|---|
|path|String|true|none|
|levels|Number|false|1|

Returns the given path after removing the first leaf from the
path. E.g. "foo.bar.thing" becomes "bar.thing".

```js
const {down} = require("@irrelon/path");

const result = down("user.friends.0.firstName");

console.log(result);
```

Outputs:
```json
"friends.0.firstName"
```

> See also [up()](), [pop()](), [shift()]()

### escape (`path`)

|Param|Type|Required|Default|
|---|---|---|---|
|path|String|true|none|

Escapes any periods in the passed string so they will
not be identified as part of a path. Useful if you have
a path like "domains.www.google.com.data" where the
"www.google.com" should not be considered part of the
traversal as it is actually in an object like:

```json
{"domains": {"www.google.com": {"data": "foo"}}}
```

Usage:

```js
const {escape} = require("@irrelon/path");

const result = escape("www.google.com");

console.log(result);
```

Outputs:
```json
"www\\.google\\.com"
```

### findOnePath (`source`, `query`)
Finds the first item that matches the structure of `query`
and returns the path to it

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

// Find the object that has a key "profile"
// with a object that has a key "_id" that 
// has a value 1, and return the path to it
const result1 = findOnePath(myDataArray, {
	profile: {
		_id: 1
	}
});

console.log(result1); // Logs: "0"

// Find the object that has a key "_id" that 
// has a value 1, and return the path to it
const result2 = findOnePath(myDataArray, {
	_id: 1
});

console.log(result2); // Logs: "0.profile"
```

> See the unit tests for findOnePath() for many more examples
 of usage.

### findPath (`source`, `query`)

|Param|Type|Required|Default|Description|
|---|---|---|---|---|
|source|*|true|none|The source to test.|
|query|*|true|none|The query to match.|

Finds all items in `source` that match the structure of `query` and
returns the path to them as an array of strings.

```js
const {findPath} = require("@irrelon/path");

const myData = {
  "profile": {
  	"id": 1,
  	"name": "Ron Swanson",
    "data": {
        "mobile": "+001293284732"
    }
  }
};

const result = findPath(myData, {
	data: {
        "mobile": "+001293284732"
    }
});

console.log(result);
```

Output: 

```json
{"match": true, "path": ["profile"]}
```

### flatten (`obj`)

|Param|Type|Required|Default|Description|
|---|---|---|---|---|
|obj|Object or Array|true|none|The object to scan.|

Takes an object and finds all paths, then returns the paths as an array
of strings.

```js
const {flatten} = require("@irrelon/path");

const myData = {
  "profile": {
  	"id": 1,
  	"name": "Ron Swanson"
  }
};

const result = flatten(myData);

console.log(result);
```

Output:

```json
["profile.id", "profile.name", "profile"]
```

### flattenValues (`obj`)

|Param|Type|Required|Default|Description|
|---|---|---|---|---|
|obj|Object or Array|true|none|The object to scan.|

Takes an object and finds all paths, then returns the paths as keys
and the values of each path as the values.

```js
const {flattenValues} = require("@irrelon/path");

const myData = {
  "profile": {
  	"id": 1,
  	"name": "Ron Swanson"
  }
};

const result = flattenValues(myData);

console.log(result);
```

Output:

```json
{
  "profile": {
    "id": 1,
    "name": "Ron Swanson"
  },
  "profile.id": 1,
  "profile.name": "Ron Swanson"
}
```

### furthest (`obj`, `path`)

|Param|Type|Required|Default|Description|
|---|---|---|---|---|
|obj|Object or Array|true|none|The object to operate on.|
|path|String|true|none|The object to operate on.|

Given object `obj` and a `path`, determines the outermost leaf node
that can be reached where the leaf value is not undefined.

```js
const {furthest} = require("@irrelon/path");

const myData = {
  "profile": {
  	"id": 1,
  	"name": "Ron Swanson"
  }
};

const result = furthest(myData, "profile.id.bson");

console.log(result);
```

Output:

```json
"profile.id"
```

### get (`obj`, `path`, `defaultValue`)

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|path|String|true|none|
|defaultValue|Any|false|undefined|

Gets a value from the `obj` at the given `path` and if no value exists for
that path, returns `defaultValue` if one was provided.

```js
const {get} = require("@irrelon/path");

const obj = {
  "foo": null
};

const result1 = get(obj, "foo");
const result2 = get(obj, "foo.bar.one", "My Default Value");

console.log(result1); // Logs: null
console.log(result2); // Logs: My Default Value
```

If you want to access elements of an array, simply use the element index
as part of your path e.g.

```js
const {get} = require("@irrelon/path");

const obj = {
    "myArr": [
        "hello",
        {
            "bar": "goodbye"
        }
    ]
};

const result1 = get(obj, "myArr.0"); // hello
const result2 = get(obj, "myArr.1.bar"); // goodbye
```

### set (`obj`, `path`, `value`)

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|path|String|true|none|
|value|Any|true|none|

Sets a `value` in the `obj` at the given `path`.

> If the given path doesn't exist in the target object it will be created
by making each non-existent path part a new object.

```js
const {set, get} = require("@irrelon/path");

const obj = {
  "foo": null
};

const result1 = get(obj, "foo.bar"); // Currently: undefined

set(obj, "foo.bar", "hello");

const result2 = get(obj, "foo.bar");

console.log(result1); // Logs: undefined
console.log(result2); // Logs: hello
```

### setImmutable (`obj`, `path`, `value`)
> This is a helper function that calls `set()` with immutable
 flag switched on.

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|path|String|true|none|
|value|Any|true|none|

Sets a `value` in the `obj` at the given `path` in an immutable way
and returns a new object. This will not change or modify the existing
`obj`.

Keep in mind that references to objects that were not modified
by the operation remain the same. This allows systems like React
to appropriately act on changes to specific data rather than
re-rendering an entire DOM tree when one sub-object changes.

> If the given path doesn't exist in the target object it will be created
by making each non-existent path part a new object.

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

const result1 = get(obj, "foo.bar"); // Currently: goodbye

const newObj = setImmutable(obj, "foo.bar", "hello");

// Original object remains unmodified (will still be "goodbye");
const result2 = get(obj, "foo.bar");

// New object has new value of "hello"
const result3 = get(newObj, "foo.bar");

console.log(result1); // Logs: goodbye
console.log(result2); // Logs: goodbye
console.log(result3); // Logs: hello

// Objects that did not have any modifications remain the same
// and still share a reference in memory
console.log(obj.otherObj === newObj.otherObj); // Logs: true

// Objects that did have modifications will not be the same
console.log(obj.foo === newObj.foo); // Logs: false

// Child objects of modified parents will still have references
// to the original since the child object wasn't modified directly
console.log(obj.foo.subBar === newObj.foo.subBar); // Logs: true
```

### unSet (`obj`, `path`)
Deletes a key from an object by the given path.

```js
const obj = {
	"foo": {
		"bar": [{
			"moo": true,
			"baa": "ram you"
		}]
	}
};

console.log(obj.foo.bar[0].baa); // Logs: ram you

unSet(obj, "foo.bar.0.baa");

console.log(obj.foo.bar[0].baa); // Logs: undefined
console.log(obj.foo.bar[0].hasOwnProperty("baa")); // Logs: false
```

### update (`obj`, `basePath`, `updateData`, `options`)
Sets a single value on the passed object and given path. This
will directly modify the "obj" object. If you need immutable
updates, use updateImmutable() instead.

```js
const obj = {
	"foo": {
		"bar": [{
			"moo": true,
			"baa": "ram you"
		}]
	}
};

console.log(obj.foo.bar[0].baa); // Logs: ram you

// Calling this function with a basePath as an empty string
// will operate directly on the passed `obj` instead of a 
// sub-object of `obj`.
update(obj, "", {
	"foo.bar.0.baa": "hello I've been updated",
	"and.so": "have I!"
});

console.log(obj.foo.bar[0].baa); // Logs: hello I've been updated
console.log(obj.and.so); // Logs: have I!
```

## Version 5.x Breaking Changes
The update() and updateImmutable() functions have their signature changed
to include a base path in the arguments. If migrating from a previous
version you can simply add an empty string as the basePath argument to
have the functions operate in the same way as before e.g.

#### Before Version 5.x
```js
update(obj, updateObj);
updateImmutable(obj, updateObj);
```

#### After Version 5.x
```js
update(obj, "", updateObj);
updateImmutable(obj, "", updateObj);
```

The basePath argument was added so that you can target a path within
the passed `obj` to receive the update e.g.

```js
const obj = {subObj: {}};
update(obj, "subObj", {"foo": true});
```

The update above will modify `obj.subObj.foo` to equal `true`.

## Version 3.x Breaking Changes
There was a bug in the get() function that would return an incorrect value
when a non-object was passed to get data from and a path was passed e.g.
```js
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
```js
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
const b = get(a, "hello.foo"); // b === true
```