define( [
//	"./../core.js",
	"./../model.js"
], function(//Backbone, 
		BackboneExtModel){
	"use strict";
	
	/**
	 * Backbone model for User profile
	 * url needs to be configured when used in a an application
	 */ 
	var Userprofile = BackboneExtModel.extend({
		urlRoot:'/profile',
		defaults:{
			id:'',
			userName:'',
			emailAddress:'',
			firstName: "",
			lastName: "",
			gender: "",
			dateOfBirth: "",
			country: "",
			city: "",
			emailAddress: "",
			phone: "",
			acceptTermsOfUse:false,
			loggedIn:false
		},
		validations:{
			emailAddress:'required,email', 
			password: 'required'
		}
	});
	
	BackboneExtModel.prototype.updatePreference = Userprofile.prototype.updatePreference = function(preference, callback){
		var url_ = '/profile/preference';
		
		var model = new BackboneExtModel({urlRoot:'/profile/preference', preference:preference});
		
		if(callback && callback.success)
			model.on('sync', callback.success);
		if(callback && callback.error)
			model.on('error', callback.error);
		
		model.save();
	};
	

	//@Special case, need to be replaced
	if(window){
		window.Userprofile=Userprofile;
		window.DefaultUserprofile=Userprofile;
	}
	
	var exports = {};
	exports.Userprofile=Userprofile;
	exports.DefaultUserprofile=Userprofile;
	return exports;
});