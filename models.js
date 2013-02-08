// Set up a collection to contain item information. On the server,
// it is backed by a MongoDB collection named "items".

Items = new Meteor.Collection("items");
Boxes = new Meteor.Collection("boxes");

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


Meteor.methods({
  // options should include: title, description
  createBox: function (options) {
    options = options || {};
    if (! (typeof options.title === "string" && options.title.length &&
           typeof options.description === "string" &&
           options.description.length &&
					 typeof options.x === "number" && typeof options.y === "number" &&
					 typeof options.width === "number" && typeof options.height === "number"))
      throw new Meteor.Error(400, "Required parameter missing");
    if (options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (options.description.length > 1000)
      throw new Meteor.Error(413, "Description too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    return Boxes.insert({
      owner: this.userId,
      title: options.title,
      description: options.description,
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
