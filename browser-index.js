import pack from "./src"

const global = window || global || self || this || {};
global.defaultjs = global.defaultjs || {};
global.defaultjs.common = global.defaultjs.common || {};
global.defaultjs.common = global.defaultjs.common.utils || {};
global.defaultjs.common.utils = global.defaultjs.common.utils || (function(){
	pack.VERSION = "${version}";
	
	return pack;
})();