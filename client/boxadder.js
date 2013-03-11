Template.boardControlBar.events({
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
							return (num.y > memo.y) ? num : memo; 
						}, 
						items[0]);
						
				nextItemY = bottomMostItem.y;
			}
		}

		// TODO: Put them somewhere other than 0, 0.
	  var nextItemX = 0;
	  var nextItemY = 0;
				
		console.log("Final nextItemY: " + nextItemY);
    Meteor.call('createItem', {
      title: "New Item",
			score: 0,
			x: nextItemX, y: nextItemY, width: 240, height: 44,
			board: Session.get("currentBoard")
    }, 
		function (error, itemId) {
      if (error) {						
				triggerErrorAlert(error, 2000);
			}
			else {
				BoardZoomer.panToCenterOnRect(Items.findOne(itemId));
			}
    });
				
		Session.set("nextItemX", nextItemX);
		Session.set("nextItemY", nextItemY + spaceBetweenItems);
	},
  'click .addNewBox': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create boxes
      return;

		// TODO: Put them somewhere other than 0, 0.
	  var nextBoxX = 0;
	  var nextBoxY = 0;
		if (nextBoxX === undefined) {
			nextBoxX = 0;
		}
		if (nextBoxY === undefined) {
			nextBoxY = 0;
		}
				
    Meteor.call('createBox', {
      title: "New Box",
			x: nextBoxX, y: nextBoxY, width: 320, height: 320, 
			board: Session.get("currentBoard")
    }, 
		function (error, boxId) {
      if (!error) {						
				makeSureItemsAreInFrontOfBoxes($('svg')[0]);
				BoardZoomer.panToCenterOnRect(Boxes.findOne(boxId));
      }
			else {
				triggerErrorAlert(error, 2000);
			}
    });
				
		// TODO: Wrap to next row at some point.
		Session.set("nextBoxX", nextBoxX + 64);
		Session.set("nextBoxY", nextBoxY + 64);
  },
  'click .zoomToFit': function (event, template) {
		var rects = [];
		
		var items = Items.find().fetch();
		var boxes = Boxes.find().fetch();
		if (items) { rects = rects.concat(items); }
		if (boxes) { rects = rects.concat(boxes); }
		
		BoardZoomer.zoomToFitAllRects(rects);
	},
	'click #expandExplanation': function(event, template) {
		Session.set('showExplanation', true);
	},
	'click #closeExplanation': function(event, template) {
		Session.set('showExplanation', false);
	}
});	

Template.boardControlBar.boardIsWritable = function() {
	return boardIsWritable();
};

Template.boardControlBar.currentBoardNotSet = function() {
	return !Session.get('currentBoard');
};

Template.boardControlBar.currentBoardIsSet = function() {
	return Session.get('currentBoard');
};

Template.boardControlBar.showExplanation = function() {
	return Session.get('showExplanation');
}

// TODO: Find how to share a helper among the templates.

	
Template.boardAdminSection.events({
  'click .addBoard': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create boards
      return;

		  Session.set("showNewBoardDialog", true);
  },
  'click .copyBoard': function (event, template) {
    if (! Meteor.userId()) // must be logged in to copy boards
      return;

	  Session.set("showCopyBoardDialog", true);
  },
  'click .cancel': function () {
    Session.set("showNewBoardDialog", false);
    Session.set("showCopyBoardDialog", false);
  },
  'click .save': function (event, template) {
    var name = template.find(".newBoardName").value;
    var publiclyReadable = template.find(".publiclyReadable").checked;
    var publiclyWritable = template.find(".publiclyWritable").checked;
		console.log(name, publiclyReadable, publiclyWritable);
				
		if (name.length) {
		  Meteor.call('createBoard', {
		    name: name,
		    publiclyReadable: publiclyReadable,
		    publiclyWritable: publiclyWritable,
		    usersThatCanRead: [ Meteor.userId() ],
		    usersThatCanWrite: [ Meteor.userId() ]
		  }, 
			function (error, boardId) {
		    if (!error) {
					updateBoard(boardId);
		    }
		  });
		  Session.set("showNewBoardDialog", false);
		} 
		else {
		  Session.set("createError", "It needs a name.");
		}
  },
  'click .copy': function (event, template) {
    if (! Meteor.userId()) // must be logged in to copy boards
      return;
			
		var initPropDict = {};
		var name = template.find(".copiedBoardName").value;
		if (name) {
			initPropDict.name = name;
		}
    initPropDict.publiclyReadable = template.find("#copyIsPubliclyReadable").checked;
    initPropDict.publiclyWritable = template.find("#copyIsPubliclyWritable").checked;
		
    Meteor.call('copyBoard', 
		{ boardId: Session.get("currentBoard"), initPropDict: initPropDict},
		function (error, newBoardId) {
      if (error) {
				triggerErrorAlert(error, 2000);
			}
			else {
				updateBoard(newBoardId);
			}
    });
	}	
});	

// Defining this Handlebars helper method with a reference to the Session 
// variable showNewBoardDialog in it makes Meteor reevaluate the addBoard
// template when that Session variable changes.
Template.boardAdminSection.showNewBoardDialog = function () {
  return Session.get("showNewBoardDialog");
};

Template.boardAdminSection.showCopyBoardDialog = function () {
  return Session.get("showCopyBoardDialog");
};

