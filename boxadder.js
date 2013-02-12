
if (Meteor.isClient) {
	Template.boxContainer.boxes = function () {
	  return Boxes.find({});
	};
	
	Template.boxContainer.showCreateDialog = function() {
		return Session.get("showCreateDialog");
	}	
	
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

/* Model utils */

function sumForBox(box) {
	var total = 0;
		
	// Find out which items intersect the box.
	var boxLeft = box.x;
	var boxRight = boxLeft + box.width;
	var boxTop = box.y;
	var boxBottom = boxTop + box.height;
		
	var items = Items.find().fetch();
	var boxItems = _.filter(items, function(item) {
		// console.log(item);
		var itemRight = item.x + item.width;
		var itemBottom = item.y + item.height;
		if ((item.x >= boxLeft) && (itemRight <= boxRight) &&
			(item.y >= boxTop) && (itemBottom <= boxBottom))
		{
			return true;				
		}
		else
		{
			// console.log("Not in box: " + item);
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
}
