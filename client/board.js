/* Board rendering helpers */

function setD3GroupAttrsWithProplist(group, propnames) {
	// We are running all these methods (attr, append, etc.) on the group
	// not just one node. Keep it in mind.
	for (var i = 0; i < propnames.length; ++i) {
		var propname = propnames[i];
		group.attr(propname, function (obj) { return obj[propname]; } );
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
			return parseInt($(this).attr("x")) + d3.event.dx;  } )
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
	
	collection.update(d._id, {$set: {x: d.x, y: d.y}});
	
	// Then, recalculate the sums.
	// // Recalculate the sums.
	// d3.selectAll(".sum").text(function (box) { 
	// 	console.log("hi!"); return sumForBox(box); });
// });
}

var groupdrag = d3.behavior.drag().origin(Object).on("drag", groupdragmove)
.on("dragend", saveAndRecalcOnDragStop);

function syncCommonRectAttrs(group, cssClass) {
	return setD3GroupAttrsWithProplist(group, 
		["_id", "x", "y", "width", "height"])
	// Need to set class for CSS. Setting attr seems to clear everything 
	// that's not explicitly set.
	.attr("class", cssClass);
};

function positionItemLabels(group) {
	setD3GroupAttrsWithProplist(group, 
		["_id", "x", "y", "width", "height"])
		.classed("itemLabel", true);
};

/* Element set up/syncing. */

function setUpBoxes(svgNode) {
	// Set up the <g> elements for the boxes.
  var boxGroupsSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("g .box")
    	.data(Boxes.find().fetch(), function (box) { return box._id; });

  // Sync the <g> elements to the box records. Add the drag behavior.
	boxGroupsSelection.enter().append("g").classed("box", true).call(groupdrag);

	// Set up the rect and its position and color. Append it first so that it is 
	// the furthest back, z-order-wise.
  syncCommonRectAttrs(boxGroupsSelection.append("rect")
		.attr("fill", function(d) { return "white"; })
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
}

function setUpItems(svgNode) {
	
	var items = Items.find().fetch();
	var itemIdFunction = function (item) { return item._id; };
	var boxZoneSelection = d3.select(svgNode).select(".boxZone");
	
	// Sync the <g>s and the data.
  var itemGroupSelection = 
		boxZoneSelection.selectAll("g .item").data(items, itemIdFunction);
					
	itemGroupSelection.enter().append("g").classed("item", true).call(groupdrag)
	// Append the rect first so that it is the furthest back, z-order-wise.
	.call(function (groupElement) { groupElement.append("rect"); })
	.call(function (groupElement) { 
		groupElement.append("text").classed("itemtitle", true); })
	.call(function (groupElement) { 
		groupElement.append("text").classed("score", true); });
	
	itemGroupSelection.exit().remove();
		
	// Set up the rect and its position and color.	
  syncCommonRectAttrs(itemGroupSelection.selectAll("rect"))
	.attr("fill", function(d) { return "blue"; });
		
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
}

/* Board renderer */

Template.board.rendered = function () {
  var self = this;
  self.node = self.find("svg");
	
  if (! self.handle) {
    self.handle = Meteor.autorun(function () {			
			setUpBoxes(self.node);
			setUpItems(self.node);				
		});
	}	
};
