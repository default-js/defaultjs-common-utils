# @default-js/defaultjs-common-utils

Common utilities for javascript, without dependencies. Works in the browser, in a web worker and in
node.

- **[ObjectUtils](#objectutils)** — compare, merge, filter and inspect objects
- **[PromiseUtils](#promiseutils)** — a promise you settle from outside, and one you can cancel
- **[Escaper](#escaper)** — replace characters in a text and take the replacement back out
- **[PrivateProperty](#privateproperty)** — private state for an object, held outside of it
- **[UUID](#uuid)** — random UUIDs of version 4
- **[ValueHelper](#valuehelper)** — small checks on plain values
- **[GLOBAL](#global)** — the global scope of the current environment
- **[Javascript extensions](#javascript-extensions)** — `String.hashcode()` and `Map.toObject()`
- **[Beyond the main entry](#beyond-the-main-entry)** — ObjectProperty, XmlToJson, ServiceHelper, VERSION

---

## Installation

```sh
npm install @default-js/defaultjs-common-utils
```

## Importing

The package is ESM. Everything on the main entry comes as a named export:

```js
import { ObjectUtils, PromiseUtils, Escaper, PrivateProperty, UUID, ValueHelper, GLOBAL } from "@default-js/defaultjs-common-utils";
```

Every module can be imported on its own, which keeps the bundle smaller and gives you the named
exports of that module directly:

```js
import { merge, filter, buildPropertyFilter } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";
import { lazyPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";
```

In a browser without a build step, the bundle registers itself on the global scope:

```html
<script src="node_modules/@default-js/defaultjs-common-utils/dist/browser-defaultjs-common-utils.min.js"></script>
<script>
    const { ObjectUtils, UUID, VERSION } = window.defaultjs.common.utils;
</script>
```

> **Importing the main entry extends `String` and `Map`.** That is intended — see
> [Javascript extensions](#javascript-extensions). Import single modules instead if you do not want it.

---

## ObjectUtils

### Inspecting

```js
import { isNullOrUndefined, isPrimitive, isObject, isPojo } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

isNullOrUndefined(null);        // true
isNullOrUndefined(0);           // false

isPrimitive("text");            // true
isPrimitive(null);              // true  - null counts as a primitive
isPrimitive(Symbol("x"));       // false - a symbol is treated as an opaque value

isObject([]);                   // true  - every object counts
isObject(null);                 // false
```

`isPojo` asks a stricter question: is this a pure data object, all the way down?

```js
isPojo({a : {b : [1, new Date()]}});   // true
isPojo({a : () => {}});                // false - a function is no data
isPojo({a : [{b : new Foo()}]});       // false - rejected at any depth
isPojo([]);                            // false - the object itself has to be a simple one
```

Accepted as data are primitives, simple objects, `Array`, `Date`, `RegExp`, `Map` and `Set`. Functions,
symbols and class instances are not, no matter how deep they sit.

### Comparing

`equalPojo` compares by value instead of by identity.

```js
import { equalPojo } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

equalPojo({a : [1, 2]}, {a : [1, 2]});         // true
equalPojo(new Set([1, 2]), new Set([2, 1]));   // true  - a set is unordered
equalPojo(new Date(0), new Date(0));           // true  - compared by time
equalPojo(new Error("x"), new Error("x"));     // false - compared by identity
```

A `Date` is compared by its time, a `RegExp` by source and flags. `Set` and `Map` are unordered, so
their entries are matched by value rather than by position, and the keys of a `Map` take part in that.
Simple objects and class instances need the same prototype and the same own enumerable properties.
Everything keeping its state out of reach — `Error`, `Promise`, `WeakMap`, functions, symbols —
compares by identity. Cyclic structures are supported.

### Merging

`merge` is a recursive `Object.assign`. It writes into the target and returns it.

```js
import { merge } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

merge({a : 1}, {b : 2});                 // {a : 1, b : 2}
merge({a : {x : 1}}, {a : {y : 2}});     // {a : {x : 1, y : 2}} - stepped into
merge({a : [1, 2, 3]}, {a : [9]});       // {a : [9]}            - replaced as a whole
merge({}, source1, source2, source3);    // applied in order
```

An `Array`, `Set`, `Map`, `Date` or `RegExp` is always replaced as a whole, never merged entry by
entry — that already applies when only one of the two sides holds one.

> **`merge` writes into the target, and a sub object with no counterpart there is taken over by
> reference** — the same as `Object.assign` does. A later source therefore reaches into the object it
> came from:
>
> ```js
> const DEFAULTS = {server : {port : 8080}};
>
> merge({}, DEFAULTS, {server : {port : 443}});
> DEFAULTS.server.port;   // 443 - the empty target did not protect it
>
> merge(structuredClone(DEFAULTS), {server : {port : 443}});
> DEFAULTS.server.port;   // 8080
> ```
>
> Copy the source first whenever it has to stay reusable.

A class instance is merged property by property like any other object, and the target keeps its own
prototype:

```js
class Foo { constructor() { this.x = 1; } }
class Bar { constructor() { this.y = 2; } }

const target = {a : new Foo()};
merge(target, {a : new Bar()});
target.a.constructor.name;   // "Foo"      - the prototype of the target survives
target.a;                    // {x : 1, y : 2}
```

`__proto__` is skipped, so a merged payload cannot reach `Object.prototype`.

### Filtering

`filter` builds a **new** object holding the properties a filter accepts. The filter is called for
every enumerable property, inherited ones included.

```js
import { filter, buildPropertyFilter } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

const deny = buildPropertyFilter({names : ["password", "token"], allowed : false});

filter({name : "ada", password : "secret"}, deny);   // {name : "ada"}
```

`allowed : true` turns the list into an allow list instead. A filter is just a function, so you can
write your own:

```js
const withoutEmpty = (name, value, context) => value !== null && value !== "";

filter({a : 1, b : "", c : null}, withoutEmpty);   // {a : 1}
```

With `deep` the filter reaches sub objects too. `Array`, `Set` and `Map` are rebuilt with their values
filtered, keeping all of their entries and, for a `Map`, its keys. A cyclic reference resolves to the
filtered copy, so the result never carries a reference back into the untouched original.

```js
const data = {user : {name : "ada", password : "secret"}, tags : [{password : "x", id : 1}]};

filter(data, deny, {deep : true});
// {user : {name : "ada"}, tags : [{id : 1}]}
```

### Appending by path

`append` adds a value to a property and turns it into an array as soon as a second one arrives. The
key may address a nested property through a dotted path, and missing steps are created on the way.

> The argument order is **key, value, object** — the object comes last and is returned.

```js
import { append } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

append("a", 1, {});           // {a : 1}
append("a", 2, {a : 1});      // {a : [1, 2]}
append("a.b", 1, {});         // {a : {b : 1}}
append("a", undefined, {});   // {} - an undefined value is ignored
```

### Defining properties

Three shorthands around `Object.defineProperty`, all of them non enumerable, so the property does not
show up in `Object.keys` or `JSON.stringify`.

```js
import { defValue, defGet, defGetSet } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

defValue(target, "id", 42);                      // constant, not writable
defGet(target, "size", () => items.length);      // read only, backed by a getter
defGetSet(target, "name", () => name, (v) => (name = v));
```

---

## PromiseUtils

### lazyPromise

A promise handed out together with the two functions settling it. Useful wherever the settling is
driven from somewhere else — an event, a callback, foreign code — and packing all of it into the
executor would only blow the code up or is not possible at all.

```js
import { lazyPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";

const ready = lazyPromise();

element.addEventListener("load", () => ready.resolve(element), {once : true});
element.addEventListener("error", () => ready.reject("could not load"), {once : true});

const loaded = await ready;
```

The promise carries three read only properties:

| Property | Meaning |
| --- | --- |
| `resolved` | the promise has been settled. **Says nothing about the outcome** — true for a failure just as well. |
| `error` | tells a failure from a success |
| `value` | the result after a resolve, the reason after a reject |

```js
const promise = lazyPromise();
promise.resolved;             // false

promise.reject("no connection");
promise.resolved;             // true - settled, not successful
promise.error;                // true
promise.value;                // "no connection"

await promise;                // throws Error("no connection")
```

An `Error` always leads to a rejection, in **both** directions — handing one to `resolve` rejects the
promise just like `reject` would. A reason that is no `Error` is wrapped into one, and a `reject`
without a reason gets an `Error` of its own, so there is always a message to read.

Both functions settle the promise once. A second call throws instead of settling again:

```js
const promise = lazyPromise();
promise.resolve("first");
promise.reject("second");     // throws Error("Promise already resolved!")
```

### timeoutPromise

Calls a function once a timeout has passed, and lets the whole chain behind it be canceled.

```js
import { timeoutPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";

const promise = timeoutPromise((resolve, reject, signal) => resolve("done"), 1000);

await promise;   // "done" after a second
```

The function is called with `resolve`, `reject` and the `AbortSignal` of the promise, so work started
inside it can be aborted along with it. An exception thrown by the function rejects the promise
instead of escaping into the timer.

The promise brings its own `AbortController`. `cancel()` clears a pending timeout and rejects with an
`AbortError`, which travels down the whole chain — no `then` handler behind it runs:

```js
const promise = timeoutPromise((resolve) => resolve("done"), 1000);
const chain = promise.then(() => console.log("never runs"));

promise.cancel();

try {
    await chain;
} catch (error) {
    error.name;         // "AbortError"
    promise.canceled;   // true
}
```

`cancel()` sits on **every** promise derived from it, so a chain can be stopped from any of its links,
and it does nothing once the promise has settled. `cancel(reason)` takes a reason of your own.

---

## Escaper

Replaces texts by a char map and takes the replacement back out.

```js
import Escaper from "@default-js/defaultjs-common-utils/src/Escaper.js";

const escaper = new Escaper([
    {char : "\\", escaped : "\\\\"},
    {char : "\"", escaped : "\\\""},
], true);

escaper.escape(`say "hi"`);        // 'say \\"hi\\"'
escaper.unescape('say \\"hi\\"');  // 'say "hi"'
```

`char` and `escaped` are **texts**, not single characters — an entry may look for `"aa"` and replace it
with `"xyz"`. A character carrying a meaning in a regular expression is matched literally.

The second argument switches case sensitivity on. Leaving it out gives a case **insensitive** escaper,
which also matches the other case of a `char` and therefore does not carry the case through a
roundtrip.

Both directions walk the text once, so a replacement is never touched again by another entry. Where
two entries can match at the same place, **the one written first in the map wins**.

### One directional entries

`at` limits an entry to one direction. Without it the entry takes part in both. The two directions
come as the `MODES` enum:

```js
import Escaper, { MODES } from "@default-js/defaultjs-common-utils/src/Escaper.js";

MODES.escape;     // "escape"
MODES.unescape;   // "unescape"

const escaper = new Escaper([
    {char : "&", escaped : "&amp;"},
    {char : "&", escaped : "&#38;", at : MODES.unescape},   // read the old form, never write it
], true);

escaper.escape("a & b");         // "a &amp; b"
escaper.unescape("a &#38; b");   // "a & b"
escaper.unescape("a &amp; b");   // "a & b" - the entry without at still works in both directions
```

The values are the plain texts `"escape"` and `"unescape"`, and **`at` is compared in lower case** —
`"Unescape"` and `"UNESCAPE"` name the same direction. Writing the text by hand is therefore fine;
`MODES` is the safer way to spell it, not the only one. A direction that is not one of the two at all
is still rejected:

```js
new Escaper([{char : "a", escaped : "X", at : "both"}], true);
// TypeError: Escaper: unusable char map
//     entry 0: at has to be "escape" or "unescape", not "both"
```

An empty `escaped` drops the text while escaping, which cannot be undone — such an entry takes part in
escaping only.

### REGEXP_ESCAPER

A ready made escaper taking the meaning out of every character a regular expression reads specially,
so user input can be put into a pattern safely.

```js
import { REGEXP_ESCAPER } from "@default-js/defaultjs-common-utils/src/Escaper.js";

const pattern = new RegExp(`^${REGEXP_ESCAPER.escape("a+b")}$`);

pattern.test("a+b");   // true
pattern.test("aab");   // false - the + carries no meaning anymore
```

It is a singleton; `Escaper.REGEXP_ESCAPER()` hands out the same instance.

### Unusable maps are rejected

The constructor checks the whole map and reports **every** problem at once, with the index of the
entry:

```js
new Escaper([
    {char : "a", escaped : "X"},
    {char : "", escaped : "Y"},
    {char : "b", escaped : "Z", at : "Escape"},
], true);

// TypeError: Escaper: unusable char map
//     entry 1: char must not be empty
//     entry 2: at has to be "escape" or "unescape", not "Escape"
```

---

## PrivateProperty

State belonging to an object, kept outside of it. The values live in a `WeakMap` keyed by the object,
so nothing is added to the object itself, nothing shows up in `Object.keys` or `JSON.stringify`, and
the state becomes collectable once the object is gone.

```js
import { privateProperty, privatePropertyAccessor, privateStore } from "@default-js/defaultjs-common-utils/src/PrivateProperty.js";

privateProperty(instance, "count", 1);   // write
privateProperty(instance, "count");      // 1
privateProperty(instance);               // {count : 1} - the whole store

Object.keys(instance);                   // [] - nothing landed on the object
```

What decides between reading and writing is the **number of arguments**, not their content — passing
`undefined` as the value still counts as a write.

An accessor writes the name once instead of at every call:

```js
const count = privatePropertyAccessor("count");

count(instance, 1);   // write
count(instance);      // 1
```

---

## UUID

```js
import { uuid, UUID_SCHEMA } from "@default-js/defaultjs-common-utils/src/UUID.js";

uuid();         // "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
UUID_SCHEMA;    // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
```

Version 4, with the digits coming from `crypto.getRandomValues` rather than from `Math.random`.
Requires a `crypto` on the global scope, which every browser and every web worker brings.

---

## ValueHelper

```js
import { noValue, emptyOrBlank } from "@default-js/defaultjs-common-utils/src/ValueHelper.js";

noValue(null);          // true
noValue(undefined);     // true
noValue(0);             // false - 0 is a value

emptyOrBlank("   ");    // true  - whitespace only
emptyOrBlank(null);     // true
emptyOrBlank("text");   // false
```

`emptyOrBlank` expects a string and throws on anything without a `trim`.

---

## GLOBAL

The global scope of the current environment, resolved once when the module is loaded:
`globalThis`, then `global`, `window` and `self` for engines not knowing it yet. An empty object when
none of them exists, so reading from it never throws.

```js
import GLOBAL from "@default-js/defaultjs-common-utils/src/Global.js";

GLOBAL.crypto.getRandomValues(buffer);
```

---

## Javascript extensions

Importing the main entry — or `src/javascript/index.js` on its own — extends two built in types. Each
extension is added **only when the type does not already carry that name**, so a newer engine or
another library keeps the upper hand.

```js
import "@default-js/defaultjs-common-utils/src/javascript/index.js";

"test".hashcode();   // 3556498
"".hashcode();       // 0

new Map([["a", 1], ["b", new Map([["c", 2]])]]).toObject();   // {a : 1, b : {c : 2}}
```

`hashcode` is the hash java uses for its strings, kept inside 32 signed bits. It is meant for
bucketing and for telling texts apart cheaply — two different texts can share a hash, and it is no
cryptographic digest.

`toObject` converts nested maps along the way. Every key becomes a property name, so a key that is no
string is turned into one the way javascript does it: an object key ends up as `"[object Object]"`,
and two keys collapsing onto the same name overwrite each other.

---

## Beyond the main entry

These are shipped but not exported from the main entry — import them from their own file.

### ObjectProperty

One property of an object, addressed by a dotted path. This is what `ObjectUtils.append` is built on.

```js
import ObjectProperty from "@default-js/defaultjs-common-utils/src/ObjectProperty.js";

const property = ObjectProperty.load({a : {b : 1}}, "a.b");
property.value;        // 1
property.value = 2;    // writes into the object

ObjectProperty.load({list : [1, 2]}, "list.1").value;   // 2 - an array is an object
ObjectProperty.load({}, "a.b", false);                  // null - nothing created
ObjectProperty.load({a : 0}, "a.b");                    // throws - 0 is no object
```

A missing step is created unless `create` is `false`; a step holding `null` counts as missing and is
replaced. `hasValue` asks whether something is stored, `keyDefined` whether the key is reachable at
all — the latter answers for the whole prototype chain.

### XmlToJson

```js
import xmlToJson from "@default-js/defaultjs-common-utils/src/converter/XmlToJson.js";

xmlToJson("<a><b>text</b></a>");         // {a : {b : "text"}}
xmlToJson(`<a id="1">text</a>`);         // {a : {"@id" : "1", "@" : "text"}}
xmlToJson("<a><b>1</b><b>2</b></a>");    // {a : {b : ["1", "2"]}}
```

An element without attributes and without child elements becomes its text. Everything else becomes an
object: an attribute lands under `"@"` plus its name, the text of the element under `"@"` alone. An
element occurring more than once becomes an array, keeping the order of the document.

Malformed xml does **not** throw — the parser hands back a document describing the error, and that is
converted like any other one. Check for a `parsererror` if the source is not trusted. Needs a
`DOMParser`, so this one is browser and worker only.

### ServiceHelper and VERSION

```js
import { SERVICEURL } from "@default-js/defaultjs-common-utils/src/ServiceHelper.js";
import { VERSION } from "@default-js/defaultjs-common-utils/src/version.js";
```

`SERVICEURL` is the url the package was loaded from, for building paths to files shipped next to it.
`VERSION` is generated from `package.json` before every build.

---

## Complete examples

### Configuration from defaults, file and environment

`merge` applies sources in order, so the later one wins. Combined with `filter` the result can be
logged without leaking secrets.

```js
import { merge, filter, buildPropertyFilter, equalPojo } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

const DEFAULTS = {
    server : {host : "localhost", port : 8080, tls : false},
    retry : {times : 3, delay : 250},
    features : ["search"],
};

// structuredClone, not merge({}, DEFAULTS, …) - an empty target does not protect the sub objects of
// DEFAULTS, they would be taken over by reference and written into by the sources behind it
const config = merge(structuredClone(DEFAULTS), fileConfig, environmentConfig);

// features is an array, so it is replaced as a whole, never appended to:
//   DEFAULTS.features ["search"] + fileConfig.features ["search", "export"] -> ["search", "export"]

const withoutSecrets = buildPropertyFilter({names : ["password", "token", "secret"], allowed : false});
console.log(filter(config, withoutSecrets, {deep : true}));

// and only write it back when something actually changed
if (!equalPojo(config, lastWrittenConfig)) save(config);
```

### Grouping records into a nested structure

`append` builds the path and turns a property into an array as soon as a second value arrives, so
grouping needs no bookkeeping.

```js
import { append } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

const entries = [
    {country : "de", city : "berlin", name : "ada"},
    {country : "de", city : "berlin", name : "alan"},
    {country : "de", city : "hamburg", name : "grace"},
    {country : "at", city : "vienna", name : "edsger"},
];

const grouped = entries.reduce((result, entry) => append(`${entry.country}.${entry.city}`, entry.name, result), {});

// {
//     de : {berlin : ["ada", "alan"], hamburg : "grace"},
//     at : {vienna : "edsger"},
// }
```

Note that a group holding a single entry stays a plain value — wrap it with `[].concat(value)` when
you need an array every time.

### A search box built from user input

Everything the user types has to lose its regex meaning before it reaches a pattern.

```js
import { REGEXP_ESCAPER } from "@default-js/defaultjs-common-utils/src/Escaper.js";

const search = (needle, haystack) => {
    const pattern = new RegExp(REGEXP_ESCAPER.escape(needle), "i");
    return haystack.filter((text) => pattern.test(text));
};

search("c++", ["c++ primer", "c programming"]);   // ["c++ primer"]
```

Without the escaper, `"c++"` would either throw as an invalid pattern or match something else
entirely.

### A template syntax with its own escaping

An escaper is not limited to single characters, and `at` lets you read a format you no longer write.

```js
import Escaper, { MODES } from "@default-js/defaultjs-common-utils/src/Escaper.js";

const TEMPLATE_ESCAPER = new Escaper([
    {char : "${", escaped : "\\${"},
    {char : "}", escaped : "\\}"},
    {char : "${", escaped : "<%", at : MODES.unescape},   // an older escape form, still readable
], true);

TEMPLATE_ESCAPER.escape("costs ${amount}");        // "costs \\${amount\\}"
TEMPLATE_ESCAPER.unescape("costs <%amount\\}");    // "costs ${amount}"
```

### Waiting for something a framework controls

`lazyPromise` turns a callback based api into something awaitable, without wrapping the whole flow
into an executor.

```js
import { lazyPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";

class Component {
    #ready = lazyPromise();

    // whoever needs the component can await this, no matter when they ask
    get ready() {
        return this.#ready;
    }

    // called by the framework, possibly long after someone started waiting
    connectedCallback() {
        try {
            this.#render();
            this.#ready.resolve(this);
        } catch (error) {
            this.#ready.reject(error);   // an Error rejects, in both directions
        }
    }
}

const component = new Component();
await component.ready;
component.ready.resolved;   // true
```

Because a `lazyPromise` settles only once, a second `connectedCallback` would throw rather than
silently disagree with what the first one reported.

### A cancellable delayed action

Typical for a debounce, a tooltip or an autosave: something should happen later unless it is called
off.

```js
import { timeoutPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";

let pending = null;

const scheduleSave = (document) => {
    if (pending) pending.cancel();

    pending = timeoutPromise(async (resolve, reject, signal) => {
        try {
            resolve(await fetch("/save", {method : "POST", body : JSON.stringify(document), signal}));
        } catch (error) {
            reject(error);
        }
    }, 2000);

    return pending
        .then((response) => showSaved(response))
        .catch((error) => {
            if (error.name !== "AbortError") showError(error);
        });
};
```

The signal is handed into `fetch`, so cancelling also aborts a request that already went out. The
rejection travels down the chain, so `showSaved` never runs for a cancelled save.

### Private state without touching the object

```js
import { privatePropertyAccessor } from "@default-js/defaultjs-common-utils/src/PrivateProperty.js";

const listeners = privatePropertyAccessor("listeners");

class EventTargetish {
    constructor() {
        listeners(this, []);
    }

    on(handler) {
        listeners(this).push(handler);
        return this;
    }

    emit(event) {
        for (const handler of listeners(this)) handler(event);
    }
}

const target = new EventTargetish().on(console.log);

Object.keys(target);           // []      - nothing on the object
JSON.stringify(target);        // "{}"    - nothing serializes
```

### An xml configuration merged into defaults

```js
import xmlToJson from "@default-js/defaultjs-common-utils/src/converter/XmlToJson.js";
import { merge } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";

const response = await fetch("/config.xml");
const parsed = xmlToJson(await response.text());

if (JSON.stringify(parsed).includes("parsererror")) throw new Error("config.xml is malformed");

const config = merge({}, DEFAULTS, parsed.config);
```

---

## Requirements

Node 16 or newer, or a current browser or web worker. The package uses `AbortController`,
`Array.prototype.flatMap` and `WeakMap`, and `UUID` needs a `crypto` on the global scope.

## Development

```sh
npm test          # runs the suite once in headless chrome
npm run test:live # keeps watching
npm run build     # test, then a development and a production bundle
```

The coverage report lands in `coverage/` after every test run. Known shortcomings that are accepted
for now are collected in [TECHNICAL-DEBT.md](TECHNICAL-DEBT.md).

## License

MIT — see [LICENSE](LICENSE).
