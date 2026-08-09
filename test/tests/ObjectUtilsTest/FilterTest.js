import ObjectUtils from "../../../src/ObjectUtils.js";

describe("ObjectUtils filter Tests", function() {
	
	beforeAll(() => {});
	
	it("filter window -> name:[], allowed = true -> results in empty object", () => {		
		const filter = ObjectUtils.buildPropertyFilter({names : [], allowed: true});
		const data = ObjectUtils.filter(window, filter);
		
		expect(Object.getOwnPropertyNames(data).length).toBe(0);		
	});
	
	it("filter window -> name: [document, location, XMLHttpRequest, fetch], allowed false", () => {				
		const filter = ObjectUtils.buildPropertyFilter({names : ["document", "location", "XMLHttpRequest", "fetch", "window"], allowed: false});
		const data = ObjectUtils.filter(window, filter, false);
		
		expect(Object.getOwnPropertyNames(data).length > 0).toBe(true);
		expect(data["document"]).toBeUndefined();
		expect(data["location"]).toBeUndefined();
		expect(data["XMLHttpRequest"]).toBeUndefined();
		expect(data["fetch"]).toBeUndefined();	
		expect(data["window"]).toBeUndefined();
	});
	
	
	
	it("filter object with a self reference, deep filter", () => {
		const test = {
			a : 1,
			b : 2,
			c : 3
		};
		test.d = test;

		const filter = ObjectUtils.buildPropertyFilter({names : ["b","c"], allowed: false});
		const data = ObjectUtils.filter(test, filter, {deep : true});

		expect(Object.getOwnPropertyNames(data).length > 0).toBe(true);
		expect(data["a"]).toBeDefined();
		expect(data["b"]).toBeUndefined();
		expect(data["c"]).toBeUndefined();
		expect(data["d"]).toBeDefined();

		// the cycle points at the filtered copy, not at the untouched original
		expect(data.d).toBe(data);
		expect(data.d).not.toBe(test);
		expect(data.d.b).toBeUndefined();
	});


	describe("deep filter", () => {

		const noSecret = ObjectUtils.buildPropertyFilter({names : ["secret"], allowed : false});

		it("does not leak the original through a cycle", () => {
			const root = {secret : "geheim", ok : 1};
			root.self = root;

			const result = ObjectUtils.filter(root, noSecret, {deep : true});

			expect(result.secret).toBeUndefined();
			expect(result.self.secret).toBeUndefined();
			expect(result.self).toBe(result);
			expect(result.self).not.toBe(root);
		});

		it("survives an indirect cycle", () => {
			const a = {name : "a", secret : "geheim"};
			const b = {name : "b"};
			a.b = b;
			b.a = a;

			const result = ObjectUtils.filter(a, noSecret, {deep : true});

			expect(result.name).toBe("a");
			expect(result.secret).toBeUndefined();
			expect(result.b.name).toBe("b");
			expect(result.b.a).toBe(result);
		});

		it("filters objects inside an array", () => {
			const result = ObjectUtils.filter({list : [{secret : "geheim", ok : 1}, {ok : 2}]}, noSecret, {deep : true});

			expect(result.list.length).toBe(2);
			expect(result.list[0]).toEqual({ok : 1});
			expect(result.list[1]).toEqual({ok : 2});
		});

		it("filters objects inside a set", () => {
			const result = ObjectUtils.filter({set : new Set([{secret : "geheim", ok : 1}])}, noSecret, {deep : true});

			expect(result.set instanceof Set).toBe(true);
			expect(result.set.size).toBe(1);
			expect(Array.from(result.set)[0]).toEqual({ok : 1});
		});

		it("filters values inside a map and keeps its keys", () => {
			const result = ObjectUtils.filter({map : new Map([["a", {secret : "geheim", ok : 1}]])}, noSecret, {deep : true});

			expect(result.map instanceof Map).toBe(true);
			expect(result.map.size).toBe(1);
			expect(Array.from(result.map.keys())).toEqual(["a"]);
			expect(result.map.get("a")).toEqual({ok : 1});
		});

		it("builds new containers instead of handing out the originals", () => {
			const source = {list : [{ok : 1}], set : new Set([{ok : 1}]), map : new Map([["a", {ok : 1}]])};

			const result = ObjectUtils.filter(source, noSecret, {deep : true});

			expect(result.list).not.toBe(source.list);
			expect(result.set).not.toBe(source.set);
			expect(result.map).not.toBe(source.map);
		});

		it("filters through nested containers", () => {
			const source = {list : [{inner : [{secret : "geheim", ok : 1}]}]};

			const result = ObjectUtils.filter(source, noSecret, {deep : true});

			expect(result.list[0].inner[0]).toEqual({ok : 1});
		});

		it("keeps Date and RegExp intact", () => {
			const date = new Date("2020-01-01");
			const expression = /abc/gi;

			const result = ObjectUtils.filter({date : date, expression : expression}, noSecret, {deep : true});

			expect(result.date).toBe(date);
			expect(result.expression).toBe(expression);
		});

		it("keeps null and undefined", () => {
			const result = ObjectUtils.filter({a : null, b : undefined, c : 0, d : ""}, noSecret, {deep : true});

			expect(result.a).toBe(null);
			expect("b" in result).toBe(true);
			expect(result.c).toBe(0);
			expect(result.d).toBe("");
		});

		it("leaves sub objects untouched without deep", () => {
			const source = {sub : {secret : "geheim", ok : 1}};

			const result = ObjectUtils.filter(source, noSecret);

			expect(result.sub).toBe(source.sub);
			expect(result.sub.secret).toBe("geheim");
		});
	});

	afterAll(() => {});
});