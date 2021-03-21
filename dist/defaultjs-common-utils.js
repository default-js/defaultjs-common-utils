/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _src__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./src */ "./src/index.js");


/* harmony default export */ __webpack_exports__["default"] = (_src__WEBPACK_IMPORTED_MODULE_0__["default"]);

/***/ }),

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./src/Escaper.js":
/*!************************!*\
  !*** ./src/Escaper.js ***!
  \************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
// required to build the internal escape filter for regex
const REGEXCHARMAP = ["\\","?","[", "]", "{", "}", "(", ")", ".", "^", "$"]
	.map(char => { 
		return {f: new RegExp("\\" +char, "g"), v : "\\" + char};
	});


const mapping = (aText, theFilters) => {
	let text = aText;
	theFilters.forEach(item => {
		text = text.replace(item.f, item.v);
	});
	return text;
};

const buildUnescapeList = (aCharMap, isCaseSensitiv) => {
	const option = isCaseSensitiv ? "mg" : "mgi"; 
	return aCharMap.map(item => {
		if(!item.at || item.at == "unescape")
			return {f: new RegExp(mapping(item.escaped, REGEXCHARMAP), option), v: item.char}
	}).filter(item => !!item);
};

const buildEscapeList = (aCharMap, isCaseSensitiv) => {
	const option = isCaseSensitiv ? "mg" : "mgi"; 
	return aCharMap.map(item => {
		if(!item.at || item.at == "escape")
			return {f: new RegExp(mapping(item.char,REGEXCHARMAP), option), v: item.escaped}
	}).filter(item => !!item);
};
class Escaper {
	constructor(escapeMap, isCaseSensitiv){
		this.escapeMap = buildEscapeList(escapeMap, isCaseSensitiv)
		this.unescapeMap = buildUnescapeList(escapeMap, isCaseSensitiv)
	}
	
	escape(aText){
		return mapping(aText, this.escapeMap);
	}
	
	unescape(aText){
		return mapping(aText, this.unescapeMap);
	}
	
	static REGEXP_ESCAPER(){
		return new Escaper([
			{char: "\\", escaped : "\\\\"},
			{char: "?", escaped : "\\?"},
			{char: "[", escaped : "\\["},
			{char: "]", escaped : "\\]"},
			{char: "{", escaped : "\\{"},
			{char: "}", escaped : "\\}"},
			{char: "(", escaped : "\\("},
			{char: ")", escaped : "\\)"},
			{char: ".", escaped : "\\."},
			{char: "^", escaped : "\\^"},
			{char: "$", escaped : "\\$"}
		]);
	}
}

/* harmony default export */ __webpack_exports__["default"] = (Escaper);



/***/ }),

/***/ "./src/Global.js":
/*!***********************!*\
  !*** ./src/Global.js ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(global) {const GLOBAL = (() => {
	if(typeof global !== "undefined") return global;
	if(typeof window !== "undefined") return window;	
	if(typeof self !== "undefined") return self;
	return {};
})();

/* harmony default export */ __webpack_exports__["default"] = (GLOBAL);
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./src/ObjectProperty.js":
/*!*******************************!*\
  !*** ./src/ObjectProperty.js ***!
  \*******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ObjectProperty; });
class ObjectProperty {
	constructor(key, context){
		this.key = key;
		this.context = context;
	}
	
	get keyDefined(){
		return this.key in this.context; 
	}
	
	get hasValue(){
		return !!this.context[this.key];
	}
	
	get value(){
		return this.context[this.key];
	}
	
	set value(data){
		this.context[this.key] = data;
	}
	
	set append(data) {
		if(!this.hasValue)
			this.value = data;
		else {
			const value = this.value;
			if(value instanceof Array)
				value.push(data);
			else
				this.value = [this.value, data];
		}
	}
	
	remove(){
		delete this.context[this.key];
	}
	
	static load(data, key, create=true) {
		let context = data;
		const keys = key.split("\.");
		let name = keys.shift().trim();
		while(keys.length > 0){
			if(!context[name]){
				if(!create)
					return null;
				
				context[name] = {}
			}
			
			context = context[name];
			name = keys.shift().trim();
		}
		
		return new ObjectProperty(name, context);
	}
};

/***/ }),

/***/ "./src/ObjectUtils.js":
/*!****************************!*\
  !*** ./src/ObjectUtils.js ***!
  \****************************/
/*! exports provided: append, isPojo, merge, filter, defValue, defGet, defGetSet, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "append", function() { return append; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isPojo", function() { return isPojo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "merge", function() { return merge; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "filter", function() { return filter; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "defValue", function() { return defValue; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "defGet", function() { return defGet; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "defGetSet", function() { return defGetSet; });
/* harmony import */ var _ObjectProperty_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ObjectProperty.js */ "./src/ObjectProperty.js");

/**
 * append a propery value to an object. If propery exists its would be converted to an array
 *
 *  @param aKey:string name of property
 *  @param aData:any property value
 *  @param aObject:object the object to append the property
 *
 *  @return returns the changed object
 */
const append = function (aKey, aData, aObject) {
	if (typeof aData !== "undefined") {
		const property = _ObjectProperty_js__WEBPACK_IMPORTED_MODULE_0__["default"].load(aObject, aKey, true);
		property.append = aData;
	}
	return aObject;
};

/**
 * checked if an object a simple object. No Array, Map or something else.
 *
 * @param aObject:object the object to be testing
 *
 * @return boolean
 */
const isPojo = function (aObject) {
	return typeof aObject !== "undefined" && aObject != null && aObject.constructor.name === "Object";
};

/**
 * merging object into a target object. Its only merge simple object and sub objects. Every other
 * value would be replaced by value from the source object.
 *
 * sample: merge(target, source-1, source-2, ...source-n)
 *
 * @param aTarget:object the target object to merging into
 * @param aSources:object
 *
 * @return object returns the target object
 */
