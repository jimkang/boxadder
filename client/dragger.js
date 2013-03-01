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
	},
	
	// Edge detection stuff.
	edgeMargin: 10,
	// Set this if you want a custom response to an edge being dragged.
	edgeDrag: function() { console.log("Edge is being dragged.") },
	// Returns the element that defines the bounds for the <g>.
	getBoundsElement: function(gElement) {
		return d3.select(gElement).select("rect.bounds-background")[0][0];
	},
	// This is an enum.
	Edge: {
		none: 0,
		left: 1,
		right: 2,
		top: 3,
		bottom: 4
	},
	// Returns an array of two edge enums. The first element is the x edge, 
	// the second is the y edge.
	edgesThatWereTappedInBoundsElement: function(dataWithRect, boundsElement) {				
		// TODO: Use d3.touches on mobile platforms.
		var tapPos = d3.mouse(boundsElement);
		// console.log(dataWithRect.x, dataWithRect.y);
		// console.log(tapPos);
		
		var leftEdge = dataWithRect.x;
		var leftMargin = dataWithRect.x + BoardDragger.edgeMargin;
		var rightEdge = dataWithRect.x + dataWithRect.width;
		var rightMargin = rightEdge - BoardDragger.edgeMargin;
		
		var topEdge = dataWithRect.y;
		var topMargin = dataWithRect.y + BoardDragger.edgeMargin;
		var bottomEdge = dataWithRect.y + dataWithRect.height;
		var bottomMargin = bottomEdge - BoardDragger.edgeMargin;
		
		var tappedEdges = [BoardDragger.Edge.none, BoardDragger.Edge.none];
		if (tapPos[0] >= leftEdge && tapPos[0] <= leftMargin) {
			tappedEdges[0] = BoardDragger.Edge.left;
		}
		else if (tapPos[0] <= rightEdge && tapPos[0] >= rightMargin) {
			tappedEdges[0] = BoardDragger.Edge.right;
		}
		
		if (tapPos[1] >= topEdge && tapPos[1] <= topMargin) {
			tappedEdges[1] = BoardDragger.Edge.top;
		}
		else if (tapPos[1] <= bottomEdge && tapPos[1] >= bottomMargin) {
			tappedEdges[1] = BoardDragger.Edge.bottom;			
		}
		
		return tappedEdges;
	},
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
