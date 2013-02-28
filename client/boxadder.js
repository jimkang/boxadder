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
							console.log(memo);
							return (num.y > memo.y) ? num : memo; 
						}, 
						items[0]);
						
				nextItemY = bottomMostItem.y;
				console.log(nextItemY);
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
		function (error, item) {
      if (error) {						
				triggerErrorAlert(error, 2000);
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
		function (error, box) {
      if (!error) {						
				makeSureItemsAreInFrontOfBoxes($('svg')[0]);
      }
			else {
				triggerErrorAlert(error, 2000);
			}
    });
				
		// TODO: Wrap to next row at some point.
		Session.set("nextBoxX", nextBoxX + 64);
		Session.set("nextBoxY", nextBoxY + 64);
  }	
});	

Template.boardControlBar.boardIsWritable = function() {
	return boardIsWritable();
};

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
			
	    Meteor.call('copyBoard', { boardId: Session.get("currentBoard") },
			function (error, newBoardId) {
	      if (error) {						
					triggerErrorAlert(error, 2000);
				}
				else {
					console.log("Setting currentBoard to:", newBoardId);
					Session.set("currentBoard", newBoardId);
				}
	    });
  },
  'click .cancel': function () {
    Session.set("showNewBoardDialog", false);
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
			function (error, board) {
		    if (!error) {
		      Session.set("currentBoard", board._id);
					// Should cause a reload of the board.
		    }
		  });
		  Session.set("showNewBoardDialog", false);
		} 
		else {
		  Session.set("createError", "It needs a name.");
		}
  }
});	

// Defining this Handlebars helper method with a reference to the Session 
// variable showNewBoardDialog in it makes Meteor reevaluate the addBoard
// template when that Session variable changes.
Template.boardAdminSection.showNewBoardDialog = function () {
  return Session.get("showNewBoardDialog");
};

Template.boardAdminSection.signedIn = function() {
	return Meteor.userId();
};

Template.newBoardDialog.error = function () {
  return Session.get("createError");
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
		// Set the current board.
		Session.set("currentBoard", this._id);
	}
});

Template.boardMetadataSection.visibilitySummary = function() {
	// TODO: Finer-grained permissions.
	return this.publiclyReadable ? "Public" : "Private";
}

Template.boardMetadataSection.visibilityCssClass = function() {	
	return this.publiclyReadable ? 
	"public visibility-label" : "private visibility-label";
}

Template.boardMetadataSection.writabilitySummary = function() {
	return (this.publiclyWritable || this.owner === Meteor.userId()) ?
	"Changeable by you" : "Not changeable by you";	
}

Template.boardMetadataSection.writabilityCssClass = function() {
	return (this.publiclyWritable || this.owner === Meteor.userId()) ?
	"writability-label writable" : "writability-label read-only";	
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
