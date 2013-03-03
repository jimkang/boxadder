/* Data to DOM element syncing */

function identityPassthrough(obj) { return obj; }
function datumIdGetter(d) { return d._id; }

function setD3SelAttrsPreservingClass(selection, namesAndValuesDict) {
	selection.each(function(d, i) {
		var classes = this.classList;
		for (var name in namesAndValuesDict) {
			this.setAttribute(name, namesAndValuesDict[name](d));
		}
		this.className = classes.toString();
	});
	return selection;
}

function setSelAttrsWithDataArray(selection, dataArray, attrSetterDict) {
	selection.data(dataArray, datumIdGetter);
	
	return setD3SelAttrsPreservingClass(selection, attrSetterDict);
};

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

function syncCommonRectAttrsToDataArray(selection, dataArray) {
	return syncSelAttrsToDataArray(selection, dataArray,
		["_id", "x", "y", "width", "height"]);
};


// valueCleaner is a function that takes a value and returns it cleaned, if 
// necessary.
function syncDatumToCollection(datum, fieldArray, collection, valueCleaner) {	
	var updateDict = {};
	for (var i = 0; i < fieldArray.length; ++i) {
		updateDict[fieldArray[i]] = valueCleaner(datum[fieldArray[i]]);
	}
	
	// Meteor.flush();
		
	collection.update(datum._id, {$set: updateDict}, 
		function(error, result) {
			if (result === null) {
				console.log(error);
			}
			else {
			}
		});	
}


function appendResizeHandlesToGroups(groupsSelection, handleSideSize) {
	var appendedSelection = groupsSelection.append("use")
	.attr("xlink:href", "#resizeGrip")
	.attr("fill", "gray")
	.attr("width", handleSideSize)
	.attr("height", handleSideSize)
	.classed("resize-handle", true);
		
	// Append custom drag behavior for resizing its parent box.
	appendedSelection.call(addResizeHandleDragBehavior);
}

function updateResizeHandlesInGroups(groupsSelection, handleSideSize, dataArray) {
	setSelAttrsWithDataArray(groupsSelection.selectAll("use.resize-handle"), 
	dataArray, {
		x: function(d) { return d.x + d.width - handleSideSize; },
		y: function(d) { return d.y + d.height - handleSideSize; },
		width: function(d) { return handleSideSize; },
		height: function(d) { return handleSideSize; }		
	});
}


function syncNodesToBoxes(svgNode, boxes) {	
	// Set up the <g> elements for the boxes.
  var boxGroupsSel = 
		d3.select(svgNode).select(".boxZone").selectAll("g .box")
    	.data(boxes, datumIdGetter);

  // Sync the <g> elements to the box records. Add the drag behavior.
	boxGroupsSel.enter().append("g").classed("box", true)
	.call(addGroupDragBehavior)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) {
		var appendedSelection = groupSelection.append("rect")
		.attr("_id", function(box) { return box._id; })
		.attr("fill", function(d) { return "#210"; })
		.attr("fill-opacity", function(d) { return 0.05; })
		.attr("stroke", function (d) { return "red"; })
		.classed("bounds-background", true);
	})
	// Append the sum background.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("rect")
		.attr("stroke", "red").attr("fill", "orange")
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; })
		.classed("sum-background", true);
	})
	// Append the sum text.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("text")
		.attr("width", function (box) { return 84; })
		.attr("height", function (box) { return 24; })
		.attr("fill", function (box) { return "white"; })
		.classed("sum", true);
	})
	// Append the title background.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("rect")
		.attr("stroke", "red").attr("fill", "orange")
		.attr("width", function (box) { return 200; })
		.attr("height", function (box) { return 32; })
		.attr("fill-opacity", 0.67)
		.classed("box-title-background", true);
	})
	// Append the title text.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("text")
		.attr("width", function (box) { return 184; })
		.attr("height", function (box) { return 24; })
		.attr("fill", function (box) { return "white"; })
		.classed("box-title", true);
	})
	// Append the resize handle.
	.call(function (groupSelection) {
		appendResizeHandlesToGroups(groupSelection, 20);
	})	
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.
	.append("use")
		.attr("_id", function (box) { return box._id; })
		.attr("xlink:href", "#deleteButtonPath")
		.on("click", function (d, i) {
			// Delete this box.
			Boxes.remove(d._id);
		})
		.classed("deleteButton", true);

	boxGroupsSel.exit().remove();
	
	boxGroupsSel.select("text").text(
		function (data) { return sumForBox(data); });
	
	syncAttrsToBoxes(boxGroupsSel, boxes);
	makeSureItemsAreInFrontOfBoxes(svgNode);
}

