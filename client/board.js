/* Board rendering helpers */

function setD3GroupAttrsWithProplist(group, propnames) {
	// We are running all these methods (attr, append, etc.) on the group
	// not just one node. Keep it in mind.
	for (var i = 0; i < propnames.length; ++i) {
		var propname = propnames[i];
		group.attr(propname, function (obj) { 
			// if (propname === "x") {
			// 	console.log("Setting", this, "x to", obj[propname]);
			// }			
			return obj[propname];
		});
	}
	return group;
};

// Drag behaviors that can be added to SVG selections.

function groupdragmove(d) {
	d.x += d3.event.dx;
	d.y += d3.event.dy;
	console.log(d.x + ", " + d.y);
	
  d3.selectAll(this.childNodes)
    .attr("x", function(item) { 
			return parseInt($(this).attr("x")) + d3.event.dx; } )
    .attr("y", function(item) { 
			return parseInt($(this).attr("y")) + d3.event.dy; });
}

function saveAndRecalcOnDragStop(d) {
	// First, commit the changes to what was dragged.
	
	// TODO: Might be a neater way to do this.	
	var collection = null;
	var className = $(this).attr('class');
	if (className == 'item')
	{
		collection = Items;
	}
	else if (className == 'box')
	{
		collection = Boxes;
	}
	console.log("Saving " + d._id + " to: " + d.x + ", " + d.y);
	
	// Meteor.flush();
	
	collection.update(d._id, {$set: {x: d.x, y: d.y}}, function(error, result) {
		if (result === null) {
			console.log(error);
		}
		else {
		}
	});
	
	// Then, recalculate the sums.
	d3.selectAll(".sum").text(function (box) { return sumForBox(box); });
}

var groupdrag = d3.behavior.drag().origin(Object).on("drag", groupdragmove)
.on("dragend", saveAndRecalcOnDragStop);

function syncCommonRectAttrs(group, cssClass) {
	return setD3GroupAttrsWithProplist(group, 
		["_id", "x", "y", "width", "height"])
	// Setting attr seems to clear everything that's not explicitly set, so we 
	// need to re-set the class.
	.attr("class", cssClass);
};

/* Element set up/syncing. */

function identityPassthrough(obj) { return obj; }

function setUpBoxes(svgNode, boxes) {	
	// Set up the <g> elements for the boxes.
  var boxGroupsSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("g .box")
    	.data(boxes, identityPassthrough);

  // Sync the <g> elements to the box records. Add the drag behavior.
	boxGroupsSelection.enter().append("g").classed("box", true).call(groupdrag);

	// Set up the rect and its position and color. Append it first so that it is 
	// the furthest back, z-order-wise.
	
	// We need to sync the attributes of the child rects with the data attached 
	// to the parent g elements, so copy the data to the children.
	var bgRectSelection = boxGroupsSelection.selectAll("rect");
	
  syncCommonRectAttrs(boxGroupsSelection.append("rect")
		.attr("fill", function(d) { return "white"; })
		.attr("fill-opacity", function(d) { return 0.0; })
		.attr("stroke", function (d) { return "red"; }));
		
	// Add the sum box and label to the boxes.
	boxGroupsSelection.append("rect")
	.attr("stroke", "red").attr("fill", "orange")
	.attr("x", function (box) { return box.x + box.width - 100; })
	.attr("y", function (box) { return box.y + box.height - 44; })
	.attr("width", function (box) { return 100; })
	.attr("height", function (box) { return 44; });
	
	boxGroupsSelection.append("text").classed("sum", true).text(
		function (box) { return sumForBox(box); })
		.attr("x", function (box) { return box.x + box.width - 100/2; })
		.attr("y", function (box) { return box.y + box.height - 44/2 + 4; })
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; })
		.attr("fill", function (box) { return "white"; });
	
	boxGroupsSelection.exit().remove();
	
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
		boxZoneSelection.selectAll("g .item").data(items, identityPassthrough);
	
	itemGroupSelection.enter().append("g").classed("item", true).call(groupdrag)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupSelection) { 
		groupSelection.append("rect").classed("item-background") })
	// Append the title.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("itemtitle", true); })
	// Append the score label.
	.call(function (groupSelection) { 
		groupSelection.append("text").classed("score", true); })
	// Append the delete button, which is defined in a <def> and instantiated
	// with <use>.
	.call(function (groupSelection) { groupSelection.append("use") });
	
	itemGroupSelection.exit().remove();
	
	syncAttrsToItems(itemGroupSelection, items);
	makeSureItemsAreInFrontOfBoxes(svgNode);	
}

function syncAttrsToItems(itemGroupSelection, items) {		
	// Set up the rect and its position and color.	
	var bgRectSelection = itemGroupSelection.selectAll("rect");
	
  syncCommonRectAttrs(bgRectSelection, "item-background")
	.attr("fill", function(d) { return "green"; })
	.attr("fill-opacity", function(d) { return 0.7; });
		
	// Set up the title label.
	setD3GroupAttrsWithProplist(
		// d3 selectors are slightly different from jQuery's: No spaces for 
		// multiple specifiers that are to be ANDed.
		itemGroupSelection.selectAll("text.itemtitle")
		.text(function (d) { return d.title; }), 
		["x", "width", "height"])
		.attr("y", function (item) { return item.y + 44/2; })
		.attr("fill", function (item) { return "white"; });
		
	// Set up the score field.
	itemGroupSelection.selectAll("text.score")
		.text(function (d) { return d.score; })
		.attr("x", function (item) { return 100 + item.x; })
		.attr("y", function (item) { return item.y + 44/2; })
		.attr("width", function (item) { return 100; })
		.attr("height", function (item) { return 44; })
		.attr("fill", function (item) { return "white"; });
		
	// Set up the delete button.
	itemGroupSelection.selectAll("use")
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
			// If a is an item and be is not, it should go after it.
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

	// The first time autorun goes, the collection isn't ready. Once it is, 
	// stop the autorun because it will cause reloads every time a collection 
	// is updated, and it will reload *without* the update. Not sure what's 
	// wrong. So, we're using subscribe instead.

	function redrawBoxes() {
		var boxesContext = new Meteor.deps.Context();
		boxesContext.on_invalidate(redrawBoxes);
		boxesContext.run(function() {
			var boxes = Boxes.find().fetch();
			setUpBoxes(self.node, boxes);
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
		
  Meteor.subscribe('boxes', function() {
		// Make sure the boxes are set up first as well as each time 
		// they are updated.

		redrawBoxes();
				
		// Then, set up the items. (And set them up again each time they are 
		// updated.)
	    Meteor.subscribe('items', function() {
				redrawItems();
	    });
  });
};

