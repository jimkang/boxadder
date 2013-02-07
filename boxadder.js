
if (Meteor.isClient) {
	
	Template.board.rendered = function () {
	  var self = this;
	  self.node = self.find("svg");
	
	  if (! self.handle) {
	    self.handle = Meteor.autorun(function () {
				
	      // var selectedParty = selected && Parties.findOne(selected);
	      var radius = 10;
				// function (party) {
				// 	        return 10 + Math.sqrt(attending(party)) * 10;
				// 	      };
	
	      // Draw a rect for each box or item object
	      var updateRectObjects = function (group, cssClass) {					
	        group.attr("id", function (rectObj) { return rectObj._id; })
	        .attr("x", function (rectObj) { return rectObj.x; })
	        .attr("y", function (rectObj) { return rectObj.y; })
	        .attr("width", function (rectObj) { return rectObj.width; })
	        .attr("height", function (rectObj) { return rectObj.height; })
					// Need to set class for CSS. Setting attr seems to clear everything 
					// that's not explicitly set.
					.attr("class", cssClass);
	      };
				
	      var updateItemLabels = function (group) {
	        group.attr("id", function (item) { return item._id; })
	        .text(function (item) {return item.title ;})
					// Label text elements need to be offset a bit from the label rect.
	        .attr("x", function (item) { return item.x + 24; })
	        .attr("y", function (item) { return item.y + 24; });
	      };
				
	      var boxesDrawings = 
					d3.select(self.node).select(".boxZone").selectAll("rect .box")
	        	.data(Boxes.find().fetch(), function (box) { return box._id; });
	
	      updateRectObjects(boxesDrawings.enter().append("rect"), "box");

	      var itemDrawings = 
					d3.select(self.node).select(".boxZone").selectAll("rect .item")
	        	.data(Items.find().fetch(), function (item) { return item._id; });
	
	      updateRectObjects(itemDrawings.enter().append("rect"), "item");
				
				// Create <text> elements for each item.
	      var itemLabels = d3.select(self.node).select(".labels").selectAll("text")
	        .data(Items.find().fetch(), function (item) { return item._id; });
				// console.log(labels);
				
				updateItemLabels(itemLabels.enter().append("text"));
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
	Template.box.sum = function()
	{
		// The fetch call is important here. We want the actual collection, not 
		// the cursor.
		var items = Items.find({ boxId: this._id }).fetch();
		
		var total = 0;
		if (items !== undefined)
		{
			for (var i = 0; i < items.length; ++i)
			{
				total += items[i].score;
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
	
  Template.box.events({
    'click input.inc': function () {
      items.update(Session.get("selected_item"), {$inc: {score: 5}});
    },
		'click .add-new-item': function (event, template) {
		    var title = template.find("#new-item-box .title").value;
		    var description = template.find("#new-item-box .description").value;
		    var score = parseInt(template.find("#new-item-box .score").value);
			
			  var nextItemX = Session.get("nextItemX");
			  var nextItemY = Session.get("nextItemY");
				if (nextItemX === undefined) {
					nextItemX = 0;
				}
				if (nextItemY === undefined) {
					nextItemY = 0;
				}
				
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
				
				Session.set("nextItemX", nextItemX + 52);
				Session.set("nextItemY", nextItemY + 52);				
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