const merge = function (aTarget) {
	for (let i = 1; i < arguments.length; i++) {
		const source = arguments[i];
		Object.getOwnPropertyNames(source).forEach((aKey) => {
			if (isPojo(aTarget[aKey])) merge(aTarget[aKey], source[aKey]);
			else aTarget[aKey] = source[aKey];
		});
	}

	return aTarget;
};

const buildPropertyFilter = function ({ names, allowed }) {
	return (name, value, context) => {
		return names.includes(name) === allowed;
	};
};

const filter = function () {
	const [data, propFilter, { deep = false, recursive = true, parents = [] } = {}] = arguments;
	const result = {};

	for (let name in data) {
		const value = data[name];
		const accept = propFilter(name, value, data);
		if (accept && (!deep || value === null || value === undefined)) result[name] = value;
		else if (accept && deep) {
			const type = typeof value;
			if (type !== "object" || value instanceof Array || value instanceof Map || value instanceof Set || value instanceof RegExp || parents.includes[value] || value == data) result[name] = value;
			else result[name] = filter(value, propFilter, { deep, recursive, parents: parents.concat(data) });
		}
	}

	return result;
};

const defValue = (o, name, value) => {
	Object.defineProperty(o, name, {
		value,
		writable: false,
		configurable: false,
		enumerable: false
	});
};
const defGet = (o, name, get) => {
	Object.defineProperty(o, name, {
		get,
		configurable: false,
		enumerable: false
	});
};

const defGetSet = (o, name, get, set) => {
	Object.defineProperty(o, name, {
		get,
		set,
		configurable: false,
		enumerable: false
	});
};

/* harmony default export */ __webpack_exports__["default"] = ({
	isPojo,
	append,
	merge,
	filter,
	buildPropertyFilter,
	defValue,
	defGet,
	defGetSet
});


/***/ }),

/***/ "./src/PrivateProperty.js":
/*!********************************!*\
  !*** ./src/PrivateProperty.js ***!
  \********************************/
/*! exports provided: privateProperty, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "privateProperty", function() { return privateProperty; });
const PRIVATE_PROPERTIES = new WeakMap();
const privateStore = (obj) => {
	if(PRIVATE_PROPERTIES.has(obj))
		return PRIVATE_PROPERTIES.get(obj);
	
	const data = {};
	PRIVATE_PROPERTIES.set(obj, data);
	return data;
};

const privateProperty = function(obj, name, value) {
	const data = privateStore(obj);
	if(arguments.length === 1)
		return data;
	else if(arguments.length === 2)
		return data[name];
	else if(arguments.length === 3)
		data[name] = value;
	else
		throw new Error("Not allowed size of arguments!");
};

/* harmony default export */ __webpack_exports__["default"] = ({privateProperty});

/***/ }),

/***/ "./src/PromiseUtils.js":
/*!*****************************!*\
  !*** ./src/PromiseUtils.js ***!
  \*****************************/
/*! exports provided: timeoutPromise, lazyPromise, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "timeoutPromise", function() { return timeoutPromise; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "lazyPromise", function() { return lazyPromise; });
/* harmony import */ var _ObjectUtils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ObjectUtils */ "./src/ObjectUtils.js");


const timeoutPromise = (fn, ms) =>{
	let canceled = false;
	let timeout = null;
	const promise = new Promise((r, e) => {
		timeout = setTimeout(()=> {
			timeout = null;
			fn(r,e);
		}, ms)
	});

	const then = promise.then;
	promise.then = (fn) => {
		then.call(promise, (result) => {
			if(!undefined.canceled)
				return fn(result);
		});
	}

	Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defValue"])(promise, "cancel", () => {
		if(timeout){
			clearTimeout(timeout);
			canceled = true;
		}
	});
	Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defGet"])(promise, canceld, () => canceled);

	return promise;
}


const lazyPromise = () => {
		let promiseResolve = null;
		let promiseError = null;

		const promise = new Promise((r, e) => {
			promiseResolve = r;
			promiseError = e;
		});

		let resolved = false;
		let error = false;
		let value = undefined;

		Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defValue"])(promise, "resolve", (result) => {
			value = result;
			resolved = true;
			if (value instanceof Error) {
				error = true;
				promiseError(value);
			} else promiseResolve(value);
		});

		Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defGet"])(promise, "value", () => value);
		Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defGet"])(promise, "error", () => error);
		Object(_ObjectUtils__WEBPACK_IMPORTED_MODULE_0__["defGet"])(promise, "resolved", () => resolved);

		return promise;
};
/* harmony default export */ __webpack_exports__["default"] = ({
	lazyPromise,
	timeoutPromise
});


/***/ }),

/***/ "./src/ValueHelper.js":
/*!****************************!*\
  !*** ./src/ValueHelper.js ***!
  \****************************/
/*! exports provided: noValue, emtpyOrNoValueString, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "noValue", function() { return noValue; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "emtpyOrNoValueString", function() { return emtpyOrNoValueString; });
const noValue = (value) => {
	return value == null || typeof value === "undefined";
};

const emtpyOrNoValueString = (value) => {	
	return noValue(value) || value.trim().length == 0;
};


/* harmony default export */ __webpack_exports__["default"] = ({
	noValue,
	emtpyOrNoValueString
});

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _javascript__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./javascript */ "./src/javascript/index.js");
/* harmony import */ var _ObjectUtils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ObjectUtils */ "./src/ObjectUtils.js");
/* harmony import */ var _Global__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Global */ "./src/Global.js");
/* harmony import */ var _Escaper__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Escaper */ "./src/Escaper.js");
/* harmony import */ var _ValueHelper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ValueHelper */ "./src/ValueHelper.js");
/* harmony import */ var _PromiseUtils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./PromiseUtils */ "./src/PromiseUtils.js");
/* harmony import */ var _PrivateProperty__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./PrivateProperty */ "./src/PrivateProperty.js");








