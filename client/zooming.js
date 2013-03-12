
var BoardZoomer = {
	locked: false,
	boxZoneSelection: null,	
	zoomBehavior: null,
	parsedPreLockTransform: null,
	
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
		d3.behavior.zoom().x(x).y(y).scaleExtent([0.00390625, 4])
			.on("zoom", BoardZoomer.syncZoomEventToTransform);
	
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
	syncZoomEventToTransform: function() {
		if (!BoardZoomer.locked) {
			BoardZoomer.boxZoneSelection.attr('transform', 
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
		// console.log("locked to default!");
		BoardZoomer.resetZoom();
		BoardZoomer.locked = true;
	},
	lockZoom: function() {
		// console.log("locked!");
		BoardZoomer.locked = true;
	},
	unlockZoom: function() {
		BoardZoomer.locked = false;
		// If parsedPreLockTransform is set, restore the zoom transform to that.
		if (BoardZoomer.parsedPreLockTransform) {
			BoardZoomer.tweenToNewZoom(BoardZoomer.parsedPreLockTransform.scale, 
				BoardZoomer.parsedPreLockTransform.translate, 300);
			BoardZoomer.parsedPreLockTransform = null;
		}
	},
	lockZoomToDefaultCenterPanAtDataCoords: function(d) {
		// unlockZoom will restore the zoom transform to this.
		BoardZoomer.parsedPreLockTransform = 
			BoardZoomer.parseScaleAndTranslateFromTransformString(
				BoardZoomer.boxZoneSelection.attr('transform'));
		
		BoardZoomer.panToCenterOnRect(d);
		
		BoardZoomer.lockZoom();
	},
	panToCenterOnRect: function(rect) {
		console.log("Centering to rect:", rect);
		var boardSel = $('#boardSVG');
		var boardWidth = parseInt(boardSel.attr('width'));
		var boardHeight = parseInt(boardSel.attr('height'));
				
		BoardZoomer.tweenToNewZoom(1, 
			[(-rect.x - rect.width/2 + boardWidth/2), 
			(-rect.y - rect.height/2 + boardHeight/2)], 300);
	},	
	// A rect is an object that has x, y, width, and height members.
	zoomToFitAllRects: function(rectArray) {
		
		if (BoardZoomer.locked || rectArray.length < 1) {
			// Nothing to do.
			return;
		}

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
		
		var newTranslateX = -enclosingBounds.left * newScale;
		var newTranslateY = -enclosingBounds.top * newScale;
		// console.log("new translate:", newTranslateX, newTranslateY);
		BoardZoomer.tweenToNewZoom(newScale, [newTranslateX, newTranslateY], 500);
	},
	
	// newTranslate should be a two-element array corresponding to x and y in 
	// the translation.
	tweenToNewZoom: function(newScale, newTranslate, time) {
		var oldTransform = BoardZoomer.boxZoneSelection.attr('transform');
			
	  d3.transition().duration(time).tween("zoom", function() {
			var oldScale = 1.0;
			var oldTranslate = [0, 0];
			if (oldTransform) {
				var parsed = 
					BoardZoomer.parseScaleAndTranslateFromTransformString(oldTransform);
				oldScale = parsed.scale;
				oldTranslate = parsed.translate;
			}
			// console.log("oldScale, newScale, oldTranslate", oldScale, newScale, oldTranslate);
     	var interpolateScale = d3.interpolate(oldScale, newScale);
			interpolateTranslation = d3.interpolate(oldTranslate, newTranslate);
			
	    return function(t) {
		 		// This updates the behavior's scale so that the next time a zoom
				// happens, it starts from here instead of jumping back to what it
				// thought it was last time.				
				// The translate is applied after the scale is applied, so we need to
				// apply the scaling to the behavior ourselves.				
				var currentScale = interpolateScale(t);
		 		BoardZoomer.zoomBehavior.scale(currentScale);
		 		// Same with the translate.
				var currentTranslate = interpolateTranslation(t);
		 		BoardZoomer.zoomBehavior.translate(currentTranslate);

				// This sets the transform on the root <g> and changes the zoom and
				// panning.
				BoardZoomer.boxZoneSelection.attr('transform', 
					"translate(" + currentTranslate[0] + ", " + currentTranslate[1] + ")" + 
					" scale(" + currentScale + ")");				 
     	};
	 	});		
	},

	// Returns dict in the form 
	// { scale: int, translate: [translateX, translateY] }
	parseScaleAndTranslateFromTransformString: function(transformString) {
		var parsed = { scale: 1.0, translate: [0, 0] };

		if (transformString && (transformString.length > 0)) {		
			// Transform string will be in the form of "translate(0, 0) scale(1)".
			var scalePiece = transformString.split('scale(')[1];
			parsed.scale = parseFloat(scalePiece.substr(0, scalePiece.length - 1));
						
			var translateFragments = transformString.split(') ')[0].split(',');
			parsed.translate = [
				// Chop out "translate(".
				parseFloat(translateFragments[0].substr(10)),
				parseFloat(translateFragments[1])
			];
			if (!parsed.translate[1]) {
				console.log("Got NaN out of", translateFragments);
			}
		}
		return parsed;
	},
	
	centerOfViewport: function() {
		var scaleAndTranslate = 
			BoardZoomer.parseScaleAndTranslateFromTransformString(
				BoardZoomer.boxZoneSelection.attr('transform'));
		var boardSel = $('#boardSVG');
		var boardWidth = parseInt(boardSel.attr('width'));
		var boardHeight = parseInt(boardSel.attr('height'));
		
		return [(-scaleAndTranslate.translate[0] + boardWidth/2)/scaleAndTranslate.scale, 
			(-scaleAndTranslate.translate[1] + boardHeight/2)/scaleAndTranslate.scale];
	}
}
