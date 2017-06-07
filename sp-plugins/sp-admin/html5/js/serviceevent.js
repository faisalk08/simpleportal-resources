define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js"
], function( Backbone) {
	var exports = this;//{};
	
	exports.ServicelistenerformView = exports.ServicelistenereditView = Backbone.FormView.extend({
		afterConfigure:function(){
			var self = this;
			
			self.model.on("change:apiservice", function(){
				self.changeEventUrl();
			})
		}, changeEventUrl:function(){
			var self = this;
		}
	});
	
	return exports;
});