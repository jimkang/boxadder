// Handles drag events on svg groups.

var BoardDragger = {
	// Members to keep track of the change across the current drag.
	currentDragChangeX: 0,
	currentDragChangeY: 0,
	
	currentlyResizing: false,
	currentResizeHandle: null,
	currentResizeGroupElement: null,
	
	resetDragChange: function() {
		BoardDragger.currentDragChangeX = 0;
		BoardDragger.currentDragChangeY = 0;
	},
	
	updateDragChangeWithD3Event: function() {
		BoardDragger.currentDragChangeX += d3.event.dx;
		BoardDragger.currentDragChangeY += d3.event.dy;		
	},
	
	// Assign something else to this if you want to identify the resize handle 
	// a different way.
	elementIsResizeHandle: function(element) {
		if (!element) {
			return false;
		}
		else {
			return (element.getAttribute("id") === "resizeGrip");			
		}
	},
	
	getTappedElementFromEvent: function(event) {
		var tappedElement = null;
		var x = event.clientX;
		var y = event.clientY;
		console.log(event);
		if (x === undefined || y === undefined) {
			// Try TouchEvent members.
			tappedElement = event.target.correspondingUseElement;
		}
		else {
			tappedElement = document.elementFromPoint(x, y);
		}

		return tappedElement;
	},
	
	// A method to provide to the d3 drag behavior to run when something is
	// dragged.
	groupDragMove: function(d) {
		if (BoardDragger.currentlyResizing) {			
			BoardDragger.resize(d);
		}
		else {		
			var clickedElement = 
			BoardDragger.getTappedElementFromEvent(d3.event.sourceEvent);
			
			console.log('clickedElement', clickedElement);
			if (BoardDragger.elementIsResizeHandle(clickedElement)) {				
				console.log("Starting resize!");
				BoardZoomer.lockZoom();
				
				BoardDragger.currentResizeHandle = clickedElement;
				BoardDragger.currentResizeGroupElement = this;
				
				BoardDragger.resize(d);
			}
			else {
				BoardDragger.updateDragChangeWithD3Event();
		
				BoardZoomer.lockZoom();
		
				d.x += d3.event.dx;
				d.y += d3.event.dy;
				// console.log(d.x + ", " + d.y);	
	
			  d3.selectAll(this.childNodes)
			    .attr("x", function(item) {
						return parseInt($(this).attr("x")) + d3.event.dx; })
			    .attr("y", function(item) { 
						return parseInt($(this).attr("y")) + d3.event.dy; });
			}
		}
	},
	
	resize: function(d, parentGroupElement, resizeHandleElement) {
		BoardDragger.currentlyResizing = true;
		
		// Update the data store.
		d.width += d3.event.dx;
		d.height += d3.event.dy;		

		// Find the background rect of the parent <g> and update that.
		var bgRect = d3.select(BoardDragger.currentResizeGroupElement)
		.select(".bounds-background")[0][0];
		$(bgRect).attr('width', d.width);
		$(bgRect).attr('height', d.height);
		
		// Move the resize handle.
		$(BoardDragger.currentResizeHandle).attr('x', 
			parseInt($(BoardDragger.currentResizeHandle).attr('x')) + d3.event.dx);
		$(BoardDragger.currentResizeHandle).attr('y', 
			parseInt($(BoardDragger.currentResizeHandle).attr('y')) + d3.event.dy);
	},
	
	endResize: function(d) {		
		BoardZoomer.unlockZoom();
		BoardDragger.currentResizeHandle = null;
		BoardDragger.currentResizeGroupElement = null;
		
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
		BoardDragger.currentlyResizing = false;
	},

	saveAndRecalcOnDragStop: function(d, element) {
		
		BoardZoomer.unlockZoom();
		
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
		var className = $(element).attr('class');
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
	
	dragStop: function(d) {
		if (BoardDragger.currentlyResizing) {
			BoardDragger.endResize(d);
		}
		else {
			BoardDragger.saveAndRecalcOnDragStop(d, this);
		}		
	}
};

// Method that adds dragging behavior to SVG selections of groups (parent <g> 
// and child nodes).

var addGroupDragBehavior = d3.behavior.drag().origin(Object)
	.on("drag", BoardDragger.groupDragMove)
	// .on("dragstart", Dragger.dragStarted);
	.on("dragend", BoardDragger.dragStop);
