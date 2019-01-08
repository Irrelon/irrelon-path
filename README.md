# Irrelon Path
A powerful JSON path processor. Allows you to drill into JSON objects with a simple dot-delimited path format e.g. "obj.name"

## Install

```bash
npm i irrelon-path
```

## Usage
```js
const Path = require('irrelon-path');
const pathSolver = new Path();

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
console.log(pathSolver.get(obj, 'users.test1.name'); // Will console log "My Test User"
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
console.log(pathSolver.get(obj, `users.${Path.escape('test@test.com')}.name`); // Will console log "My Test User"
```

You can use the static function on the constructor via Path.escape, or you can use escape() from the class instance:

```js
console.log(pathSolver.get(obj, `users.${pathSolver.escape('test@test.com')}.name`); // Will console log "My Test User"
```

## Behaviour
If data or an object to traverse does not exist inside the base object, the path solver will return undefined and will
NOT throw an error:

```js
const obj = {
  "foo": null
};

console.log(pathSolver.get(obj, "foo.bar.one"); // Logs undefined
```