/* harmony default export */ __webpack_exports__["default"] = ({
	GLOBAL: _Global__WEBPACK_IMPORTED_MODULE_2__["default"] ,
	ObjectUtils: _ObjectUtils__WEBPACK_IMPORTED_MODULE_1__["default"],
	Escaper: _Escaper__WEBPACK_IMPORTED_MODULE_3__["default"],
	ValueHelper: _ValueHelper__WEBPACK_IMPORTED_MODULE_4__["default"],
	PromiseUtils: _PromiseUtils__WEBPACK_IMPORTED_MODULE_5__["default"],
	PrivateProperty: _PrivateProperty__WEBPACK_IMPORTED_MODULE_6__["default"]
});

/***/ }),

/***/ "./src/javascript/String.js":
/*!**********************************!*\
  !*** ./src/javascript/String.js ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports) {

if (!String.prototype.hashcode)
	String.prototype.hashcode = function() {
		if (this.length === 0)
			return 0;
		
		let hash = 0;
		const length = this.length;
		for (let i = 0; i < length; i++) {
			const c = this.charCodeAt(i);
			hash = ((hash << 5) - hash) + c;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};

/***/ }),

/***/ "./src/javascript/index.js":
/*!*********************************!*\
  !*** ./src/javascript/index.js ***!
  \*********************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _String_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./String.js */ "./src/javascript/String.js");
