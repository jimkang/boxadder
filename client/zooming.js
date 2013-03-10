
var BoardZoomer = {
	locked: false,
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
	
		// When zoom and pan gestures happen inside of #boardSVG, have it call the 
		// zoom function to make changes.
		d3.select("#boardSVG").call(
			d3.behavior.zoom().x(x).y(y).scaleExtent([0.0625, 4]).on("zoom", zoom)
		);
	
		var boxZoneSelection = d3.select("g.boxZone");

		// This function applies the zoom changes to the <g> element rather than
		// the <svg> element because <svg>s do not have a transform attribute. 
		// The behavior is connected to the <svg> rather than the <g> because then
		// dragging-to-pan doesn't work otherwise. Maybe something cannot be 
		// transformed while it is receiving drag events?
		function zoom() {
			if (!BoardZoomer.locked) {
				boxZoneSelection.attr("transform", 
					"translate(" + d3.event.translate + ")" + 
					" scale(" + d3.event.scale + ")");
			}
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
	unlockZoom: function() {
		console.log("unlocked!");
		BoardZoomer.locked = false;
	},
	lockZoomToDefaultCenterPanAtDataCoords: function(d) {
		var boxZoneSel = $('.boxZone');
		var boardSel = $('#boardSVG');
		var boardWidth = parseInt(boardSel.attr('width'));
		var boardHeight = parseInt(boardSel.attr('height'));
		var newTransformString = 'translate(' + 
			(-d.x + boardWidth/2) + ', ' + (-d.y + boardHeight/2) + 
			') scale(1)';		
		// console.log("Setting transform to: ", newTransformString);
		boxZoneSel.attr('transform', newTransformString);
		d3.event.scale = 1.0;
		BoardZoomer.locked = true;
	}
}
