define( [
 	"/uiplugin/backbone-ext/src/backbone-ext.js",
	"./gdrive.js"
], function( Backbone) {
	var exports = this;//{};
	
	exports.DashboardView = Backbone.DashboardView.extend({
		afterInitialize:function(){
			var self = this;
			
			var dashboardarguments = {dashboard:true};
			if(self.options.uriarguments && self.options.uriarguments.length > 2){ 
				self.options.uri=self.options.uri  +'/' + self.options.uriarguments[1];
				self.options.dashboardsourceurl = '/api/dashboardservice/'+ self.options.uriarguments[1];
			} else{
				self.options.dashboardsourceurl = Backbone.Utils.appendToUrl(('/api/displayfilter/search'||defaulturl), dashboardarguments);
			}
		}, dashboardsource:function(defaulturl){
			var self = this;
			
			return self.options.dashboardsourceurl||defaulturl;
		}
	});
	
	return exports;
});