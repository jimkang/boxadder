
if (Meteor.isClient) {
	
	Template.boxContainer.boxes = function () {
	  return Boxes.find({});
	};
	
	Template.boxContainer.showCreateDialog = function() {
		return Session.get("showCreateDialog");
	}
	
	// Sum up all the items in a box
	Template.box.sum = function()
	{
	};
	
	Template.box.calculateSum = function() {
		var total = 0;
		if (this.items !== undefined)
		{
			for (var i = 0; i < this.items.count; ++i)
			{
				total += this.items[i].score;
			}
		}
		return total;
	};
	
  Template.box.items = function () {
    return Items.find({}, {sort: {score: -1, name: 1}});
  };

  Template.box.selected_name = function () {
    var item = Items.findOne(Session.get("selected_item"));
    return item && item.name;
  };

  Template.item.selected = function () {
    return Session.equals("selected_item", this._id) ? "selected" : '';
  };
	
	Template.createDialog.events({
	  'click .save': function (event, template) {
	    var title = template.find(".title").value;
	    var description = template.find(".description").value;

	    if (title.length && description.length) {
	      Meteor.call('createBox', {
	        title: title,
	        description: description
	      }, 
				function (error, box) {
	        if (! error) {
						// TODO.
	        }
	      });
	      Session.set("showCreateDialog", false);
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

  Template.box.events({
    'click input.inc': function () {
      items.update(Session.get("selected_item"), {$inc: {score: 5}});
    }
  });

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

// On server startup, create some items if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Items.find().count() === 0) {
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        Items.insert({name: names[i], score: Math.floor(Math.random()*10)*5});
    }
  });
}