/* harmony import */ var _String_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_String_js__WEBPACK_IMPORTED_MODULE_0__);


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy4vaW5kZXguanMiLCJ3ZWJwYWNrOi8vLyh3ZWJwYWNrKS9idWlsZGluL2dsb2JhbC5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvRXNjYXBlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvR2xvYmFsLmpzIiwid2VicGFjazovLy8uL3NyYy9PYmplY3RQcm9wZXJ0eS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvT2JqZWN0VXRpbHMuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL1ByaXZhdGVQcm9wZXJ0eS5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvUHJvbWlzZVV0aWxzLmpzIiwid2VicGFjazovLy8uL3NyYy9WYWx1ZUhlbHBlci5qcyIsIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2phdmFzY3JpcHQvU3RyaW5nLmpzIiwid2VicGFjazovLy8uL3NyYy9qYXZhc2NyaXB0L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7UUFBQTtRQUNBOztRQUVBO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7O1FBRUE7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTs7O1FBR0E7UUFDQTs7UUFFQTtRQUNBOztRQUVBO1FBQ0E7UUFDQTtRQUNBLDBDQUEwQyxnQ0FBZ0M7UUFDMUU7UUFDQTs7UUFFQTtRQUNBO1FBQ0E7UUFDQSx3REFBd0Qsa0JBQWtCO1FBQzFFO1FBQ0EsaURBQWlELGNBQWM7UUFDL0Q7O1FBRUE7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBO1FBQ0E7UUFDQTtRQUNBLHlDQUF5QyxpQ0FBaUM7UUFDMUUsZ0hBQWdILG1CQUFtQixFQUFFO1FBQ3JJO1FBQ0E7O1FBRUE7UUFDQTtRQUNBO1FBQ0EsMkJBQTJCLDBCQUEwQixFQUFFO1FBQ3ZELGlDQUFpQyxlQUFl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QUFhO0FBQ2I7QUFDQTtBQUNBLEc7Ozs7Ozs7Ozs7OztBQ2JBO0FBQUE7QUFBQSIsImZpbGUiOiJkZWZhdWx0anMtY29tbW9uLXV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuIFx0dmFyIGluc3RhbGxlZE1vZHVsZXMgPSB7fTtcblxuIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbiBcdGZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblxuIFx0XHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcbiBcdFx0aWYoaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0pIHtcbiBcdFx0XHRyZXR1cm4gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0uZXhwb3J0cztcbiBcdFx0fVxuIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuIFx0XHR2YXIgbW9kdWxlID0gaW5zdGFsbGVkTW9kdWxlc1ttb2R1bGVJZF0gPSB7XG4gXHRcdFx0aTogbW9kdWxlSWQsXG4gXHRcdFx0bDogZmFsc2UsXG4gXHRcdFx0ZXhwb3J0czoge31cbiBcdFx0fTtcblxuIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbiBcdFx0bW9kdWxlc1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cbiBcdFx0Ly8gRmxhZyB0aGUgbW9kdWxlIGFzIGxvYWRlZFxuIFx0XHRtb2R1bGUubCA9IHRydWU7XG5cbiBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbiBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuIFx0fVxuXG5cbiBcdC8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBtb2R1bGVzO1xuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZSBjYWNoZVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5jID0gaW5zdGFsbGVkTW9kdWxlcztcblxuIFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbiBmb3IgaGFybW9ueSBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSBmdW5jdGlvbihleHBvcnRzLCBuYW1lLCBnZXR0ZXIpIHtcbiBcdFx0aWYoIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBuYW1lKSkge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBuYW1lLCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZ2V0dGVyIH0pO1xuIFx0XHR9XG4gXHR9O1xuXG4gXHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSBmdW5jdGlvbihleHBvcnRzKSB7XG4gXHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuIFx0XHR9XG4gXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4gXHR9O1xuXG4gXHQvLyBjcmVhdGUgYSBmYWtlIG5hbWVzcGFjZSBvYmplY3RcbiBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuIFx0Ly8gbW9kZSAmIDI6IG1lcmdlIGFsbCBwcm9wZXJ0aWVzIG9mIHZhbHVlIGludG8gdGhlIG5zXG4gXHQvLyBtb2RlICYgNDogcmV0dXJuIHZhbHVlIHdoZW4gYWxyZWFkeSBucyBvYmplY3RcbiBcdC8vIG1vZGUgJiA4fDE6IGJlaGF2ZSBsaWtlIHJlcXVpcmVcbiBcdF9fd2VicGFja19yZXF1aXJlX18udCA9IGZ1bmN0aW9uKHZhbHVlLCBtb2RlKSB7XG4gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IF9fd2VicGFja19yZXF1aXJlX18odmFsdWUpO1xuIFx0XHRpZihtb2RlICYgOCkgcmV0dXJuIHZhbHVlO1xuIFx0XHRpZigobW9kZSAmIDQpICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgJiYgdmFsdWUuX19lc01vZHVsZSkgcmV0dXJuIHZhbHVlO1xuIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIobnMpO1xuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkobnMsICdkZWZhdWx0JywgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdmFsdWUgfSk7XG4gXHRcdGlmKG1vZGUgJiAyICYmIHR5cGVvZiB2YWx1ZSAhPSAnc3RyaW5nJykgZm9yKHZhciBrZXkgaW4gdmFsdWUpIF9fd2VicGFja19yZXF1aXJlX18uZChucywga2V5LCBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV07IH0uYmluZChudWxsLCBrZXkpKTtcbiBcdFx0cmV0dXJuIG5zO1xuIFx0fTtcblxuIFx0Ly8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubiA9IGZ1bmN0aW9uKG1vZHVsZSkge1xuIFx0XHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cbiBcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0KCkgeyByZXR1cm4gbW9kdWxlWydkZWZhdWx0J107IH0gOlxuIFx0XHRcdGZ1bmN0aW9uIGdldE1vZHVsZUV4cG9ydHMoKSB7IHJldHVybiBtb2R1bGU7IH07XG4gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsICdhJywgZ2V0dGVyKTtcbiBcdFx0cmV0dXJuIGdldHRlcjtcbiBcdH07XG5cbiBcdC8vIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbFxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkgeyByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpOyB9O1xuXG4gXHQvLyBfX3dlYnBhY2tfcHVibGljX3BhdGhfX1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5wID0gXCJcIjtcblxuXG4gXHQvLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbiBcdHJldHVybiBfX3dlYnBhY2tfcmVxdWlyZV9fKF9fd2VicGFja19yZXF1aXJlX18ucyA9IFwiLi9pbmRleC5qc1wiKTtcbiIsImltcG9ydCBwYWNrIGZyb20gXCIuL3NyY1wiO1xuXG5leHBvcnQgZGVmYXVsdCBwYWNrOyIsInZhciBnO1xuXG4vLyBUaGlzIHdvcmtzIGluIG5vbi1zdHJpY3QgbW9kZVxuZyA9IChmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXM7XG59KSgpO1xuXG50cnkge1xuXHQvLyBUaGlzIHdvcmtzIGlmIGV2YWwgaXMgYWxsb3dlZCAoc2VlIENTUClcblx0ZyA9IGcgfHwgbmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKTtcbn0gY2F0Y2ggKGUpIHtcblx0Ly8gVGhpcyB3b3JrcyBpZiB0aGUgd2luZG93IHJlZmVyZW5jZSBpcyBhdmFpbGFibGVcblx0aWYgKHR5cGVvZiB3aW5kb3cgPT09IFwib2JqZWN0XCIpIGcgPSB3aW5kb3c7XG59XG5cbi8vIGcgY2FuIHN0aWxsIGJlIHVuZGVmaW5lZCwgYnV0IG5vdGhpbmcgdG8gZG8gYWJvdXQgaXQuLi5cbi8vIFdlIHJldHVybiB1bmRlZmluZWQsIGluc3RlYWQgb2Ygbm90aGluZyBoZXJlLCBzbyBpdCdzXG4vLyBlYXNpZXIgdG8gaGFuZGxlIHRoaXMgY2FzZS4gaWYoIWdsb2JhbCkgeyAuLi59XG5cbm1vZHVsZS5leHBvcnRzID0gZztcbiIsIi8vIHJlcXVpcmVkIHRvIGJ1aWxkIHRoZSBpbnRlcm5hbCBlc2NhcGUgZmlsdGVyIGZvciByZWdleFxuY29uc3QgUkVHRVhDSEFSTUFQID0gW1wiXFxcXFwiLFwiP1wiLFwiW1wiLCBcIl1cIiwgXCJ7XCIsIFwifVwiLCBcIihcIiwgXCIpXCIsIFwiLlwiLCBcIl5cIiwgXCIkXCJdXG5cdC5tYXAoY2hhciA9PiB7IFxuXHRcdHJldHVybiB7ZjogbmV3IFJlZ0V4cChcIlxcXFxcIiArY2hhciwgXCJnXCIpLCB2IDogXCJcXFxcXCIgKyBjaGFyfTtcblx0fSk7XG5cblxuY29uc3QgbWFwcGluZyA9IChhVGV4dCwgdGhlRmlsdGVycykgPT4ge1xuXHRsZXQgdGV4dCA9IGFUZXh0O1xuXHR0aGVGaWx0ZXJzLmZvckVhY2goaXRlbSA9PiB7XG5cdFx0dGV4dCA9IHRleHQucmVwbGFjZShpdGVtLmYsIGl0ZW0udik7XG5cdH0pO1xuXHRyZXR1cm4gdGV4dDtcbn07XG5cbmNvbnN0IGJ1aWxkVW5lc2NhcGVMaXN0ID0gKGFDaGFyTWFwLCBpc0Nhc2VTZW5zaXRpdikgPT4ge1xuXHRjb25zdCBvcHRpb24gPSBpc0Nhc2VTZW5zaXRpdiA/IFwibWdcIiA6IFwibWdpXCI7IFxuXHRyZXR1cm4gYUNoYXJNYXAubWFwKGl0ZW0gPT4ge1xuXHRcdGlmKCFpdGVtLmF0IHx8IGl0ZW0uYXQgPT0gXCJ1bmVzY2FwZVwiKVxuXHRcdFx0cmV0dXJuIHtmOiBuZXcgUmVnRXhwKG1hcHBpbmcoaXRlbS5lc2NhcGVkLCBSRUdFWENIQVJNQVApLCBvcHRpb24pLCB2OiBpdGVtLmNoYXJ9XG5cdH0pLmZpbHRlcihpdGVtID0+ICEhaXRlbSk7XG59O1xuXG5jb25zdCBidWlsZEVzY2FwZUxpc3QgPSAoYUNoYXJNYXAsIGlzQ2FzZVNlbnNpdGl2KSA9PiB7XG5cdGNvbnN0IG9wdGlvbiA9IGlzQ2FzZVNlbnNpdGl2ID8gXCJtZ1wiIDogXCJtZ2lcIjsgXG5cdHJldHVybiBhQ2hhck1hcC5tYXAoaXRlbSA9PiB7XG5cdFx0aWYoIWl0ZW0uYXQgfHwgaXRlbS5hdCA9PSBcImVzY2FwZVwiKVxuXHRcdFx0cmV0dXJuIHtmOiBuZXcgUmVnRXhwKG1hcHBpbmcoaXRlbS5jaGFyLFJFR0VYQ0hBUk1BUCksIG9wdGlvbiksIHY6IGl0ZW0uZXNjYXBlZH1cblx0fSkuZmlsdGVyKGl0ZW0gPT4gISFpdGVtKTtcbn07XG5jbGFzcyBFc2NhcGVyIHtcblx0Y29uc3RydWN0b3IoZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdil7XG5cdFx0dGhpcy5lc2NhcGVNYXAgPSBidWlsZEVzY2FwZUxpc3QoZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdilcblx0XHR0aGlzLnVuZXNjYXBlTWFwID0gYnVpbGRVbmVzY2FwZUxpc3QoZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdilcblx0fVxuXHRcblx0ZXNjYXBlKGFUZXh0KXtcblx0XHRyZXR1cm4gbWFwcGluZyhhVGV4dCwgdGhpcy5lc2NhcGVNYXApO1xuXHR9XG5cdFxuXHR1bmVzY2FwZShhVGV4dCl7XG5cdFx0cmV0dXJuIG1hcHBpbmcoYVRleHQsIHRoaXMudW5lc2NhcGVNYXApO1xuXHR9XG5cdFxuXHRzdGF0aWMgUkVHRVhQX0VTQ0FQRVIoKXtcblx0XHRyZXR1cm4gbmV3IEVzY2FwZXIoW1xuXHRcdFx0e2NoYXI6IFwiXFxcXFwiLCBlc2NhcGVkIDogXCJcXFxcXFxcXFwifSxcblx0XHRcdHtjaGFyOiBcIj9cIiwgZXNjYXBlZCA6IFwiXFxcXD9cIn0sXG5cdFx0XHR7Y2hhcjogXCJbXCIsIGVzY2FwZWQgOiBcIlxcXFxbXCJ9LFxuXHRcdFx0e2NoYXI6IFwiXVwiLCBlc2NhcGVkIDogXCJcXFxcXVwifSxcblx0XHRcdHtjaGFyOiBcIntcIiwgZXNjYXBlZCA6IFwiXFxcXHtcIn0sXG5cdFx0XHR7Y2hhcjogXCJ9XCIsIGVzY2FwZWQgOiBcIlxcXFx9XCJ9LFxuXHRcdFx0e2NoYXI6IFwiKFwiLCBlc2NhcGVkIDogXCJcXFxcKFwifSxcblx0XHRcdHtjaGFyOiBcIilcIiwgZXNjYXBlZCA6IFwiXFxcXClcIn0sXG5cdFx0XHR7Y2hhcjogXCIuXCIsIGVzY2FwZWQgOiBcIlxcXFwuXCJ9LFxuXHRcdFx0e2NoYXI6IFwiXlwiLCBlc2NhcGVkIDogXCJcXFxcXlwifSxcblx0XHRcdHtjaGFyOiBcIiRcIiwgZXNjYXBlZCA6IFwiXFxcXCRcIn1cblx0XHRdKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBFc2NhcGVyO1xuXG4iLCJjb25zdCBHTE9CQUwgPSAoKCkgPT4ge1xyXG5cdGlmKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBnbG9iYWw7XHJcblx0aWYodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHdpbmRvdztcdFxyXG5cdGlmKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gc2VsZjtcclxuXHRyZXR1cm4ge307XHJcbn0pKCk7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBHTE9CQUw7IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgT2JqZWN0UHJvcGVydHkge1xyXG5cdGNvbnN0cnVjdG9yKGtleSwgY29udGV4dCl7XHJcblx0XHR0aGlzLmtleSA9IGtleTtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0fVxyXG5cdFxyXG5cdGdldCBrZXlEZWZpbmVkKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5rZXkgaW4gdGhpcy5jb250ZXh0OyBcclxuXHR9XHJcblx0XHJcblx0Z2V0IGhhc1ZhbHVlKCl7XHJcblx0XHRyZXR1cm4gISF0aGlzLmNvbnRleHRbdGhpcy5rZXldO1xyXG5cdH1cclxuXHRcclxuXHRnZXQgdmFsdWUoKXtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRleHRbdGhpcy5rZXldO1xyXG5cdH1cclxuXHRcclxuXHRzZXQgdmFsdWUoZGF0YSl7XHJcblx0XHR0aGlzLmNvbnRleHRbdGhpcy5rZXldID0gZGF0YTtcclxuXHR9XHJcblx0XHJcblx0c2V0IGFwcGVuZChkYXRhKSB7XHJcblx0XHRpZighdGhpcy5oYXNWYWx1ZSlcclxuXHRcdFx0dGhpcy52YWx1ZSA9IGRhdGE7XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLnZhbHVlO1xyXG5cdFx0XHRpZih2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KVxyXG5cdFx0XHRcdHZhbHVlLnB1c2goZGF0YSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR0aGlzLnZhbHVlID0gW3RoaXMudmFsdWUsIGRhdGFdO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHRyZW1vdmUoKXtcclxuXHRcdGRlbGV0ZSB0aGlzLmNvbnRleHRbdGhpcy5rZXldO1xyXG5cdH1cclxuXHRcclxuXHRzdGF0aWMgbG9hZChkYXRhLCBrZXksIGNyZWF0ZT10cnVlKSB7XHJcblx0XHRsZXQgY29udGV4dCA9IGRhdGE7XHJcblx0XHRjb25zdCBrZXlzID0ga2V5LnNwbGl0KFwiXFwuXCIpO1xyXG5cdFx0bGV0IG5hbWUgPSBrZXlzLnNoaWZ0KCkudHJpbSgpO1xyXG5cdFx0d2hpbGUoa2V5cy5sZW5ndGggPiAwKXtcclxuXHRcdFx0aWYoIWNvbnRleHRbbmFtZV0pe1xyXG5cdFx0XHRcdGlmKCFjcmVhdGUpXHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb250ZXh0W25hbWVdID0ge31cclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Y29udGV4dCA9IGNvbnRleHRbbmFtZV07XHJcblx0XHRcdG5hbWUgPSBrZXlzLnNoaWZ0KCkudHJpbSgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gbmV3IE9iamVjdFByb3BlcnR5KG5hbWUsIGNvbnRleHQpO1xyXG5cdH1cclxufTsiLCJpbXBvcnQgT2JqZWN0UHJvcGVydHkgZnJvbSBcIi4vT2JqZWN0UHJvcGVydHkuanNcIjtcclxuLyoqXHJcbiAqIGFwcGVuZCBhIHByb3BlcnkgdmFsdWUgdG8gYW4gb2JqZWN0LiBJZiBwcm9wZXJ5IGV4aXN0cyBpdHMgd291bGQgYmUgY29udmVydGVkIHRvIGFuIGFycmF5XHJcbiAqXHJcbiAqICBAcGFyYW0gYUtleTpzdHJpbmcgbmFtZSBvZiBwcm9wZXJ0eVxyXG4gKiAgQHBhcmFtIGFEYXRhOmFueSBwcm9wZXJ0eSB2YWx1ZVxyXG4gKiAgQHBhcmFtIGFPYmplY3Q6b2JqZWN0IHRoZSBvYmplY3QgdG8gYXBwZW5kIHRoZSBwcm9wZXJ0eVxyXG4gKlxyXG4gKiAgQHJldHVybiByZXR1cm5zIHRoZSBjaGFuZ2VkIG9iamVjdFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGFwcGVuZCA9IGZ1bmN0aW9uIChhS2V5LCBhRGF0YSwgYU9iamVjdCkge1xyXG5cdGlmICh0eXBlb2YgYURhdGEgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuXHRcdGNvbnN0IHByb3BlcnR5ID0gT2JqZWN0UHJvcGVydHkubG9hZChhT2JqZWN0LCBhS2V5LCB0cnVlKTtcclxuXHRcdHByb3BlcnR5LmFwcGVuZCA9IGFEYXRhO1xyXG5cdH1cclxuXHRyZXR1cm4gYU9iamVjdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBjaGVja2VkIGlmIGFuIG9iamVjdCBhIHNpbXBsZSBvYmplY3QuIE5vIEFycmF5LCBNYXAgb3Igc29tZXRoaW5nIGVsc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSBhT2JqZWN0Om9iamVjdCB0aGUgb2JqZWN0IHRvIGJlIHRlc3RpbmdcclxuICpcclxuICogQHJldHVybiBib29sZWFuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaXNQb2pvID0gZnVuY3Rpb24gKGFPYmplY3QpIHtcclxuXHRyZXR1cm4gdHlwZW9mIGFPYmplY3QgIT09IFwidW5kZWZpbmVkXCIgJiYgYU9iamVjdCAhPSBudWxsICYmIGFPYmplY3QuY29uc3RydWN0b3IubmFtZSA9PT0gXCJPYmplY3RcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBtZXJnaW5nIG9iamVjdCBpbnRvIGEgdGFyZ2V0IG9iamVjdC4gSXRzIG9ubHkgbWVyZ2Ugc2ltcGxlIG9iamVjdCBhbmQgc3ViIG9iamVjdHMuIEV2ZXJ5IG90aGVyXHJcbiAqIHZhbHVlIHdvdWxkIGJlIHJlcGxhY2VkIGJ5IHZhbHVlIGZyb20gdGhlIHNvdXJjZSBvYmplY3QuXHJcbiAqXHJcbiAqIHNhbXBsZTogbWVyZ2UodGFyZ2V0LCBzb3VyY2UtMSwgc291cmNlLTIsIC4uLnNvdXJjZS1uKVxyXG4gKlxyXG4gKiBAcGFyYW0gYVRhcmdldDpvYmplY3QgdGhlIHRhcmdldCBvYmplY3QgdG8gbWVyZ2luZyBpbnRvXHJcbiAqIEBwYXJhbSBhU291cmNlczpvYmplY3RcclxuICpcclxuICogQHJldHVybiBvYmplY3QgcmV0dXJucyB0aGUgdGFyZ2V0IG9iamVjdFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG1lcmdlID0gZnVuY3Rpb24gKGFUYXJnZXQpIHtcclxuXHRmb3IgKGxldCBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0Y29uc3Qgc291cmNlID0gYXJndW1lbnRzW2ldO1xyXG5cdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc291cmNlKS5mb3JFYWNoKChhS2V5KSA9PiB7XHJcblx0XHRcdGlmIChpc1Bvam8oYVRhcmdldFthS2V5XSkpIG1lcmdlKGFUYXJnZXRbYUtleV0sIHNvdXJjZVthS2V5XSk7XHJcblx0XHRcdGVsc2UgYVRhcmdldFthS2V5XSA9IHNvdXJjZVthS2V5XTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGFUYXJnZXQ7XHJcbn07XHJcblxyXG5jb25zdCBidWlsZFByb3BlcnR5RmlsdGVyID0gZnVuY3Rpb24gKHsgbmFtZXMsIGFsbG93ZWQgfSkge1xyXG5cdHJldHVybiAobmFtZSwgdmFsdWUsIGNvbnRleHQpID0+IHtcclxuXHRcdHJldHVybiBuYW1lcy5pbmNsdWRlcyhuYW1lKSA9PT0gYWxsb3dlZDtcclxuXHR9O1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGZpbHRlciA9IGZ1bmN0aW9uICgpIHtcclxuXHRjb25zdCBbZGF0YSwgcHJvcEZpbHRlciwgeyBkZWVwID0gZmFsc2UsIHJlY3Vyc2l2ZSA9IHRydWUsIHBhcmVudHMgPSBbXSB9ID0ge31dID0gYXJndW1lbnRzO1xyXG5cdGNvbnN0IHJlc3VsdCA9IHt9O1xyXG5cclxuXHRmb3IgKGxldCBuYW1lIGluIGRhdGEpIHtcclxuXHRcdGNvbnN0IHZhbHVlID0gZGF0YVtuYW1lXTtcclxuXHRcdGNvbnN0IGFjY2VwdCA9IHByb3BGaWx0ZXIobmFtZSwgdmFsdWUsIGRhdGEpO1xyXG5cdFx0aWYgKGFjY2VwdCAmJiAoIWRlZXAgfHwgdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkpIHJlc3VsdFtuYW1lXSA9IHZhbHVlO1xyXG5cdFx0ZWxzZSBpZiAoYWNjZXB0ICYmIGRlZXApIHtcclxuXHRcdFx0Y29uc3QgdHlwZSA9IHR5cGVvZiB2YWx1ZTtcclxuXHRcdFx0aWYgKHR5cGUgIT09IFwib2JqZWN0XCIgfHwgdmFsdWUgaW5zdGFuY2VvZiBBcnJheSB8fCB2YWx1ZSBpbnN0YW5jZW9mIE1hcCB8fCB2YWx1ZSBpbnN0YW5jZW9mIFNldCB8fCB2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCB8fCBwYXJlbnRzLmluY2x1ZGVzW3ZhbHVlXSB8fCB2YWx1ZSA9PSBkYXRhKSByZXN1bHRbbmFtZV0gPSB2YWx1ZTtcclxuXHRcdFx0ZWxzZSByZXN1bHRbbmFtZV0gPSBmaWx0ZXIodmFsdWUsIHByb3BGaWx0ZXIsIHsgZGVlcCwgcmVjdXJzaXZlLCBwYXJlbnRzOiBwYXJlbnRzLmNvbmNhdChkYXRhKSB9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZGVmVmFsdWUgPSAobywgbmFtZSwgdmFsdWUpID0+IHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobywgbmFtZSwge1xyXG5cdFx0dmFsdWUsXHJcblx0XHR3cml0YWJsZTogZmFsc2UsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2VcclxuXHR9KTtcclxufTtcclxuZXhwb3J0IGNvbnN0IGRlZkdldCA9IChvLCBuYW1lLCBnZXQpID0+IHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobywgbmFtZSwge1xyXG5cdFx0Z2V0LFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlXHJcblx0fSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZGVmR2V0U2V0ID0gKG8sIG5hbWUsIGdldCwgc2V0KSA9PiB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIG5hbWUsIHtcclxuXHRcdGdldCxcclxuXHRcdHNldCxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZVxyXG5cdH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdGlzUG9qbyxcclxuXHRhcHBlbmQsXHJcblx0bWVyZ2UsXHJcblx0ZmlsdGVyLFxyXG5cdGJ1aWxkUHJvcGVydHlGaWx0ZXIsXHJcblx0ZGVmVmFsdWUsXHJcblx0ZGVmR2V0LFxyXG5cdGRlZkdldFNldFxyXG59O1xyXG4iLCJjb25zdCBQUklWQVRFX1BST1BFUlRJRVMgPSBuZXcgV2Vha01hcCgpO1xyXG5jb25zdCBwcml2YXRlU3RvcmUgPSAob2JqKSA9PiB7XHJcblx0aWYoUFJJVkFURV9QUk9QRVJUSUVTLmhhcyhvYmopKVxyXG5cdFx0cmV0dXJuIFBSSVZBVEVfUFJPUEVSVElFUy5nZXQob2JqKTtcclxuXHRcclxuXHRjb25zdCBkYXRhID0ge307XHJcblx0UFJJVkFURV9QUk9QRVJUSUVTLnNldChvYmosIGRhdGEpO1xyXG5cdHJldHVybiBkYXRhO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHByaXZhdGVQcm9wZXJ0eSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgdmFsdWUpIHtcclxuXHRjb25zdCBkYXRhID0gcHJpdmF0ZVN0b3JlKG9iaik7XHJcblx0aWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcclxuXHRcdHJldHVybiBkYXRhO1xyXG5cdGVsc2UgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMilcclxuXHRcdHJldHVybiBkYXRhW25hbWVdO1xyXG5cdGVsc2UgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMylcclxuXHRcdGRhdGFbbmFtZV0gPSB2YWx1ZTtcclxuXHRlbHNlXHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYWxsb3dlZCBzaXplIG9mIGFyZ3VtZW50cyFcIik7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7cHJpdmF0ZVByb3BlcnR5fSIsImltcG9ydCB7ZGVmVmFsdWUsIGRlZkdldH0gZnJvbSBcIi4vT2JqZWN0VXRpbHNcIlxyXG5cclxuZXhwb3J0IGNvbnN0IHRpbWVvdXRQcm9taXNlID0gKGZuLCBtcykgPT57XHJcblx0bGV0IGNhbmNlbGVkID0gZmFsc2U7XHJcblx0bGV0IHRpbWVvdXQgPSBudWxsO1xyXG5cdGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgociwgZSkgPT4ge1xyXG5cdFx0dGltZW91dCA9IHNldFRpbWVvdXQoKCk9PiB7XHJcblx0XHRcdHRpbWVvdXQgPSBudWxsO1xyXG5cdFx0XHRmbihyLGUpO1xyXG5cdFx0fSwgbXMpXHJcblx0fSk7XHJcblxyXG5cdGNvbnN0IHRoZW4gPSBwcm9taXNlLnRoZW47XHJcblx0cHJvbWlzZS50aGVuID0gKGZuKSA9PiB7XHJcblx0XHR0aGVuLmNhbGwocHJvbWlzZSwgKHJlc3VsdCkgPT4ge1xyXG5cdFx0XHRpZighdGhpcy5jYW5jZWxlZClcclxuXHRcdFx0XHRyZXR1cm4gZm4ocmVzdWx0KTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZGVmVmFsdWUocHJvbWlzZSwgXCJjYW5jZWxcIiwgKCkgPT4ge1xyXG5cdFx0aWYodGltZW91dCl7XHJcblx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcclxuXHRcdFx0Y2FuY2VsZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cdGRlZkdldChwcm9taXNlLCBjYW5jZWxkLCAoKSA9PiBjYW5jZWxlZCk7XHJcblxyXG5cdHJldHVybiBwcm9taXNlO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGNvbnN0IGxhenlQcm9taXNlID0gKCkgPT4ge1xyXG5cdFx0bGV0IHByb21pc2VSZXNvbHZlID0gbnVsbDtcclxuXHRcdGxldCBwcm9taXNlRXJyb3IgPSBudWxsO1xyXG5cclxuXHRcdGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgociwgZSkgPT4ge1xyXG5cdFx0XHRwcm9taXNlUmVzb2x2ZSA9IHI7XHJcblx0XHRcdHByb21pc2VFcnJvciA9IGU7XHJcblx0XHR9KTtcclxuXHJcblx0XHRsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcclxuXHRcdGxldCBlcnJvciA9IGZhbHNlO1xyXG5cdFx0bGV0IHZhbHVlID0gdW5kZWZpbmVkO1xyXG5cclxuXHRcdGRlZlZhbHVlKHByb21pc2UsIFwicmVzb2x2ZVwiLCAocmVzdWx0KSA9PiB7XHJcblx0XHRcdHZhbHVlID0gcmVzdWx0O1xyXG5cdFx0XHRyZXNvbHZlZCA9IHRydWU7XHJcblx0XHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcblx0XHRcdFx0ZXJyb3IgPSB0cnVlO1xyXG5cdFx0XHRcdHByb21pc2VFcnJvcih2YWx1ZSk7XHJcblx0XHRcdH0gZWxzZSBwcm9taXNlUmVzb2x2ZSh2YWx1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRkZWZHZXQocHJvbWlzZSwgXCJ2YWx1ZVwiLCAoKSA9PiB2YWx1ZSk7XHJcblx0XHRkZWZHZXQocHJvbWlzZSwgXCJlcnJvclwiLCAoKSA9PiBlcnJvcik7XHJcblx0XHRkZWZHZXQocHJvbWlzZSwgXCJyZXNvbHZlZFwiLCAoKSA9PiByZXNvbHZlZCk7XHJcblxyXG5cdFx0cmV0dXJuIHByb21pc2U7XHJcbn07XHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHRsYXp5UHJvbWlzZSxcclxuXHR0aW1lb3V0UHJvbWlzZVxyXG59XHJcbiIsImV4cG9ydCBjb25zdCBub1ZhbHVlID0gKHZhbHVlKSA9PiB7XG5cdHJldHVybiB2YWx1ZSA9PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJ1bmRlZmluZWRcIjtcbn07XG5cbmV4cG9ydCBjb25zdCBlbXRweU9yTm9WYWx1ZVN0cmluZyA9ICh2YWx1ZSkgPT4ge1x0XG5cdHJldHVybiBub1ZhbHVlKHZhbHVlKSB8fCB2YWx1ZS50cmltKCkubGVuZ3RoID09IDA7XG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IHtcblx0bm9WYWx1ZSxcblx0ZW10cHlPck5vVmFsdWVTdHJpbmdcbn07IiwiaW1wb3J0IFwiLi9qYXZhc2NyaXB0XCI7XHJcbmltcG9ydCBPYmplY3RVdGlscyBmcm9tIFwiLi9PYmplY3RVdGlsc1wiO1xyXG5pbXBvcnQgR0xPQkFMIGZyb20gXCIuL0dsb2JhbFwiO1xyXG5pbXBvcnQgRXNjYXBlciBmcm9tIFwiLi9Fc2NhcGVyXCI7XHJcbmltcG9ydCBWYWx1ZUhlbHBlciBmcm9tIFwiLi9WYWx1ZUhlbHBlclwiO1xyXG5pbXBvcnQgUHJvbWlzZVV0aWxzIGZyb20gXCIuL1Byb21pc2VVdGlsc1wiO1xyXG5pbXBvcnQgUHJpdmF0ZVByb3BlcnR5IGZyb20gXCIuL1ByaXZhdGVQcm9wZXJ0eVwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdEdMT0JBTCAsXHJcblx0T2JqZWN0VXRpbHMsXHJcblx0RXNjYXBlcixcclxuXHRWYWx1ZUhlbHBlcixcclxuXHRQcm9taXNlVXRpbHMsXHJcblx0UHJpdmF0ZVByb3BlcnR5XHJcbn07IiwiaWYgKCFTdHJpbmcucHJvdG90eXBlLmhhc2hjb2RlKVxyXG5cdFN0cmluZy5wcm90b3R5cGUuaGFzaGNvZGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdGlmICh0aGlzLmxlbmd0aCA9PT0gMClcclxuXHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcclxuXHRcdGxldCBoYXNoID0gMDtcclxuXHRcdGNvbnN0IGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBjID0gdGhpcy5jaGFyQ29kZUF0KGkpO1xyXG5cdFx0XHRoYXNoID0gKChoYXNoIDw8IDUpIC0gaGFzaCkgKyBjO1xyXG5cdFx0XHRoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGhhc2g7XHJcblx0fTsiLCJpbXBvcnQgXCIuL1N0cmluZy5qc1wiOyJdLCJzb3VyY2VSb290IjoiIn0=