# Irrelon Path
A powerful JSON path processor. Allows you to drill into JSON objects
with a simple dot-delimited path format e.g. "obj.name"

## What Can It Do?
Irrelon Path is a JavaScript object manipulation library that uses
dot notation to denote object key / value field locations within 
the object structure. It allows you to easily access, modify or
remove data from an object at locations specified via a path string.

## New in Version 2
Version 1.x exported a class that you could instantiate. Version 2.x
exports an object with all available functions. You can require version
2.x either all at once (all functions) or you can destructure to require
only the functions you need. This change is primarily to support tree
shaking, as well as move to a more functional programming style, albeit
not pure functional style :)

Version 2.x is a breaking change from version 1.x and you will need to
migrate your code to work with the new version.

## Install

```bash
npm i irrelon-path
```

## Usage
```js
const pathSolver = require("irrelon-path");

// You can also require only what you need from the library
// e.g. const {get} = require("irrelon-path");

...

// Define an object in JSON
const obj = {
  "users": {
    "test1": {
      "name": "My Test User"
    }
  }
};

// Grab data from the object via the path solver
console.log(pathSolver.get(obj, 'users.test1.name')); // Will console log "My Test User"
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

To avoid this, escape the path key with a period:

```js
console.log(pathSolver.get(obj, `users.${pathSolver.escape('test@test.com')}.name`)); // Will console log "My Test User"
```

## Behaviour
If data or an object to traverse does not exist inside the base object, the path solver will return undefined and will
NOT throw an error:

```js
const obj = {
  "foo": null
};

console.log(pathSolver.get(obj, "foo.bar.one")); // Logs undefined
```
