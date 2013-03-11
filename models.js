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
      return userCanWriteToBoard(userId, box.board);
    });
  },
  remove: function (userId, boxes) {
    return ! _.any(boxes, function (box) {
      return !userCanWriteToBoard(userId, box.board);
    });
  }
});

Items.allow({
  insert: function (userId, item) {
    return false;
  },
  update: function (userId, items, fields, modifier) {
    return _.all(items, function (item) {
      return userCanWriteToBoard(userId, item.board);
    });
  },
  remove: function (userId, items) {
    return ! _.any(items, function (item) {
      return !userCanWriteToBoard(userId, item.board);
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
			usersThatCanWrite: options.usersThatCanWrite,
			urlId: boardURLId(options.name)
		});
	},
	
	deleteBoard: function(options) {
    options = options || {};
    if (!(typeof options.boardId === "string" && options.boardId.length)) {
      throw new Meteor.Error(400, "Required parameter missing");
		}
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");
		if (!userCanWriteToBoard(this.userId, options.boardId)) {
			throw new Meteor.Error(413, "You don't have permission to delete this board.");
		}
		
		// Remove associated items and boxes.
		Items.remove({ board: options.boardId });
		Boxes.remove({ board: options.boardId });
		
    return Boards.remove({ _id: options.boardId });
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
		if (!userCanWriteToBoard(this.userId, options.board)) {
			throw new Meteor.Error(413, "You don't have permission to change this board.");
		}
			
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

function boardURLId(boardName) {
	boardName = encodeURIComponent(boardName.replace(/ /g, '-'));
	var urlId = boardName;
	var appendedNumber = 1;
	while (Boards.find({boardURLId: urlId}).count() > 0) {
		urlId = boardName + "-" + appendedNumber;
	}
	return urlId;
}

if (Meteor.isServer) {	
	
	// Because this operation requires chained insert calls, this has to be 
	// done on the server. A client stub version of this would end up getting 
	// a temp _id for the new board, then using that to create new items and 
	// boxes. That temp _id would then become invalid after syncing with the 
	// server.
	// initPropDict is optional. It is a dict of properties to set on the board 
	// initially.
	
	function copyBoard(boardId, userId, initPropDict) {		
		// Create new board.
		var currentBoard = Boards.findOne({ _id: boardId });
		// Drop the id from the board and insert that as the new board.
		delete currentBoard["_id"];
		// Set the new board owner to the copying user.
		currentBoard.owner = userId;
		
		if (initPropDict) {
			for (propname in initPropDict) {
				currentBoard[propname] = initPropDict[propname];
			}
		}
		currentBoard.urlId = boardURLId(currentBoard.name);

		var newBoardId = Boards.insert(currentBoard); 
		if (newBoardId) {
			var allBoards = Boards.find().fetch();
		
			// Creates duplicates of the records that have different _ids, makes
			// changes specified in the recordTransformer function to them.
			function duplicateRecords(recordArray, collection, recordTransformer) {
				// Scrub the _ids out of the records.
				var idLessRecords = _.map(recordArray, function(record) {
					if ("_id" in record) {
						delete record["_id"];
					}
					var insertedId = collection.insert(recordTransformer(record));
				});
				
				// Note: Mongo bulk insert doesn't seem to be supported.
			}
		
			function updateBoardAndOwnerInRecord(record) {
				record.board = newBoardId;
				record.owner = userId;
				return record;
			};
		
			// Copy associated items and boxes.
			duplicateRecords(Items.find({ board: boardId }).fetch(), Items, 
				updateBoardAndOwnerInRecord);
			duplicateRecords(Boxes.find({ board: boardId }).fetch(), Boxes, 
				updateBoardAndOwnerInRecord);
								
			// console.log("Added boxes:", Boxes.find({board: newBoardId}).fetch());
		}
		return newBoardId;
	}
	
	Meteor.methods({
		copyBoard: function(options) {
		  options = options || {};
		
		  if (!(typeof options.boardId === "string" && options.boardId.length)) {
		    throw new Meteor.Error(400, "Required parameter (boardId) missing");
			}
		  if (! this.userId)
		    throw new Meteor.Error(403, "You must be logged in");
		
			return copyBoard(options.boardId, this.userId, options.initPropDict);
		}
	});
}
