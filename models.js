// Set up a collection to contain item information. On the server,
// it is backed by a MongoDB collection named "items".

Items = new Meteor.Collection("items");
Boxes = new Meteor.Collection("boxes");
Boards = new Meteor.Collection("boards");

if (Meteor.isServer) {	
	Meteor.publish("items", function(params) { 
		return Items.find({ board: params.boardId }); 
	});
	Meteor.publish("boxes", function(params) { 
		return Boxes.find({ board: params.boardId });
	});
	Meteor.publish("boards", function() { return Boards.find(); });
}

/*
Boxes.allow({
  insert: function (userId, box) {
    return false; // no cowboy inserts -- use createBox method
  },
  update: function (userId, boxes, fields, modifier) {
    return _.all(boxes, function (box) {
      if (userId !== box.owner)
        return false; // not the owner
  
      var allowed = ["title", "description"];
      if (_.difference(fields, allowed).length)
        return false; // tried to write to forbidden field
  
      // A good improvement would be to validate the type of the new
      // value of the field (and if a string, the length.) In the
      // future Meteor will have a schema system to makes that easier.
      return true;
    });
  },
  remove: function (userId, boxes) {
    return ! _.any(boxes, function (box) {
      // deny if not the owner, or if other people are going
      return box.owner !== userId;
    });
  }
});
*/

Meteor.methods({
  // options should include: title, description
  createBox: function (options) {
    options = options || {};
    if (! (typeof options.title === "string" && options.title.length &&
					 typeof options.x === "number" && typeof options.y === "number" &&
					 typeof options.width === "number" && typeof options.height === "number"))
      throw new Meteor.Error(400, "Required parameter missing");
    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Boxes.insert({
      owner: this.userId,
      title: options.title,
			x: options.x,
			y: options.y,
			width: options.width,
			height: options.height
    });				
  },
  createItem: function (options) {
    options = options || {};
    if (! (typeof options.score === "number" && options.title.length &&
					 typeof options.x === "number" && typeof options.y === "number" &&
					 typeof options.width === "number" && 
					 typeof options.height === "number"))
      throw new Meteor.Error(400, "Required parameter missing");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Items.insert({
      title: options.title,
			score: options.score,
      description: options.description,
			owner: this.userId,
			x: options.x,
			y: options.y,
			width: options.width,
			height: options.height			
    });
  }
});


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
		// We are looking just for intersection, not containment.
		if ((itemRight >= boxLeft) && (item.x <= boxRight) &&
			(itemBottom >= boxTop) && (item.y <= boxBottom)) {
			return true;				
		}
		else {
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
