/* Data to DOM element syncing */

function syncCommonRectAttrsToDataArray(selection, dataArray) {
	return syncSelAttrsToDataArray(selection, dataArray,
		["_id", "x", "y", "width", "height"]);
};

function appendResizeHandlesToGroups(groupsSelection, handleSideSize) {
	var appendedSelection = groupsSelection.append("use")
	.attr("id", "resizeGrip")
	.attr("xlink:href", "#resizeGrip")
	.attr("fill", "gray")
	.attr("width", handleSideSize)
	.attr("height", handleSideSize)
	.classed("resize-handle", true);
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

// groupSel should be a selection of <g> elements bound to data that has an _id.
function appendDeletionElementsToSelection(groupSel, deletionHandler) {
	// Putting this rect behind the delete button and also binding it to touchend
	// gives mobile users a bigger hitbox.
	groupSel.append("rect")
	.attr({ width: 44, height: 44, fill: "pink", 'fill-opacity': 0.0 })
	.classed("deleteButtonContainer", true)
	.on("touchend", deletionHandler);
	
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.	
	groupSel.append("use")
		.attr("_id", function (d) { return d._id; })
		.attr("xlink:href", "#deleteButtonPath")
		.classed("deleteButton", true)
		.on("click", deletionHandler)
		.on("touchend", deletionHandler);
		
	// Need to use the touchend event in these cases because the click event will 
	// trigger a handler on Mobile Safari if there's no zoom behavior attached, 
	// but if there is, it will obscure it.
	
	return groupSel;
}


// Updates the delete button-related elements under a selection of <g> elements.
// dataArray should be an array of records that correspond to each <g>.
function updateDeletionElementsInSelection(groupSel, dataArray) {
	setSelAttrsWithDataArray(groupSel.selectAll("rect.deleteButtonContainer"), 
	dataArray, {
		x: function (d) { return d.x + d.width - 32; },
		y: function (d) { return d.y - 12; }
	});

	setSelAttrsWithDataArray(groupSel.selectAll("use.deleteButton"), 
	dataArray, {
		x: function (d) { return d.x + d.width - 16; },
		y: function (d) { return d.y + 4; }
	});
}

// Creates/destroys <g> hierarchies to match the data, then inits and updates 
// them.
function matchElementsToBoxes(svgNode, boxes) {	
	// Set up the <g> elements for the boxes.
  var boxGroupsSel = 
		d3.select(svgNode).select(".boxZone").selectAll("g .box")
    	.data(boxes, datumIdGetter);

  // Sync the <g> elements to the box records. Add the drag behavior.
	var appendedGroupSel = boxGroupsSel.enter().append("g").classed("box", true);	
	initBoxGroupSelect(appendedGroupSel);
	boxGroupsSel.exit().remove();
		
	updateBoxGroupSelection(boxGroupsSel, boxes);
	makeSureItemsAreInFrontOfBoxes(svgNode);
}

// Sets up a <g> hierarchy right after it is created.
function initBoxGroupSelect(boxGroupSel) {
	boxGroupSel.call(addGroupDragBehavior)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) {
		var appendedSelection = groupSelection.append("rect")
		.attr("_id", function(box) { return box._id; })
		.attr("fill", "#210").attr("fill-opacity", 0.05)
		.attr("stroke", "black").attr("stroke-width", 2).attr("stroke-opacity", 0.4)
		.attr("rx", 5)
		.classed("bounds-background", true);
	})
	// Append the sum text.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("text")
		.attr("width", 84)
		.attr("height", 24)
		// .attr("fill", "gray")
		.classed("sum", true);
	})
	// Append the title text.
	.call(function (groupSelection) {		
		var appendedSel= groupSelection.append("text")
		.attr("width", 200)
		.attr("height", 48)
		.classed("box-title", true);
		
		appendedSel.call(makeEditable, "title", 20, 0, -18, "titleInput", {
			onSetField: function (box) {
				// When the field is set, update the collection containing the data.
				syncDatumToCollection(box, ['title'], Boxes, identityPassthrough);
			},
			onEditStart: BoardZoomer.lockZoomToDefaultCenterPanAtDataCoords, 
			onEditEnd: BoardZoomer.unlockZoom
		});		
	})
	// Append the resize handle.
	.call(function (groupSelection) {
		appendResizeHandlesToGroups(groupSelection, 44);
	});

	appendDeletionElementsToSelection(boxGroupSel, function(d, i) {
		// Delete this box.
		Boxes.remove(d._id);
	});
}

// Here, update the attributes that may change after an element is appended.
// e.g. Other instance of client moves a box somewhere and x and y are updated
// on an existing box element group although no new box element group needs to
// be created.
function updateBoxGroupSelection(boxGroupsSel, boxes) {
	
	// Update the sums.
	boxGroupsSel.select("text").text(function (data) { return sumForBox(data); });
	
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
		x: function (box) { return box.x + 4; },
		y: function (box) { return box.y + 20; }
	});

	titleTextsSelection.text(function (box) { return box.title; });

	updateResizeHandlesInGroups(boxGroupsSel, 20, boxes);
	updateDeletionElementsInSelection(boxGroupsSel, boxes);
}

