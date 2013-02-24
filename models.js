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
	Meteor.publish("boards", function() { 
		console.log("this.userId", this.userId);
		// TODO: Find other non-public boards that user can read.
		return Boards.find(
			{ $or: [{ publiclyReadable: true }, { owner: this.userId } ]}
		);
	});
}

Boxes.allow({
  insert: function (userId, box) {
    return false; // no cowboy inserts -- use createBox method
  },
  update: function (userId, boxes, fields, modifier) {
    return _.all(boxes, function (box) {
      if (userId !== box.owner)
        return false; // not the owner  
  
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

Meteor.methods({
	createBoard: function(options) {
    options = options || {};
    if (!(typeof options.name === "string" && options.name.length &&
				 typeof options.publiclyReadable === "boolean" &&
				 typeof options.publiclyWritable === "boolean" &&
				 Array.isArray(options.usersThatCanRead) && 
				 (options.usersThatCanRead.length > 0) &&
				 Array.isArray(options.usersThatCanWrite) && 
				 (options.usersThatCanWrite.length > 0))) {
      throw new Meteor.Error(400, "Required parameter missing");
		}
    if (options.name.length > 100)
      throw new Meteor.Error(413, "Name too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Boards.insert({
      owner: this.userId,
			name: options.name, 
			publiclyReadable: options.publiclyReadable, 
			publiclyWritable: options.publiclyWritable, 
			usersThatCanRead: options.usersThatCanRead, 
			usersThatCanWrite: options.usersThatCanWrite
		});
	},

  createBox: function (options) {
    options = options || {};
    if (! (typeof options.title === "string" && options.title.length &&
					 typeof options.x === "number" && typeof options.y === "number" &&
					 typeof options.width === "number" && typeof options.height === "number" &&
					 typeof options.board === "string" && options.board.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");
		if (!userCanWriteToBoard(this.userId, options.board)) {
			throw new Meteor.Error(413, "You don't have permission to change this board.");
		}

    return Boxes.insert({
      owner: this.userId,
			board: options.board,
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
					 typeof options.height === "number" &&
					 typeof options.board === "string" && options.board.length))
      throw new Meteor.Error(400, "Required parameter missing");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Items.insert({
			board: options.board,
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

function userCanWriteToBoard(userId, boardId) {
	var canWrite = false;
	var board = Boards.findOne(boardId);
	if (board) {
		canWrite = (board.publiclyWritable || board.owner == userId);			
	}
	return canWrite;
}

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
