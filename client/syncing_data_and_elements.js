/* Helpers */

function identityPassthrough(obj) { return obj; }
function datumIdGetter(d) { return d._id; }

/* Element setting methods */

function setD3SelAttrsPreservingClass(selection, namesAndValuesDict) {
	selection.each(function(d, i) {
		var classes = this.classList;
		for (var name in namesAndValuesDict) {
			this.setAttribute(name, namesAndValuesDict[name](d));
		}
		if (classes) {
			this.className = classes.toString();
		}
	});
	return selection;
}

function setSelAttrsWithDataArray(selection, dataArray, attrSetterDict) {
	selection.data(dataArray, datumIdGetter);
	
	return setD3SelAttrsPreservingClass(selection, attrSetterDict);
};

/* Data => element methods */

// For each element in the selection, set its attributes (named by propnames) 
// to the values of the .data() members with matching names. e.g. It will set 
// element's "x" attr to data.x.
// It will preserve the CSS class.
function syncD3SelAttrsToDataMembersWithPropnames(selection, propnames) {
	var namesAndValuesDict = {};

	// There's no block scope in javascript, only function scope. So, the for 
	// loop's scope is no different from
	// syncD3SelAttrsToDataMembersWithPropnames's scope. 
	// propname, then, will change during each iteration and will ultimately be
	// whatever it is on the last iteration. If a function is defined in the for
	// loop, every time it is called, propname will always be that last iteration
	// value, whereas it needs to be a value corresponding to each iteration.
	// Therefore, propValueSettingFunction is required to capture the value of 
	// propname at each iteration on behalf of the anonymous function that uses 
	// propname.

	function propValueSettingFunction(propname) {
		return function (obj) { return obj[propname]; };
	}
	
	for (var i = 0; i < propnames.length; ++i) {
		var propname = propnames[i];
		namesAndValuesDict[propname] = propValueSettingFunction(propname);
	}	
	setD3SelAttrsPreservingClass(selection, namesAndValuesDict);
	return selection;
};

function syncSelAttrsToDataArray(selection, dataArray, attrArray) {
	selection.data(dataArray, datumIdGetter);
	
	return syncD3SelAttrsToDataMembersWithPropnames(selection, attrArray);
};

/* Data => Database methods */

// valueCleaner is a function that takes a value and returns it cleaned, if 
// necessary.
function syncDatumToCollection(datum, fieldArray, collection, valueCleaner) {	
	var updateDict = {};
	for (var i = 0; i < fieldArray.length; ++i) {
		updateDict[fieldArray[i]] = valueCleaner(datum[fieldArray[i]]);
	}
		
	collection.update(datum._id, {$set: updateDict}, 
		function(error, result) {
			if (result === null) {
				console.log(error);
			}
			else {
			}
		});	
}
