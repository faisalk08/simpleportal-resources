define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js",
	"./spadmin.js",
	"./resourceeditor.js"
], function( Backbone) {
	var exports = this;
	
	var customurimappings = {
		plugin:{
			usage:{
				templateName:'usage.html', dialogview:true, viewmode:'usage', apiaction:'usage',
//				url:'/api/system/plugin', 
				templatedir:'/sp-admin/templates/'
			},tabs:[
			      {id:'uploadresource', title:'uploadresource', icon:'glyphicon glyphicon-wrench'},
			      {id:'resourceeditor', title:'resourceeditor', icon:'glyphicon glyphicon-wrench'}
			]
		}, pluginsource:{
			upload:{
				templatedir:'/sp-admin/templates/pluginsource/',
				dialogview:true,
				templateName:'uploadform'
			}
		}
	}
	
	if(exports && exports.customurimappings)
		exports.customurimappings = $.extend(true, exports.customurimappings, customurimappings);
	else
		exports.customurimappings = customurimappings;
	
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
	
//	exports.ServicelistenerformView = exports.ServicelistenereditView = Backbone.FormView.extend({
//		afterConfigure:function(){
//			var self = this;
//			console.log("after configure")
//			self.model.on("change:apiservice", function(){
//				self.changeEventUrl();
//			})
//		}, changeEventUrl:function(){
//			var self = this;
//			
//			if(self["eventsselector"])
//				//self["eventsselector"].options.url = ("/api/servicelistener/events", "/api/"+self.model.get("apiservice")+"/events");
//				self["eventsselector"].updateAjaxUrl(("/api/servicelistener/events", "/api/"+self.model.get("apiservice")+"/events"));
//			
////			console.log(self["eventsselector"].selector.select2({ajax:{url:self["eventsselector"].options.url}}));
////			console.log("api service changed");
//		}
//	});
	
	return exports;
});