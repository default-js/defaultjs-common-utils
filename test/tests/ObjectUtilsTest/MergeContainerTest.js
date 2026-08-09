import ObjectUtils from "../../../src/ObjectUtils.js";

/**
 * merge steps into simple objects only. An Array, Set or Map is a value like any other and gets
 * replaced as a whole - it is never merged entry by entry. These tests pin that down for nested
 * structures whose containers carry objects, especially when target and source differ in length.
 */
describe("ObjectUtils merge container Tests", function() {

	beforeAll(function(done){
		done();
	});


	describe("Array", function(){

		it("replaces an array, target longer than source", function(){
			const target = {data : {list : [{id : 1}, {id : 2}, {id : 3}]}};
			const source = {data : {list : [{id : 9}]}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.list.length).toBe(1);
			expect(result.data.list).toEqual([{id : 9}]);
		});

		it("replaces an array, source longer than target", function(){
			const target = {data : {list : [{id : 1}]}};
			const source = {data : {list : [{id : 9}, {id : 8}, {id : 7}]}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.list.length).toBe(3);
			expect(result.data.list).toEqual([{id : 9}, {id : 8}, {id : 7}]);
		});

		it("does not merge the objects inside an array", function(){
			const target = {data : {list : [{keep : "target", over : "target"}]}};
			const source = {data : {list : [{over : "source"}]}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.list[0]).toEqual({over : "source"});
			expect(result.data.list[0].keep).toBeUndefined();
		});

		it("takes the array of the source by reference", function(){
			const target = {data : {list : [{id : 1}]}};
			const source = {data : {list : [{id : 9}]}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.list).toBe(source.data.list);
			expect(result.data.list[0]).toBe(source.data.list[0]);
		});

		it("replaces an empty array and an array by an empty one", function(){
			expect(ObjectUtils.merge({list : [{id : 1}, {id : 2}]}, {list : []}).list.length).toBe(0);
			expect(ObjectUtils.merge({list : []}, {list : [{id : 9}]}).list.length).toBe(1);
		});

		it("replaces nested arrays of arrays", function(){
			const target = {matrix : [[{id : 1}, {id : 2}], [{id : 3}]]};
			const source = {matrix : [[{id : 9}]]};

			const result = ObjectUtils.merge(target, source);

			expect(result.matrix.length).toBe(1);
			expect(result.matrix[0].length).toBe(1);
			expect(result.matrix).toEqual([[{id : 9}]]);
		});
	});


	describe("Set", function(){

		it("replaces a set, target larger than source", function(){
			const target = {data : {set : new Set([{id : 1}, {id : 2}, {id : 3}])}};
			const source = {data : {set : new Set([{id : 9}])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.set.size).toBe(1);
			expect(Array.from(result.data.set)).toEqual([{id : 9}]);
		});

		it("replaces a set, source larger than target", function(){
			const target = {data : {set : new Set([{id : 1}])}};
			const source = {data : {set : new Set([{id : 9}, {id : 8}])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.set.size).toBe(2);
			expect(Array.from(result.data.set)).toEqual([{id : 9}, {id : 8}]);
		});

		it("takes the set of the source by reference", function(){
			const target = {data : {set : new Set([{id : 1}])}};
			const source = {data : {set : new Set([{id : 9}])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.set).toBe(source.data.set);
		});

		it("keeps no entry of the target set", function(){
			const kept = {id : 1};
			const target = {set : new Set([kept])};
			const source = {set : new Set([{id : 9}])};

			const result = ObjectUtils.merge(target, source);

			expect(result.set.has(kept)).toBe(false);
		});
	});


	describe("Map", function(){

		it("replaces a map, target larger than source", function(){
			const target = {data : {map : new Map([["a", {id : 1}], ["b", {id : 2}]])}};
			const source = {data : {map : new Map([["a", {id : 9}]])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.map.size).toBe(1);
			expect(Array.from(result.data.map.keys())).toEqual(["a"]);
			expect(result.data.map.get("a")).toEqual({id : 9});
		});

		it("replaces a map, source larger than target", function(){
			const target = {data : {map : new Map([["a", {id : 1}]])}};
			const source = {data : {map : new Map([["a", {id : 9}], ["b", {id : 8}]])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.map.size).toBe(2);
			expect(Array.from(result.data.map.keys())).toEqual(["a", "b"]);
		});

		it("drops keys the target map had on its own", function(){
			const target = {map : new Map([["onlyInTarget", {id : 1}], ["shared", {id : 2}]])};
			const source = {map : new Map([["shared", {id : 9}]])};

			const result = ObjectUtils.merge(target, source);

			expect(result.map.has("onlyInTarget")).toBe(false);
			expect(result.map.get("shared")).toEqual({id : 9});
		});

		it("does not merge the objects inside a map", function(){
			const target = {map : new Map([["a", {keep : "target", over : "target"}]])};
			const source = {map : new Map([["a", {over : "source"}]])};

			const result = ObjectUtils.merge(target, source);

			expect(result.map.get("a")).toEqual({over : "source"});
			expect(result.map.get("a").keep).toBeUndefined();
		});

		it("takes the map of the source by reference", function(){
			const target = {data : {map : new Map([["a", {id : 1}]])}};
			const source = {data : {map : new Map([["a", {id : 9}]])}};

			const result = ObjectUtils.merge(target, source);

			expect(result.data.map).toBe(source.data.map);
		});
	});


	describe("mixed structures", function(){

		it("merges simple objects while replacing their containers", function(){
			const target = {
				meta : {keep : "target", over : "target"},
				list : [{id : 1}, {id : 2}],
				set : new Set([{id : 1}, {id : 2}]),
				map : new Map([["a", {id : 1}], ["b", {id : 2}]])
			};
			const source = {
				meta : {over : "source", added : "source"},
				list : [{id : 9}],
				set : new Set([{id : 9}]),
				map : new Map([["a", {id : 9}]])
			};

			const result = ObjectUtils.merge(target, source);

			expect(result.meta).toEqual({keep : "target", over : "source", added : "source"});
			expect(result.list.length).toBe(1);
			expect(result.set.size).toBe(1);
			expect(result.map.size).toBe(1);
		});

		it("steps through simple objects down to a deeply nested container", function(){
			const target = {a : {b : {c : {list : [{id : 1}, {id : 2}], keep : "target"}}}};
			const source = {a : {b : {c : {list : [{id : 9}]}}}};

			const result = ObjectUtils.merge(target, source);

			expect(result.a.b.c.keep).toBe("target");
			expect(result.a.b.c.list.length).toBe(1);
			expect(result.a.b.c.list).toEqual([{id : 9}]);
		});

		it("replaces containers nested inside each other", function(){
			const target = {list : [{set : new Set([{id : 1}, {id : 2}])}]};
			const source = {list : [{set : new Set([{id : 9}])}]};

			const result = ObjectUtils.merge(target, source);

			expect(result.list.length).toBe(1);
			expect(result.list[0].set.size).toBe(1);
			expect(result.list[0].set).toBe(source.list[0].set);
		});

		it("replaces a container by a value of another type", function(){
			expect(ObjectUtils.merge({value : {a : 1}}, {value : [{id : 9}]}).value).toEqual([{id : 9}]);
			expect(ObjectUtils.merge({value : [{id : 1}]}, {value : {a : 9}}).value).toEqual({a : 9});
			expect(ObjectUtils.merge({value : new Map([["a", 1]])}, {value : {a : 9}}).value).toEqual({a : 9});
			expect(ObjectUtils.merge({value : new Set([1])}, {value : [{id : 9}]}).value).toEqual([{id : 9}]);
			expect(ObjectUtils.merge({value : [{id : 1}]}, {value : null}).value).toBe(null);
		});

		it("applies multiple sources in order", function(){
			const target = {data : {list : [{id : 1}, {id : 2}, {id : 3}]}};

			const result = ObjectUtils.merge(target, {data : {list : [{id : 9}, {id : 8}]}}, {data : {list : [{id : 7}]}});

			expect(result.data.list.length).toBe(1);
			expect(result.data.list).toEqual([{id : 7}]);
		});
	});


	afterAll(function() {
	});
});
