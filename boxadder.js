
if (Meteor.isClient) {
	
	var setD3GroupAttrsWithProplist = function(group, propnames) {
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
	
	Template.board.rendered = function () {
	  var self = this;
	  self.node = self.find("svg");
	
	  if (! self.handle) {
	    self.handle = Meteor.autorun(function () {					
	      // Draw a rect for each box or item object
	      var updateRectObjects = function (group, cssClass) {
					return setD3GroupAttrsWithProplist(group, 
						["_id", "x", "y", "width", "height"])
					// Need to set class for CSS. Setting attr seems to clear everything 
					// that's not explicitly set.
					.attr("class", cssClass);
	      };
				
	      var positionItemLabels = function (group) {
					setD3GroupAttrsWithProplist(group, 
						["_id", "x", "y", "width", "height"])
						.classed("itemLabel", true);
	      };				
				
	      var boxesDrawings = 
					d3.select(self.node).select(".boxZone").selectAll("rect .box")
	        	.data(Boxes.find().fetch(), function (box) { return box._id; });
	
				var boxesSelection = boxesDrawings.enter().append("rect").call(drag);
	      updateRectObjects(boxesSelection, "box")
				.attr("fill", function(d) { return "red"; });
				
				// Create <foreignObject> elements for each box to hold sums.
	      var sumLabels = 
					d3.select(self.node).select(".sumLabels").selectAll("foreignObject")
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
				
	      var itemDrawings = 
					d3.select(self.node).select(".boxZone").selectAll("g .item")
	        	.data(Items.find().fetch(), function (item) { return item._id; });
					
				var itemGroupSelection = itemDrawings.enter().append("g").call(groupdrag);
					
				// Set up the text.
				setD3GroupAttrsWithProplist(
					itemGroupSelection.append("text").text(function (d) { return d.title; }), 
					["_id", "x", "y", "width", "height"]);
				
	      updateRectObjects(itemGroupSelection
					.append("rect").attr("fill", function(d) { return "blue"; }), 
					"item");
					
								
				// Create <foreignObject> elements for each item.
	      var itemLabels = 
					d3.select(self.node).select(".itemLabels").selectAll("foreignObject")
					.data(Items.find().fetch(), function (item) { return item._id; });
				// console.log(labels);
								
				// positionItemLabels(itemLabels.enter().append("text")
				// 	.text(function (d) { return d.title; }));
					
				// Populate the foreignObject items using the item template.
				// $('.itemLabel').each(function (index, foreignObject) { 
				// 	$(foreignObject).append(
				// 		"<body xmlns=\"http://www.w3.org/1999/xhtml\"></body>")
				// 	// Be careful to specify the search critera to find(), not fetch().
				// 	.append(
				// 		Template.item(Items.find({ _id: $(foreignObject).attr("_id") })
				// 		.fetch()[0]));
				// 	});
				// 				
				itemLabels.exit().remove();
								
			});
		}	
	};
	
	Template.boxContainer.boxes = function () {
	  return Boxes.find({});
	};
	
	Template.boxContainer.showCreateDialog = function() {
		return Session.get("showCreateDialog");
	}	
	
	// Sum up all the items in a box
	Template.sumContainer.sum = function()
	{
		var total = 0;

		// 'this' is a Box model.
		
		// Find out which items intersect the box.
		var boxLeft = this.x;
		var boxRight = boxLeft + this.width;
		var boxTop = this.y;
		var boxBottom = boxTop + this.height;
		
		var items = Items.find().fetch();
		var boxItems = _.filter(items, function(item) {
			console.log(item);
			var itemRight = item.x + item.width;
			var itemBottom = item.y + item.height;
			if ((item.x >= boxLeft) && (itemRight <= boxRight) &&
				(item.y >= boxTop) && (itemBottom <= boxBottom))
			{
				return true;				
			}
			else
			{
				console.log("Not in box: " + item);
				return false;
			}
		});
		
		if (boxItems !== undefined)
		{
			for (var i = 0; i < boxItems.length; ++i)
			{
				total += boxItems[i].score;
			}
		}
		return total;
	};
	
  Template.box.items = function () {
		return Items.find({ boxId: this._id });
  };

  Template.box.selected_name = function () {
    var item = Items.findOne(Session.get("selected_item"));
    return item && item.name;
  };
	
  Template.addItem.events({
		'click .add-new-item': function (event, template) {
				var spaceBetweenItems = 52;
		    var title = template.find("#new-item-box .title").value;
		    var description = template.find("#new-item-box .description").value;
		    var score = parseInt(template.find("#new-item-box .score").value);
			
			  var nextItemX = Session.get("nextItemX");
			  var nextItemY = Session.get("nextItemY");

				if (nextItemX === undefined) {
					nextItemX = 0;
				}
				if (nextItemY === undefined) {
					// Find the item with the greatest y and then add the offset.
					nextItemY = 0;
					var items = Items.find().fetch();
					if (items.length > 0)
					{
						var bottomMostItem = _.reduce(items, 
							function(memo, num) { 
									console.log(memo);
									return (num.y > memo.y) ? num : memo; 
								}, 
								items[0]);
						
						nextItemY = bottomMostItem.y;
						console.log(nextItemY);
					}
				}
				
				console.log("Final nextItemY: " + nextItemY);
	      Meteor.call('createItem', {
	        title: title,
	        description: description,
					score: score,
					x: nextItemX, y: nextItemY, width: 240, height: 44
	      }, 
				function (error, box) {
	        if (! error) {
						// TODO.
	        }
	      });
				
				Session.set("nextItemX", nextItemX);
				Session.set("nextItemY", nextItemY + spaceBetweenItems);
		}
	});	

  Template.item.selected = function () {
    return Session.equals("selected_item", this._id) ? "selected" : '';
  };
	
	Template.createDialog.events({
	  'click .save': function (event, template) {
	    var title = template.find(".title").value;
	    var description = template.find(".description").value;

	    if (title.length && description.length) {
				
			  var nextBoxX = Session.get("nextBoxX");
			  var nextBoxY = Session.get("nextBoxY");
				if (nextBoxX === undefined) {
					nextBoxX = 0;
				}
				if (nextBoxY === undefined) {
					nextBoxY = 0;
				}
				
	      Meteor.call('createBox', {
	        title: title,
	        description: description,
					x: nextBoxX, y: nextBoxY, width: 320, height: 320
	      }, 
				function (error, box) {
	        if (! error) {
						// TODO.
	        }
	      });
	      Session.set("showCreateDialog", false);
				
				// TODO: Wrap to next row at some point.
				Session.set("nextBoxX", nextBoxX + 64);
				Session.set("nextBoxY", nextBoxY + 64);
				
	    } else {
	      Session.set("createError",
	                  "It needs a title and a description, or why bother?");
	    }
	  },

	  'click .cancel': function () {
	    Session.set("showCreateDialog", false);
	  }
	});

	Template.createDialog.error = function () {
	  return Session.get("createError");
	};

  Template.item.events({
    'click input.inc': function () {
      items.update(Session.get("selected_item"), {$inc: {score: 5}});
    },		
    'click': function () {
      Session.set("selected_item", this._id);
    },
    'keyup input': function (evt) {
			// .sum = Template.box.calculateSum();
    }
  });
	
	Template.newBoxButton.events({
	  'click': function (event, template) {
	    if (! Meteor.userId()) // must be logged in to create boxes
	      return;

				console.log("Showing create dialog.");
			Session.set("showCreateDialog", true);
	  }
	});		
}


if (Meteor.isServer) {
  Meteor.startup(function () {
  });
}
