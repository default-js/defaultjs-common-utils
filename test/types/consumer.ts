/**
 * A typed consumer of the package, checked by `npm run typecheck`.
 *
 * The declaration files are written by hand, so nothing stops them from drifting away from the
 * javascript they describe. This file is what notices: it touches every export and imports through
 * the package name, so the exports map and the types conditions of package.json are exercised the
 * same way a real consumer would.
 *
 * The @ts-expect-error lines are assertions, not suppressions. Should one of them stop being an
 * error - because a type got too loose - typescript reports the unused directive and the check fails.
 *
 * Nothing here runs. Add to it whenever an export is added or its signature changes.
 */
import { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID } from "@default-js/defaultjs-common-utils";
import {
	merge,
	filter,
	buildPropertyFilter,
	append,
	equalPojo,
	isPojo,
	isPrimitive,
	isObject,
	isNullOrUndefined,
	defValue,
	defGet,
	defGetSet,
} from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";
import type { PropertyFilter } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";
import { lazyPromise, timeoutPromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";
import type { LazyPromise, CancelablePromise } from "@default-js/defaultjs-common-utils/src/PromiseUtils.js";
import EscaperClass, { MODES, REGEXP_ESCAPER } from "@default-js/defaultjs-common-utils/src/Escaper.js";
import type { CharMapEntry, Mode } from "@default-js/defaultjs-common-utils/src/Escaper.js";
import ObjectProperty from "@default-js/defaultjs-common-utils/src/ObjectProperty.js";
import { privateProperty, privatePropertyAccessor, privateStore } from "@default-js/defaultjs-common-utils/src/PrivateProperty.js";
import { uuid, UUID_SCHEMA } from "@default-js/defaultjs-common-utils/src/UUID.js";
import { noValue, emptyOrBlank } from "@default-js/defaultjs-common-utils/src/ValueHelper.js";
import GLOBAL_DIRECT from "@default-js/defaultjs-common-utils/src/Global.js";
import { VERSION } from "@default-js/defaultjs-common-utils/src/version.js";
import { SERVICEURL } from "@default-js/defaultjs-common-utils/src/ServiceHelper.js";
import xmlToJson from "@default-js/defaultjs-common-utils/src/converter/XmlToJson.js";
import type { XmlJson } from "@default-js/defaultjs-common-utils/src/converter/XmlToJson.js";
import ready from "@default-js/defaultjs-common-utils/src/Ready.js";
import "@default-js/defaultjs-common-utils/src/javascript/index.js";

// --- ObjectUtils ---
const isNothing: boolean = isNullOrUndefined(null);
const isSimple: boolean = isPrimitive("x");
const isAnObject: boolean = isObject({});
const isEqual: boolean = equalPojo({a : 1}, {a : 1});
const isData: boolean = isPojo({a : 1});

const appended: {a? : number} = append("a", 1, {} as {a? : number});
const merged: {a : number} = merge({a : 1}, {b : 2});
const fromNothing: Record<string, any> = merge(null, {a : 1});

const deny: PropertyFilter = buildPropertyFilter({names : ["password"], allowed : false});
const own: PropertyFilter = (name, value, context) => name.length > 0 && context !== null && value !== undefined;
const filtered: Record<string, any> = filter({a : 1}, deny);
const filteredDeep = filter<{a : number}>({a : 1}, own, {deep : true});
const deepValue: number = filteredDeep.a;

defValue({}, "x", 1);
defGet({}, "x", () => 1);
defGetSet({}, "x", () => 1, (value) => value);

// the default object of the main entry carries the same functions
const viaDefault: boolean = ObjectUtils.equalPojo(1, 1);
ObjectUtils.merge({}, {});
ObjectUtils.append("a", 1, {});

// --- PromiseUtils ---
const lazy: LazyPromise<string> = lazyPromise<string>();
lazy.resolve("done");
lazy.reject(new Error("x"));
const lazyResolved: boolean = lazy.resolved;
const lazyFailed: boolean = lazy.error;
const lazyValue: any = lazy.value;
const lazyChained: Promise<string> = lazy.then((value) => value);

const timed: CancelablePromise<number> = timeoutPromise<number>((resolve, reject, signal) => {
	if (signal.aborted) reject(new Error("x"));
	else resolve(1);
}, 100);
timed.cancel();
timed.cancel(new Error("own reason"));
const timedCanceled: boolean = timed.canceled;
const timedSignal: AbortSignal = timed.signal;
// cancel survives a derived promise
const derived: CancelablePromise<string> = timed.then((value) => String(value));
derived.cancel();
derived.catch(() => "recovered").cancel();
PromiseUtils.lazyPromise();
PromiseUtils.timeoutPromise((resolve) => resolve(1), 10);

// --- Escaper ---
const entry: CharMapEntry = {char : "a", escaped : "X"};
const entryWithMode: CharMapEntry = {char : "a", escaped : "X", at : MODES.unescape};
const entryWithText: CharMapEntry = {char : "a", escaped : "X", at : "Unescape"};
const mode: Mode = MODES.escape;
const escaper = new EscaperClass([entry, entryWithMode, entryWithText], true);
const escaped: string = escaper.escape("a");
const unescaped: string = escaper.unescape("X");
const singleton: EscaperClass = EscaperClass.REGEXP_ESCAPER();
const quoted: string = REGEXP_ESCAPER.escape("a+b");
new Escaper([entry]);

// --- ObjectProperty ---
const property = ObjectProperty.load({a : {b : 1}}, "a.b");
if(property){
	const value: any = property.value;
	property.value = 2;
	property.append = 3;
	property.remove();
	const defined: boolean = property.keyDefined;
	const stored: boolean = property.hasValue;
	const key: string = property.key;
}
ObjectProperty.load({}, "a.b", false);

// --- PrivateProperty ---
const store: Record<string, any> = privateStore({});
const wholeStore: Record<string, any> = privateProperty({});
const singleValue: any = privateProperty({}, "name");
privateProperty({}, "name", 1);
const accessor = privatePropertyAccessor("count");
accessor({}, 1);
const readBack: any = accessor({});
PrivateProperty.privateStore({});

// --- the smaller modules ---
const id: string = uuid();
const schema: string = UUID_SCHEMA;
const blank: boolean = emptyOrBlank("  ");
const nothing: boolean = noValue(null);
const version: string = VERSION;
const url: URL = SERVICEURL;
const parsed: XmlJson = xmlToJson("<a>x</a>");
const readyPromise = ready();
readyPromise.resolve(1);
ValueHelper.noValue(null);
UUID.uuid();
const scope: typeof globalThis = GLOBAL;
const scopeDirect: typeof globalThis = GLOBAL_DIRECT;

// --- the prototype extensions ---
const hash: number = "test".hashcode();
const asObject: Record<string, any> = new Map([["a", 1]]).toObject();

// --- assertions: every line below has to be an error ---
// @ts-expect-error escape takes a string
escaper.escape(1);
// @ts-expect-error char is required
const withoutChar: CharMapEntry = {escaped : "X"};
// @ts-expect-error ms is required
timeoutPromise((resolve) => resolve(1));
// @ts-expect-error uuid takes no argument
uuid("x");
// @ts-expect-error the second argument has to be a boolean
new EscaperClass([entry], "yes");
// @ts-expect-error load needs a key
ObjectProperty.load({});
// @ts-expect-error emptyOrBlank takes a string
emptyOrBlank(1);
// @ts-expect-error there is no such export
import { doesNotExist } from "@default-js/defaultjs-common-utils/src/ObjectUtils.js";
// @ts-expect-error escapeMap is private
escaper.escapeMap;
// @ts-expect-error unescapeMap is private
escaper.unescapeMap;
// @ts-expect-error escapeMatcher is private
escaper.escapeMatcher;
// @ts-expect-error unescapeMatcher is private
escaper.unescapeMatcher;
// @ts-expect-error MODES is frozen
MODES.escape = "other";

export {};
