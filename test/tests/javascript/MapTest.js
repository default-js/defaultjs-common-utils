import "../../../src/javascript/Map.js";

describe("Map extension tests:", function() {	
	it("toObject()", () => {				

        const map = new Map([
            ["object", new Map([
                ["string", "string"],
                ["number", 0],
                ["array", [1,2,3]]
            ])]
        ]);

        const object = map.toObject();
        expect(object.object).toBeDefined();
        expect(object.object.string).toBe("string");
        expect(object.object.number).toBe(0);
        expect(object.object.array).toEqual([1,2,3]);		
	});	
});