define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js"
], function( Backbone) {
	var exports = this;//{};
	
	// change the google drive list view
	exports.GdrivelistView=Backbone.DetailsView.extend({
		templateName:'gdrive',
		templatedir:'templates/'
		//do nothing we will load a details page instead of list 
	});
	
	return exports;
});