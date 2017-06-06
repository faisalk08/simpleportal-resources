define( [
	"./core.js",
	"./model.js",
	"./custom/model.js",
	"./collection.js",
	"./custom/view.js"
], function(
	Backbone,
	BackboneExtModel,
	BackboneExtModels,
	BackboneExtCollection,
	BackboneExtViews) {
	
	"use strict";
	
	Backbone.Model = BackboneExtModel;
	Backbone.Collection = BackboneExtCollection;
	
	_.extend(Backbone, BackboneExtViews);
	_.extend(Backbone, BackboneExtModels);
	
	return Backbone;
} );