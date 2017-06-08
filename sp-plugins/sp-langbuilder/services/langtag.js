"use strict";
/*
 * Automatically generated by SP Control panel
 * CRUD service.js for including the various packages required.
 */

var simpleportal = require("simpleportal");

/**
 * API to handle language tags required for internationalization.
 * 
 * @class API langtag
 * @extends CRUDService
 * @module languagebuilder
 * 
 * @static
 */
var langtagService = new simpleportal.Service.CRUDService({
	collection:'langtag', 
	name:'langtag', modify:true,
	primaryKeyFields:["tag"],
	model:{
		tag:"",
		title:"",
		status:""
	},validation:{
		tag:"required"
	},configuration:{
		modelsettings:{
			status:{url:'/api/langtag/status', display:'display', id:'id', multiple:false}
		}
	}
});

/**
 * Api to get the active language tags
 *
 * @method GET /active
 * @param request http request
 * @param response http response
 * @param callback callback function
 */ 
langtagService.get('/active', function(request, response, callback){
	langtagService.search({status:'active'}, callback);
});

/*
 * Exporting the language tag service.
 */
module.exports = langtagService;