Template.boardAdminSection.signedIn = function() {
	return Meteor.userId();
};

Template.newBoardDialog.error = function () {
  return Session.get("createError");
};

Template.copyBoardDialog.error = function () {
  return Session.get("createError");
};

Template.copyBoardDialog.checkPubliclyReadable = function () {
	var isPubliclyReadable = false;
	var boardToCopy = getCurrentBoard();
	if (boardToCopy) {
		isPubliclyReadable = boardToCopy.publiclyReadable;
	}
	// Check inputs must omit the checked attribute entirely if they are to be 
	// unchecked – setting it to false or something won't do the trick.
	return isPubliclyReadable ? "checked='checked'" : "";
};

Template.copyBoardDialog.checkPubliclyWritable = function () {
	var isPubliclyWritable = false;
	var boardToCopy = getCurrentBoard();
	if (boardToCopy) {
		isPubliclyWritable = boardToCopy.publiclyWritable;
	}
	return isPubliclyWritable ? "checked='checked'" : "";
};

Template.copyBoardDialog.suggestedCopyName = function () {
	var name = "Board Name";
	var boardToCopy = getCurrentBoard();
	if (boardToCopy) {
		name = "Copy of "+ boardToCopy.name;
	}
	return name;
};

Template.boardList.boards = function() {
	return Boards.find();
}

Template.boardList.selectedClass = function() {
	var cssClass = "";
	if (Session.get("currentBoard") === this._id) {
		cssClass = "selected";
	}
	return cssClass;
}

Template.boardList.events({
	'click .boardListItem': function(evt) {
		updateBoard(this._id);
	}
});

Template.boardMetadataSection.visibilitySummary = function() {
	// TODO: Finer-grained permissions.
	return this.publiclyReadable ? "Public" : "Private";
}

Template.boardMetadataSection.visibilityCssClass = function() {	
	return this.publiclyReadable ? 
	"public metadataLabel" : "private metadataLabel";
}

Template.boardMetadataSection.writabilitySummary = function() {
	return (this.publiclyWritable || this.owner === Meteor.userId()) ?
	"Changeable by you" : "Not changeable by you";	
}

Template.boardMetadataSection.writabilityCssClass = function() {
	return (this.publiclyWritable || this.owner === Meteor.userId()) ?
	"metadataLabel writable" : "metadataLabel read-only";	
}

Template.boardMetadataSection.URLToBoard = function() {
	var board = getCurrentBoard();
	var url = location.protocol + "//" + location.host;
	if (board && board.urlId) {
		url += ("/" + board.urlId);
	}
	return url;
}

// TODO: Find how to share a helper among the templates.
Template.boardMetadataSection.currentBoardIsSet = function() {
	return Session.get('currentBoard');
};

Template.boardMetadataSection.board = function() {
	return Boards.findOne(Session.get('currentBoard'));
}

Template.boardMetadataSection.error = function () {
  return Session.get("createError");
};

Template.boardMetadataSection.loadingMessage = function () {
  return Session.get("loadingMessage");
};

Template.deleteBoard.board = function() {
	return Boards.findOne(Session.get('currentBoard'));
}

Template.deleteBoard.canDeleteCurrentBoard = function() {
	return boardIsWritable();
};

Template.deleteBoard.events({
  'click .delete': function (event, template) {				
		var boardId = Session.get("currentBoard");
		console.log("boardId", boardId);
		if (boardId.length) {
		  Meteor.call('deleteBoard', { boardId: boardId }, 
			function (error, board) {
		    if (error) {
					triggerErrorAlert(error, 2000);
				}
				else {
		      Session.set("currentBoard", null);
		    }
		  });
		} 
  }
});

Template.board.widthAndHeightAttrs = function() {
	var width = 768;
	if (window.innerWidth < 480) {
		width = 240;
	}
	else if (window.innerWidth < 1024) {
		width = 640;
	}
	var height = width;

	return 'width=' + width + ' height=' + height + '';
}

/* Template utils */

function triggerErrorAlert(error, duration) {
	Session.set("createError", error.reason);
	setTimeout(function() { Session.set("createError", null); }, duration);
}

function boardIsWritable() {
	var canWrite = false;
	var boardId = Session.get('currentBoard');
	if (boardId) {
		canWrite = userCanWriteToBoard(Meteor.userId(), boardId);
	}
	return canWrite;	
}

function getCurrentBoard() {
	var board = null;
	var boardId = Session.get("currentBoard");
	if (boardId) {
		 board = Boards.findOne(boardId);
	}
	return board;
}

// previousBoardId can be null if there is none.
function syncURLToCurrentBoard(previousBoardId) {
	var newBoard = getCurrentBoard();
	// location.pathname starts with a /, so drop that before comparing.
	if (newBoard.urlId && newBoard.urlId != location.pathname.substr(1)) {
		history.pushState(previousBoardId, "Boxadder", newBoard.urlId);			
	}	
}

// Updates the currentBoard session member while updating the URL.
function updateBoard(newBoardId) {
	var oldBoardId = Session.get("currentBoard");
	// Set the current board. Should cause a reload of the board.
	Session.set("currentBoard", newBoardId);
	syncURLToCurrentBoard(oldBoardId);	
}
