
var BoardZoomer = {
	locked: false,
	boxZoneSelection: null,	
	zoomBehavior: null,
	
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
			
		BoardZoomer.zoomBehavior = 
		d3.behavior.zoom().x(x).y(y).scaleExtent([0.0625, 4])
			.on("zoom", BoardZoomer.zoom);
	
		// When zoom and pan gestures happen inside of #boardSVG, have it call the 
		// zoom function to make changes.
		d3.select("#boardSVG").call(BoardZoomer.zoomBehavior);
	
		BoardZoomer.boxZoneSelection = d3.select("g.boxZone");
	},
	// This function applies the zoom changes to the <g> element rather than
	// the <svg> element because <svg>s do not have a transform attribute. 
	// The behavior is connected to the <svg> rather than the <g> because then
	// dragging-to-pan doesn't work otherwise. Maybe something cannot be 
	// transformed while it is receiving drag events?
	zoom: function() {
		if (!BoardZoomer.locked) {
			BoardZoomer.boxZoneSelection.attr("transform", 
				"translate(" + d3.event.translate + ")" + 
				" scale(" + d3.event.scale + ")");
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
	lockZoom: function() {
		console.log("locked!");
		BoardZoomer.locked = true;
	},
	preLockZoomTransformString: null,
	unlockZoom: function() {
		console.log("unlocked!");
		BoardZoomer.locked = false;
		// If preLockZoomTransformString is set, restore the zoom transform to that.
		if (BoardZoomer.preLockZoomTransformString) {
			BoardZoomer.boxZoneSelection.attr('transform', 
				BoardZoomer.preLockZoomTransformString);
			BoardZoomer.preLockZoomTransformString = null;
		}
	},
	lockZoomToDefaultCenterPanAtDataCoords: function(d) {
		var boxZoneSel = $('.boxZone');
		var boardSel = $('#boardSVG');
		var boardWidth = parseInt(boardSel.attr('width'));
		var boardHeight = parseInt(boardSel.attr('height'));
		
		// unlockZoom will restore the zoom transform to this.
		BoardZoomer.preLockZoomTransformString = 
			BoardZoomer.boxZoneSelection.attr('transform');
		
		var newTransformString = 'translate(' + 
			(-d.x + boardWidth/2) + ', ' + (-d.y + boardHeight/2) + 
			') scale(1)';		
		// console.log("Setting transform to: ", newTransformString);
		boxZoneSel.attr('transform', newTransformString);
		d3.event.scale = 1.0;
		BoardZoomer.lockZoom();
	},
	// A rect is an object that has x, y, width, and height members.
	zoomToFitAllRects: function(rectArray) {
		
		if (BoardZoomer.locked || rectArray.length < 1) {
			// Nothing to do.
			return;
		}

		console.log(rectArray);
		
		var enclosingBounds = _.reduce(rectArray, function(memo, rect) {
			if (rect.x < memo.left) {
				memo.left = rect.x;
			}
			if (rect.y < memo.top) {
				memo.top = rect.y;
			}
			
			var rectRight = rect.x + rect.width;
			var rectBottom = rect.y + rect.height;
			
			if (rectRight > memo.right) {
				memo.right = rectRight;
			}
			if (rectBottom > memo.bottom) {
				memo.bottom = rectBottom;
			}
			return memo;
		}, 
		{ left: 9999999, top: 9999999, right: 0, bottom: 0 });
		
		// console.log(enclosingBounds);
		
		var boardSel = $('#boardSVG');
		var boardWidth = parseInt(boardSel.attr('width'));
		var boardHeight = parseInt(boardSel.attr('height'));
		var boundsWidth = enclosingBounds.right - enclosingBounds.left;
		var boundsHeight = enclosingBounds.bottom - enclosingBounds.top;
		var newScaleX = 1.0;
		var newScaleY = 1.0;
		
		if (boundsWidth > 0) {
			newScaleX = boardWidth/boundsWidth;
		}
		if (boundsHeight > 0) {
			newScaleY = boardHeight/boundsHeight;
		}
		
		var newScale = newScaleX;		
		if (newScaleY < newScale) {
			newScale = newScaleY;
		}
		
		// The translate is applied after the scale is applied, so we need to apply
		// the scaling ourselves.
		var newTranslateX = -enclosingBounds.left * newScale;
		var newTranslateY = -enclosingBounds.top * newScale;
		// console.log("new translate:", newTranslateX, newTranslateY);
	
		// This sets the transform on the root <g> and changes the zoom and panning.
		BoardZoomer.boxZoneSelection.attr("transform", 
			"translate(" + newTranslateX + ", " + newTranslateY + ")" + 
			" scale(" + newScale + ")");
			
		// This updates the behavior's scale so that the next time a zoom happens, 
		// it starts from here instead of jumping back to what it thought it was 
		// last time.
		BoardZoomer.zoomBehavior.scale(newScale);
		// Same with the translate.
		BoardZoomer.zoomBehavior.translate([newTranslateX, newTranslateY]);
	}
}