// Here, update the attributes that may change after an element is appended.
// e.g. Other instance of client moves a box somewhere and x and y are updated
// on an existing box element group although no new box element group needs to
// be created.
function syncAttrsToBoxes(boxGroupsSel, boxes) {
	
	var bgRectsSelection = boxGroupsSel.selectAll("rect.bounds-background");
	syncCommonRectAttrsToDataArray(bgRectsSelection, boxes);

	setSelAttrsWithDataArray(boxGroupsSel.selectAll("rect.sum-background"), boxes, {
		x: function (box) { return box.x; },
		y: function (box) { return box.y + box.height - 44; }
	});

	setSelAttrsWithDataArray(boxGroupsSel.selectAll("text.sum"), boxes, {
		x: function (box) { return box.x + 8; },
		y: function (box) { return box.y + box.height - 24/2; }
	});

	setSelAttrsWithDataArray(boxGroupsSel.selectAll("rect.box-title-background"), boxes, {
		x: function (box) { return box.x; },
		y: function (box) { return box.y; }
	});
	
	var titleTextsSelection = boxGroupsSel.selectAll("text.box-title");

	setSelAttrsWithDataArray(titleTextsSelection, boxes, {
		x: function (box) { return box.x + 8; },
		y: function (box) { return box.y + 20; }
	});

	titleTextsSelection.text(function (box) { return box.title; })
	.call(makeEditable, "title", 20, 0, 
		function (box) {
			// When the field is set, update the collection containing the data.
			syncDatumToCollection(box, ['title'], Boxes, identityPassthrough);
		},
		BoardZoomer.lockZoomToDefault, BoardZoomer.unlockZoom);

	updateResizeHandlesInGroups(boxGroupsSel, 20, boxes);

	setSelAttrsWithDataArray(boxGroupsSel.selectAll("use.deleteButton"), boxes, {
		x: function (box) { return box.x + box.width - 16; },
		y: function (box) { return box.y + 4; }
	});
}

function syncNodesToItems(svgNode, items) {
	var boxZoneSelection = d3.select(svgNode).select(".boxZone");
	
	// Sync the <g>s and the data.
	
	// We need to bind the data to the children of the g as well as the parent 
	// g itself. That way we can run code that sets a child rect's attributes 
	// using that data.
	// To do that, the callback given to data() returns the object itself, and 
	// data() then binds the children of the object and so on.
	
  var itemGroupSelection = 
		boxZoneSelection.selectAll("g .item").data(items, datumIdGetter);
	
	itemGroupSelection.enter().append("g").classed("item", true)
	// Add the dragging handler.
	.call(addGroupDragBehavior)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) {
		var appendedSelection = groupSelection.append("rect")
		.attr('rx', function() { return 4; })
		.attr('ry', function() { return 4; })
		.classed("bounds-background", true);
	})
	// Append the title.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("itemtitle", true); 
	})
	// Append the score label.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("score", true); 
	})
	.call(function (groupSelection) {
		appendResizeHandlesToGroups(groupSelection, 20);		
	})
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.
	.call(function (groupSelection) { 
		groupSelection.append("use").classed("deleteButton", true); 
	});
	
	itemGroupSelection.exit().remove();
	
	syncAttrsToItems(itemGroupSelection, items);
	makeSureItemsAreInFrontOfBoxes(svgNode);	
}

function syncAttrsToItems(itemGroupSelection, items) {		
	
	function textElementYPos(item) { return item.y + item.height/2 + 4; }
	
	// TODO: Refactor sub-<g> element setup.
	var bgRectSelection = itemGroupSelection.selectAll("rect.bounds-background");
  syncCommonRectAttrsToDataArray(bgRectSelection, items);
	bgRectSelection.attr("fill", function(d) { return "green"; })
	.attr("fill-opacity", function(d) { return 0.7; });
	
	// Set up the title label.
	// d3 selectors are slightly different from jQuery's: No spaces for 
	// multiple specifiers that are to be ANDed.
	var titlesSelection = itemGroupSelection.selectAll("text.itemtitle");
	titlesSelection.data(items, datumIdGetter);
	
	titlesSelection
	.text(function (d) { return d.title; })
	.attr("x", function (item) { return item.x + 10; })
	.attr("y", function (item) { return textElementYPos(item); })
	.attr("fill", function (item) { return "white"; })
	.call(makeEditable, "title", 20, 0, 
		function (d) {
			// When the field is set, update the collection containing the data.
			console.log("Saving title:", d.title);	
			syncDatumToCollection(d, ['title'], Items, identityPassthrough);
		},
		BoardZoomer.lockZoomToDefault, BoardZoomer.unlockZoom
	);
	
	syncD3SelAttrsToDataMembersWithPropnames(titlesSelection, ["width", "height"]);
	
	// Set up the score field.
	var scoresSelection = itemGroupSelection.selectAll("text.score");
	scoresSelection.data(items, datumIdGetter);
	
	scoresSelection
		.text(function (d) { return d.score; })
		.attr("x", function (item) { return item.width - 64 + item.x; })
		.attr("y", function (item) { return textElementYPos(item); })
		.attr("width", function (item) { return 100; })
		.attr("height", function (item) { return item.height - 4; })
		.attr("fill", function (item) { return "white"; })
		.call(makeEditable, "score", 4, -18, function (d) {
			// When the field is set, update the collection containing the data.
			console.log("Saving score:", d.score);
			syncDatumToCollection(d, ['score'], Items, 
			function(val) { return parseInt(val); });
		},
		BoardZoomer.lockZoomToDefault, BoardZoomer.unlockZoom);
	
	updateResizeHandlesInGroups(itemGroupSelection, 20, items);
	
	// Set up the delete button.
	itemGroupSelection.selectAll("use.deleteButton").data(items, datumIdGetter)
		.attr("xlink:href", "#deleteButtonPath")
		.attr("x", function (item) { return item.x + item.width - 16; })
		.attr("y", function (item) { return item.y + 4; })
		.on("click", function (d, i) {
			// Delete this item.
			Items.remove(d._id);
		})
		.classed("deleteButton", true);
}

