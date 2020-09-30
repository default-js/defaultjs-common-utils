export const noValue = (value) => {
	return value == null || typeof value === "undefined";
};

export const emtpyOrNoValueString = (value) => {	
	return noValue(value) || value.trim().length == 0;
};


export default {
	noValue,
	emtpyOrNoValueString
};