define( [
	"./utils/utils.js",
	"./utils/template.js",
	"./../../backbonejs/javascript/backbone-min.js",
	"./custom/fieldplugin.js"
], function( Utils, Templateloader, Backbone, Fieldplugins) {
	"use strict";
	
	window.utils = Backbone.Utils = Utils;
	
	/**
	 * Append any core functions to the Backbone ext here
	 */
	Backbone.Fieldplugins = Fieldplugins;
	Backbone.FormView = Backbone.View.extend({});
	
	Backbone.TemplateLoader=Templateloader;
	
	return Backbone;
});