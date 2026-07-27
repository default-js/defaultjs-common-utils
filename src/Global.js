const GLOBAL = (() => {
	if(typeof globalThis !== "undefined") return globalThis;
	if(typeof global !== "undefined") return global;
	if(typeof window !== "undefined") return window;	
	if(typeof self !== "undefined") return self;
	return {};
})();

export default GLOBAL;