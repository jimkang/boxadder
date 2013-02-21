Template.boxContainer.boxes = function () {
  return Boxes.find({});
};
	
Template.boxContainer.showcreateBoxDialog = function() {
	return Session.get("showcreateBoxDialog");
}	
	
Template.box.items = function () {
	return Items.find({ boxId: this._id });
};

Template.box.selected_name = function () {
  var item = Items.findOne(Session.get("selected_item"));
  return item && item.name;
};
	
Template.addItem.events({
	'click .addNewItem': function (event, template) {
		var spaceBetweenItems = 50;
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
      title: "New Item",
			score: 0,
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
	
Template.addBox.events({
  'click': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create boxes
      return;

		  var nextBoxX = Session.get("nextBoxX");
		  var nextBoxY = Session.get("nextBoxY");
			if (nextBoxX === undefined) {
				nextBoxX = 0;
			}
			if (nextBoxY === undefined) {
				nextBoxY = 0;
			}
				
      Meteor.call('createBox', {
        title: "New Box",
				x: nextBoxX, y: nextBoxY, width: 320, height: 320
      }, 
			function (error, box) {
        if (!error) {						
					makeSureItemsAreInFrontOfBoxes($('svg')[0]);
        }
      });
      Session.set("showcreateBoxDialog", false);
				
			// TODO: Wrap to next row at some point.
			Session.set("nextBoxX", nextBoxX + 64);
			Session.set("nextBoxY", nextBoxY + 64);
  }
});
	
Template.addBoard.events({
  'click .addBoard': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create boards
      return;

		  Session.set("showNewBoardDialog", true);
  },
  'click .cancel': function () {
    Session.set("showNewBoardDialog", false);
  }	
});	

// Defining this Handlebars helper method with a reference to the Session 
// variable showNewBoardDialog in it makes Meteor reevaluate the addBoard
// template when that Session variable changes.
Template.addBoard.showNewBoardDialog = function () {
  return Session.get("showNewBoardDialog");
};
