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
    .attr("x", d.x = d3.event.x)
    .attr("y", d.y = d3.event.y);
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
  // Append Boxes to the existing box rects.
  var boxesSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("rect .box")
    	.data(Boxes.find().fetch(), function (box) { return box._id; });

	// Sync the Boxes data with the box rects. Add drag behavior to them.
	boxesSelection.enter().append("rect").call(drag);
  syncCommonRectAttrs(boxesSelection, "box")
	.attr("fill", function(d) { return "red"; });
	
	boxesSelection.exit().remove();
}

function setUpSums(svgNode) {
	// Create <foreignObject> elements for each box to hold sums.
  var sumLabels = 
		d3.select(svgNode).select(".sumLabels").selectAll("foreignObject")
			.data(Boxes.find().fetch(), function (box) { return box._id; });
			
	sumLabels.enter().append("foreignObject").classed("sumLabel", true)
		.attr("_id", function (box) { return box._id; })
		.attr("x", function (box) { return box.x + box.width - 100; })
		.attr("y", function (box) { return box.y + box.height - 44; })
		.attr("width", function (box) { return 100; })
		.attr("height", function (box) { return 44; });
				
	// Populate those foreign objects with the sum template.
	$('.sumLabel').each(function (index, foreignObject) {
		// Be careful to give the search criteria to find(), not to fetch().
		var theBox = 
			Boxes.find({ _id: $(foreignObject).attr("_id") }).fetch()[0];
				
		$(foreignObject).append(
			"<body xmlns=\"http://www.w3.org/1999/xhtml\"></body>")
		.append(Template.sumContainer(theBox));					
	});	
	
	sumLabels.exit().remove();	
}

function setUpItems(svgNode) {
	// Sync the <g>s and the data.
  var itemGroupSelection = 
		d3.select(svgNode).select(".boxZone").selectAll("g .item")
    	.data(Items.find().fetch(), function (item) { return item._id; });
					
	itemGroupSelection.enter().append("g").call(groupdrag);
					
	// Set up the text.
	setD3GroupAttrsWithProplist(
		itemGroupSelection.append("text").text(function (d) { return d.title; }), 
		["_id", "x", "y", "width", "height"]);
				
  syncCommonRectAttrs(itemGroupSelection
		.append("rect").attr("fill", function(d) { return "blue"; }), 
		"item");
		
	itemGroupSelection.exit().remove();
}

/* Board renderer */

Template.board.rendered = function () {
  var self = this;
  self.node = self.find("svg");
	
  if (! self.handle) {
    self.handle = Meteor.autorun(function () {			
			setUpBoxes(self.node);
			setUpSums(self.node);
			setUpItems(self.node);				
		});
	}	
};