function makeSureItemsAreInFrontOfBoxes(svgNode) {
	var gSelection = d3.select(svgNode).select(".boxZone").selectAll("g");
	gSelection.sort(function(a, b) { 
		var aIsItem = ("score" in a);
		var bIsItem = ("score" in b);
		if (aIsItem && bIsItem) {
			return 0;
		}
		else if (aIsItem && !bIsItem) {
			// If a is an item and b is not, it should go after it.
			return 1;
		}
		else {
			return -1;
		}
	});	
}

var BoardZoomer = {
	locked: false,
	setUpZoomOnBoard: function() {		
		// Make x and y scaling functions that just returns whatever is passed into 
		// them (same domain and range).
		var width = 768, height = 1024;
	
		var x = d3.scale.linear()
	    .domain([0, width])
	    .range([0, width]);

		var y = d3.scale.linear()
	    .domain([0, height])
	    .range([height, 0]);
	
		// When zoom and pan gestures happen inside of #boardSVG, have it call the 
		// zoom function to make changes.
		d3.select("#boardSVG").call(
			d3.behavior.zoom().x(x).y(y).scaleExtent([0.0625, 4]).on("zoom", zoom)
		);
	
		var boxZoneSelection = d3.select("g.boxZone");

		// This function applies the zoom changes to the <g> element rather than
		// the <svg> element because <svg>s do not have a transform attribute. 
		// The behavior is connected to the <svg> rather than the <g> because then
		// dragging-to-pan doesn't work otherwise. Maybe something cannot be 
		// transformed while it is receiving drag events?
		function zoom() {
			if (!BoardZoomer.locked) {
				boxZoneSelection.attr("transform", 
					"translate(" + d3.event.translate + ")" + 
					" scale(" + d3.event.scale + ")");
			}
		}
	},
	resetZoom: function() {	
		if (!BoardZoomer.locked) {
			$('.boxZone').attr('transform', "translate(0, 0) scale(1)");
		}
	},
	lockZoomToDefault: function() {
		console.log("locked to default!");
		BoardZoomer.resetZoom();
		BoardZoomer.locked = true;
	},
	unlockZoom: function() {
		console.log("unlocked!");
		BoardZoomer.locked = false;
	}
}

/* Board populator */

Template.board.rendered = function () {
  var self = this;
  self.node = self.find("svg#boardSVG");

	function redrawBoxes() {
		var boxesContext = new Meteor.deps.Context();
		boxesContext.on_invalidate(redrawBoxes);
		boxesContext.run(function() {
			var boxes = Boxes.find().fetch();
			syncNodesToBoxes(self.node, boxes);
		});
	};

	function redrawItems() {
		var itemsContext = new Meteor.deps.Context();
		itemsContext.on_invalidate(redrawItems);
		itemsContext.run(function() {
			var items = Items.find().fetch();
			syncNodesToItems(self.node, items);
			
			// This will get rid of the loading message.
		  Session.set("loadingMessage", null);			
		});
	};

	Meteor.autorun(function() {
		// This subscription keeps the board list, which also uses the boards
		// collection, updated reactively.
	  Meteor.subscribe('boards', {boardId: Session.get("currentBoard")}, 
			function() { Session.set("loadingMessage", "Loading board..."); });
		
	  Meteor.subscribe('boxes', {boardId: Session.get("currentBoard")}, 
			function() { redrawBoxes(); });	
			
		// Set up the items. (And set them up again each time they or the current
		// board are updated.)
    Meteor.subscribe('items', {boardId: Session.get("currentBoard")}, 
			function() { redrawItems(); });
	});
	
	BoardZoomer.setUpZoomOnBoard();	
};
