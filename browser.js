import { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID } from "./src/index.js";
import { VERSION } from "./src/version.js";

GLOBAL.defaultjs = GLOBAL.defaultjs || {};
GLOBAL.defaultjs.common = GLOBAL.defaultjs.common || {};
GLOBAL.defaultjs.common.utils = GLOBAL.defaultjs.common.utils || {
	VERSION,
	GLOBAL,
	ObjectUtils,
	Escaper,
	ValueHelper,
	PromiseUtils,
	PrivateProperty,
	UUID,
};

export { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID };
