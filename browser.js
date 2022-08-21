import { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID } from "./src";

GLOBAL.defaultjs = GLOBAL.defaultjs || {};
GLOBAL.defaultjs.common = GLOBAL.defaultjs.common || {};
GLOBAL.defaultjs.common = GLOBAL.defaultjs.common.utils || {};
GLOBAL.defaultjs.common.utils = GLOBAL.defaultjs.common.utils || {
	VERSION: "${version}",
	GLOBAL,
	ObjectUtils,
	Escaper,
	ValueHelper,
	PromiseUtils,
	PrivateProperty,
	UUID,
};

export { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID };
