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
function dragmove(d) {
  d3.select(this)
    .attr("x", d.x = d3.event.x)
    .attr("y", d.y = d3.event.y);
}
var drag = d3.behavior.drag().origin(Object).on("drag", dragmove);	

function groupdragmove(d) {
  d3.selectAll(this.childNodes)
    .attr("x", function(item) { 
			item.x = parseInt($(this).attr("x")) + d3.event.dx; return item.x; } )
    .attr("y", function(item) { 
			item.y = parseInt($(this).attr("y")) + d3.event.dy; return item.y; });
}

var groupdrag = d3.behavior.drag().origin(Object).on("drag", groupdragmove);	

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
	boxGroupsSelection.enter().append("g").call(groupdrag);

	// Set up the rect and its position and color. Append it first so that it is 
	// the furthest back, z-order-wise.
  syncCommonRectAttrs(boxGroupsSelection.append("rect")
		.attr("fill", function(d) { return "white"; })
		.attr("stroke", function (d) { return "red"; }),
		"box");
		
	// Add the sum box and label to the boxes.
	boxGroupsSelection.append("rect").classed("sum", true)
	.attr("stroke", "red").attr("fill", "orange")
	.attr("x", function (box) { return box.x + box.width - 100; })
	.attr("y", function (box) { return box.y + box.height - 44; })
	.attr("width", function (box) { return 100; })
	.attr("height", function (box) { return 44; });
	
	boxGroupsSelection.append("text").text(
		function (box) { return sumForBox(box); })
		.attr("x", function (box) { return box.x + box.width - 100/2; })
		.attr("y", function (box) { return box.y + box.height - 44/2 + 4; })
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; })
		.attr("fill", function (box) { return "white"; });
	
	boxGroupsSelection.exit().remove();
}

function setUpItems(svgNode) {
	// Sync the <g>s and the data.
  var itemGroupSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("g .item")
    	.data(Items.find().fetch(), function (item) { return item._id; });
					
	itemGroupSelection.enter().append("g").call(groupdrag);
	
	// Set up the rect and its position and color. Do this first so that it is 
	// the furthest back, z-order-wise.
  syncCommonRectAttrs(itemGroupSelection
		.append("rect").attr("fill", function(d) { return "blue"; }), 
		"item");
					
	// Set up the title label.
	setD3GroupAttrsWithProplist(
		itemGroupSelection.append("text").text(function (d) { return d.title; }), 
		["x", "width", "height"])
		.attr("y", function (item) { return item.y + 44/2; })
		.attr("fill", function (item) { return "white"; });
		
	// Set up the score field.
	itemGroupSelection.append("text").text(function (d) { return d.score; })
		.attr("x", function (item) { return 100 + item.x; })
		.attr("y", function (item) { return item.y + 44/2; })
		.attr("width", function (item) { return 100; })
		.attr("height", function (item) { return 44; })
		.attr("fill", function (item) { return "white"; });
			
	itemGroupSelection.exit().remove();
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