// Creates/destroys <g> hierarchies to match the data, then inits and updates 
// them.
function matchElementsToItems(svgNode, items) {
	var boxZoneSelection = d3.select(svgNode).select(".boxZone");	
  var itemGroupSel = 
		boxZoneSelection.selectAll("g .item").data(items, datumIdGetter);
	
	var appendedGroupSel = itemGroupSel.enter().append("g").classed("item", true);
	initItemGroupSelection(appendedGroupSel);	
	itemGroupSel.exit().remove();
	
	updateItemGroupSelection(itemGroupSel, items);
	makeSureItemsAreInFrontOfBoxes(svgNode);	
}

// Sets up a <g> hierarchy right after it is created.
function initItemGroupSelection(itemGroupSel) {
	// Add the dragging handler.
	itemGroupSel.call(addGroupDragBehavior)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) {
		var appendedSelection = groupSelection.append("rect")
		.attr('rx', function() { return 4; })
		.attr('ry', function() { return 4; })
		.classed("bounds-background", true);
	})
	// Append the title.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("itemtitle", true)
		.call(makeEditable, "title", 20, -4, -25, "titleInput", {
			onSetField: function (d) {
				// When the field is set, update the collection containing the data.
				syncDatumToCollection(d, ['title'], Items, identityPassthrough);
			},
			onEditStart: BoardZoomer.lockZoomToDefaultCenterPanAtDataCoords, 
			onEditEnd: BoardZoomer.unlockZoom
		}); 
	})
	// Append the score label.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("score", true)
		.call(makeEditable, "score", 4, -18, -22, "scoreInput", {
			onSetField: function (d) {
				// When the field is set, update the collection containing the data.
				syncDatumToCollection(d, ['score'], Items, 
					function(val) { return parseInt(val); });
			},
			onEditStart: BoardZoomer.lockZoomToDefaultCenterPanAtDataCoords, 
			onEditEnd: BoardZoomer.unlockZoom		
		});
	})
	.call(function (groupSelection) {
		appendResizeHandlesToGroups(groupSelection, 44);		
	});
	
	appendDeletionElementsToSelection(itemGroupSel, function(d, i) {
		Items.remove(d._id);
	});
}

// Updates <g> hierarchies to match the data in items. These changes apply to 
// already created hierarchies, unlike the changes in initItemGroupSelection.
function updateItemGroupSelection(itemGroupSel, items) {		
	
	function textElementYPos(item) { return item.y + item.height/2 + 4; }	
	
	var bgRectSelection = itemGroupSel.selectAll("rect.bounds-background");
  syncCommonRectAttrsToDataArray(bgRectSelection, items);
	setD3SelAttrsPreservingClass(bgRectSelection, {
		fill: function(d) { return "green"; }, 
		'fill-opacity': function(d) { return 0.7; }
	});
	
	// Set up the title label.
	// d3 selectors are slightly different from jQuery's: No spaces for 
	// multiple specifiers that are to be ANDed.
	var titlesSelection = itemGroupSel.selectAll("text.itemtitle");
	titlesSelection.data(items, datumIdGetter);
	
	setSelAttrsWithDataArray(itemGroupSel.selectAll("text.itemtitle"), items, {
		x: function (item) { return item.x + 10; },
		y: function (item) { return textElementYPos(item); },
		width: function (item) { return item.width; },
		height: function (item) { return item.height; },
		fill: function(item) { return 'white'; }
	})
	.text(function (d) { return d.title; });
	
	// Set up the score field.
	setSelAttrsWithDataArray(itemGroupSel.selectAll("text.score"), items, {
		x: function (item) { return item.width - 64 + item.x; },
		y: function (item) { return textElementYPos(item); },
		width: function (item) { return 100; },
		height: function (item) { return item.height - 4; },
		fill: function(item) { return 'white'; }
	})
	.text(function (d) { return d.score; });
	
	updateResizeHandlesInGroups(itemGroupSel, 20, items);
	updateDeletionElementsInSelection(itemGroupSel, items);
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

/* Board populator */

Template.board.rendered = function () {
  var svgElement = this.find("svg#boardSVG");

	BoardZoomer.setUpZoomOnBoard();	

	function redrawBoxes() {
		var boxesContext = new Meteor.deps.Context();
		boxesContext.on_invalidate(redrawBoxes);
		boxesContext.run(function() {
			var boxes = Boxes.find().fetch();
			matchElementsToBoxes(svgElement, boxes);
		});
	};

	function redrawItems() {
		var itemsContext = new Meteor.deps.Context();
		itemsContext.on_invalidate(redrawItems);
		itemsContext.run(function() {
			var items = Items.find().fetch();
			matchElementsToItems(svgElement, items);
			
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
		
};
