(() => {
	const proto = Object.prototype;

	const equalArraySet = (a, b) => {
		if (a.length !== b.length) return false;
		const length = a.length;
		for (let i = 0; i < length; i++) if (!Object.equalPojo(a[i], b[i])) return false;

		return true;
	};

	const equalMap = (a, b) => {
		if (a.length !== b.length) return false;
		const length = a.length;
		for (const key of a.keys()) if (!Object.equalPojo(a.get(key), b.get(key))) return false;

		return true;
	};

	const equalObject = (a, b) => {
		const propertiesA = Object.keys(a);
		const propertiesB = Object.keys(b);

		if (propertiesA.length !== propertiesB.length) return false;
		for (const key of propertiesA) {
			const valueA = a[key];
			const valueB = b[key];

			if (!Object.equalPojo(valueA, valueB)) return false;
		}
		return true;
	};

	Object.isNullOrUndefined =
		Object.nullOrUndefined ||
		function (object) {
			return object == null || typeof object === "undefined";
		};

	Object.isPrimitive =
		Object.isPrimitive ||
		function (object) {
			if (object == null) return true;

			const type = typeof object;
			switch (type) {
				case "number":
				case "bigint":
				case "boolean":
				case "string":
				case "undefined":
					return true;
			}

			return false;
		};

	Object.isObject =
		Object.isObject ||
		function (object) {
			return object.constructor.name === "Object";
		};

	/**
	 * equalPojo -> compares only pojos, array, set, map and primitives
	 */
	Object.equalPojo =
		Object.equalPojo ||
		function (a, b) {
			const nullA = Object.isNullOrUndefined(a);
			const nullB = Object.isNullOrUndefined(b);
			if (nullA || nullB) return a === b;
			if (Object.isPrimitive(a) || Object.isPrimitive(b)) return a === b;
			if (!Object.isObject(a) || !Object.isObject(b)) return a === b;

			const typeA = typeof a;
			const typeB = typeof b;
			if (typeA != typeB) return false;
			if (typeA === "function") return a === b;
			if (a.constructor !== b.constructor) return false;

			if (a instanceof Array || a instanceof Set) return equalArraySet(a, b);
			if (a instanceof Map) return equalMap(a, b);

			return equalObject(a, b);
		};

	Object.isPojo =
		Object.isPojo ||
		function (object) {
			if (!object.isObject()) return false;

			for (const key in object) {
				const value = object[key];
				if (typeof value === "function" && proto[key] != value) return false;
			}

			return true;
		};

	proto.isPrimitive =
		proto.isPrimitive ||
		function () {
			return Object.isPrimitive(this);
		};

	proto.isObject =
		proto.isObject ||
		function () {
			return Object.isObject(this);
		};

	proto.isPojo =
		proto.isPojo ||
		function () {
			return Object.isPojo(this);
		};

	proto.equalPojo =
		proto.equalPojo ||
		function (object) {
			return Object.equalPojo(this, object);
		};
})();
