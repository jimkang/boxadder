// Handles drag events on svg groups.

var BoardDragger = {
	// Members to keep track of the change across the current drag.
	currentDragChangeX: 0,
	currentDragChangeY: 0,
	
	resetDragChange: function() {
		BoardDragger.currentDragChangeX = 0;
		BoardDragger.currentDragChangeY = 0;
	},
	
	updateDragChangeWithD3Event: function() {
		BoardDragger.currentDragChangeX += d3.event.dx;
		BoardDragger.currentDragChangeY += d3.event.dy;		
	},
	
	// A method to provide to the d3 drag behavior to run when something is
	// dragged.
	groupDragMove: function(d) {
		BoardDragger.updateDragChangeWithD3Event();
		
		d.x += d3.event.dx;
		d.y += d3.event.dy;
		// console.log(d.x + ", " + d.y);	
	
	  d3.selectAll(this.childNodes)
	    .attr("x", function(item) {
				return parseInt($(this).attr("x")) + d3.event.dx; })
	    .attr("y", function(item) { 
				return parseInt($(this).attr("y")) + d3.event.dy; });		
	},

	saveAndRecalcOnDragStop: function(d) {
		// Do this work only if there was an actual change. A drag can end with 
		// 0 movement in both dimensions.
		if ((BoardDragger.currentDragChangeX === 0) && 
			(BoardDragger.currentDragChangeY === 0)) {
			return;
		}		
		BoardDragger.resetDragChange();
		
		// First, commit the changes to what was dragged.

		// Figure out appropriate collection to update.
		var collection = null;
		var className = $(this).attr('class');
		if (className == 'item') {
			collection = Items;
		}
		else if (className == 'box') {
			collection = Boxes;
		}

		syncDatumToCollection(d, ['x', 'y'], collection, 
			function(val) { return parseInt(val); });
	
		// Then, recalculate the sums.
		d3.selectAll(".sum").text(function (box) { return sumForBox(box); });
	}
};

// Method that adds dragging behavior to SVG selections of groups (parent <g> 
// and child nodes).

var addGroupDragBehavior = d3.behavior.drag().origin(Object)
	.on("drag", BoardDragger.groupDragMove)
	// .on("dragstart", Dragger.dragStarted);
	.on("dragend", BoardDragger.saveAndRecalcOnDragStop);

var addResizeHandleDragBehavior = d3.behavior.drag().origin(Object)
	.on("drag", function(d) {
		// Update the data store.
		d.width += d3.event.dx;
		d.height += d3.event.dy;		
		
		var parentG = $(this).parent()[0];
		// Find the background rect of the parent <g> and update that.
		var bgRect = d3.select(parentG).select(".bounds-background")[0][0];
		$(bgRect).attr('width', d.width);
		$(bgRect).attr('height', d.height);
		
		// Move the resize handle.
		$(this).attr('x', parseInt($(this).attr('x')) + d3.event.dx);
		$(this).attr('y', parseInt($(this).attr('y')) + d3.event.dy);
	})
	.on("dragend", function(d) {

		var collection = null;
		// Find a better way to find the collection for the object.
		if ("score" in d) {
			collection = Items;
		}
		else {
			collection = Boxes;
		}

		syncDatumToCollection(d, ['width', 'height'], collection, 
			function(val) { return parseInt(val); });		
	});
