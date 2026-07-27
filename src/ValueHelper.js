export const noValue = (value) => {
	return value == null || typeof value === "undefined";
};

export const emptyOrBlank = (value) => {	
	return noValue(value) || value.trim().length == 0;
};

export const emtpyOrNoValueString = (value) => {
	console.warn("emtpyOrNoValueString is deprecated! use emptyOrBlank");
	return emptyOrBlank(value);
};


export default {
	noValue,
	emptyOrBlank,
	emtpyOrNoValueString
};