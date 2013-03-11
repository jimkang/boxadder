var Router = Backbone.Router.extend({
  routes: {
    ":board": "main", // http://your_domain/someid
  },

  main: function(urlIdToLoadOnRender) {
		Session.set("urlIdToLoadOnRender", urlIdToLoadOnRender);
  }
});

var app = new Router;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
