define( [
	"./backbone-ext-view.js",
	"./router.js"
], function(
	BackboneExt,
	BackboneExtRouter) {
	"use strict";
		
	BackboneExt.Router = BackboneExtRouter;
	
	window.DefaultBackbone = window.Backbone;
	
	return ( window.Backbone = BackboneExt );
} );