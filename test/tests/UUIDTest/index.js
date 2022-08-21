import {uuid, UUID_SCHEMA} from "../../../src/UUID";

describe("UUID - ", () => {
	
	beforeAll(async () => {	});
	
	
	it("create uuid", async () => {
		const id = uuid();
		expect(id).toBeDefined();
		expect(id.length).toBe(UUID_SCHEMA.length);
	});
	
	it("no value", async () => {
		const id1 = uuid();
		const id2 = uuid();
		expect(id1 == id2).toBeFalse();
	});	
	
	
	afterAll(async () => {});
});