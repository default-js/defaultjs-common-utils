export const noValue = (value) => {
	return value == null || typeof value === "undefined";
};

export const emptyOrBlank = (value) => {	
	return noValue(value) || value.trim().length == 0;
};


export default {
	noValue,
	emptyOrBlank
};