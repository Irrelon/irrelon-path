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

### update (`obj`, `updateData`, `options`)
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

update(obj, {
	"foo.bar.0.baa": "hello I've been updated",
	"and.so": "have I!"
});

console.log(obj.foo.bar[0].baa); // Logs: hello I've been updated
console.log(obj.and.so); // Logs: have I!
```

### clean (`str`)
Removes leading period (.) from string and returns new string.

### countLeafNodes (`obj`)
Counts the total number of key leaf nodes in the passed `obj`.
Leaf nodes are values in the object tree that cannot contain
other key/values (so are not objects or arrays).

```js
const {countLeafNodes} = require("@irrelon/path");

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

const result = countLeafNodes(obj);

console.log(result); // Logs: 3 (foo.bar, foo.subBar.somthingElse, otherObj.enabled)
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