/* Data to DOM element syncing */

function identityPassthrough(obj) { return obj; }
function datumIdGetter(d) { return d._id; }

function setD3GroupAttrsWithProplist(group, propnames) {
	// We are running all these methods (attr, append, etc.) on the group
	// not just one node. Keep it in mind.
	for (var i = 0; i < propnames.length; ++i) {
		var propname = propnames[i];
		group.attr(propname, function (obj) { 
			return obj[propname];
		});
	}
	return group;
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

function syncCommonRectAttrs(group, cssClass) {
	return setD3GroupAttrsWithProplist(group, 
		["_id", "x", "y", "width", "height"])
	// Setting attr seems to clear everything that's not explicitly set, so we 
	// need to re-set the class.
	.attr("class", cssClass);
};

function syncNodesToBoxes(svgNode, boxes) {	
	// Set up the <g> elements for the boxes.
  var boxGroupsSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("g .box")
    	.data(boxes, identityPassthrough);

  // Sync the <g> elements to the box records. Add the drag behavior.
	boxGroupsSelection.enter().append("g").classed("box", true)
	.call(addGroupDragBehavior)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) {
		var appendedSelection = groupSelection.append("rect")
		.attr("fill", function(d) { return "white"; })
		.attr("fill-opacity", function(d) { return 0.0; })
		.attr("stroke", function (d) { return "red"; })
		.classed("box-background", true);
		
		syncCommonRectAttrs(appendedSelection);
	})
	// Append the sum background.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("rect")
		.attr("stroke", "red").attr("fill", "orange")
		.attr("x", function (box) { return box.x + box.width - 100; })
		.attr("y", function (box) { return box.y + box.height - 44; })
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; });
	})
	// Append the sum text.
	.call(function (groupSelection) {		
		var appendedSelection = groupSelection.append("text")
		.attr("x", function (box) { return box.x + box.width - 100/2; })
		.attr("y", function (box) { return box.y + box.height - 44/2 + 4; })
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; })
		.attr("fill", function (box) { return "white"; })
		.classed("sum", true);		
	})
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.
	.call(function (groupSelection) { groupSelection.append("use") });	
	
	boxGroupsSelection.exit().remove();
	
	boxGroupsSelection.select("text").text(
		function (data) { return sumForBox(data); });
	
	// Set up the delete button.
	boxGroupsSelection.selectAll("use")
		.attr("xlink:href", "#deleteButtonPath")
		.attr("x", function (box) { return box.x + box.width - 16; })
		.attr("y", function (box) { return box.y + 4; })
		.on("click", function (d, i) {
			// Delete this box.
			Boxes.remove(d._id);
		});
	
	makeSureItemsAreInFrontOfBoxes(svgNode);
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
		.classed("item-background", true);
	})
	// Append the title.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("itemtitle", true); 
	})
	// Append the score label.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("score", true); 
	})
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.
	.call(function (groupSelection) { groupSelection.append("use") });
	
	itemGroupSelection.exit().remove();
	
	syncAttrsToItems(itemGroupSelection, items);
	makeSureItemsAreInFrontOfBoxes(svgNode);
}

function syncAttrsToItems(itemGroupSelection, items) {		
	
	function textElementYPos(item) { return item.y + item.height/2 + 4; }
	
	// TODO: Refactor sub-<g> element setup.
	var bgRectSelection = itemGroupSelection.selectAll("rect");	
	bgRectSelection.data(items, datumIdGetter)
	.attr("fill", function(d) { return "green"; })
	.attr("fill-opacity", function(d) { return 0.7; });
  syncCommonRectAttrs(bgRectSelection, "item-background");
	
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
		}
	);
	
	setD3GroupAttrsWithProplist(titlesSelection, ["width", "height"]);
	
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
		});
		
	// Set up the delete button.
	itemGroupSelection.selectAll("use").data(items, datumIdGetter)
		.attr("xlink:href", "#deleteButtonPath")
		.attr("x", function (item) { return 224 + item.x; })
		.attr("y", function (item) { return item.y + 4; })
		.on("click", function (d, i) {
			// Delete this item.
			Items.remove(d._id);
		});		
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
  var self = this;
  self.node = self.find("svg");

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
		});
	};

	Meteor.autorun(function() {
		// This subscription keeps the board list, which also uses the boards
		// collection, updated reactively.
	  Meteor.subscribe('boards', {boardId: Session.get("currentBoard")});
		
	  Meteor.subscribe('boxes', {boardId: Session.get("currentBoard")}, function() {
			// Set up the boxes.			
			redrawBoxes();
    });	
			
		// Set up the items. (And set them up again each time they or the current
		// board are updated.)
    Meteor.subscribe('items', {boardId: Session.get("currentBoard")}, function() {
			console.log("items or session changed.");
			redrawItems();
		});
	});
};
