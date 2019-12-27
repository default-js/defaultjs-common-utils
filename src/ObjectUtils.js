
/**
 * append a propery value to an object. If propery exists its would be converted to an array
 * 
 *  @param aKey:string name of property
 *  @param aData:any property value
 *  @param aObject:object the object to append the property
 *  
 *  @return returns the changed object
 */
const append = function(aKey, aData, aObject){
	if(typeof aData !== "undefined"){		
		let key = aKey.toLowerCase().trim();	
		if(typeof aObject[key] === "undefined")
			aObject[key] = aData;
		else{		
			let data = aObject[key];
			if(data instanceof Array)
				data.push(aData);
			else
				aObject[key] = [aObject[key], aData];
		}
	}	
	return aObject;
};

/**
 * checked if an object a simple object. No Array, Map or something else.
 * 
 * @param aObject:object the object to be testing
 * 
 * @return boolean
 */
const isPojo = function(aObject){
	return typeof aObject !== "undefined" && aObject != null && aObject.constructor.name === "Object"
}

/**
 * merging object into a target object. 
 * sample: merge(target, source-1, source-2, ...source-n)
 * 
 * @param aTarget:object the target object to merging into
 * @param aSources:object
 * 
 * @return object returns the target object
 */
const merge = function(aTarget){	
	for(let i = 1; i < arguments.length; i++){
		const source = arguments[i];
		Object.getOwnPropertyNames(source).forEach(function(aKey){
			if(isObject(aTarget[aKey]))
				updateObject(aTarget[aKey], source[aKey]);
			else
				aTarget[aKey] = source[aKey];
		});
	}
	
	return aTarget;
}

export default {
	isPojo : isPojo,
	append: append,
	merge : merge
};