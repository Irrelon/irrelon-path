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
### get (obj, path, defaultValue)

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

### set (obj, path, value)

|Param|Type|Required|Default|
|---|---|---|---|
|obj|Object or Array|true|none|
|path|String|true|none|
|value|Any|true|none|

Sets a `value` in the `obj` at the given `path`.

> If the given path doesn't exist in the target object it will be created
by making each non-existent path part a new object.

```js
const {set} = require("@irrelon/path");

const obj = {
  "foo": null
};

const result1 = get(obj, "foo.bar"); // Currently: undefined

set(obj, "foo.bar", "hello");

const result2 = get(obj, "foo.bar");

console.log(result1); // Logs: undefined
console.log(result2); // Logs: hello
```

## New in Version 2
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
const Path = require("irrelon-path");
const pathSolver = new Path();
const a = {hello: {foo: true}};
const b = pathSolver.get(a, "hello.foo"); // b === true
```

#### Version 2.x Style Code (Please Use This)
```js
const {get} = require("@irrelon/path");
const a = {hello: {foo: true}};
const b = get(a, "hello.foo"); // b === true
```