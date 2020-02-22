import pack from "./src"
import GLOBAL from "./src/Global";


GLOBAL.defaultjs = GLOBAL.defaultjs || {};
GLOBAL.defaultjs.common = GLOBAL.defaultjs.common || {};
GLOBAL.defaultjs.common = GLOBAL.defaultjs.common.utils || {};
GLOBAL.defaultjs.common.utils = GLOBAL.defaultjs.common.utils || (() => {
	pack.VERSION = "${version}";
	
	return pack;
})();