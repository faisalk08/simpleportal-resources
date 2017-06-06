define( [
 	"./../../core.js",
	"./form.js"
], function(Backbone, BackboneFormView){
	"use strict";
	
	/**
	 * Form with functions to handle the form submit
	 */
	var BackupView = BackboneFormView.extend({
		viewmode:"backup",
		afterLoad:function(){
			var self = this;

			Backbone.Fieldplugins.register({"field":"apiservicebundle", "fieldplugin":"dropzone"}, null, self);
			Backbone.Fieldplugins.register({"field":"csvdelimiter", "options":["|", ",", ";", ":"]}, null, self);
			Backbone.Fieldplugins.register({"field":"datatype", "fieldplugin":"radio", "options":["json", "xml", "csv"], "change":{"csv":{"csvquote":"dependant", "csvdelimiter":"dependant"}}}, null, self);
			
			self.model.url = function(){
				return "/api/system/apiservice/upload";
			};
			self.model.set('servicename', self.$('[name=servicename]').val())
		}, afterConfigure:function(){
			var self = this;
			
			if(self['apiservicebundledropzone']){
				self['apiservicebundledropzone'].url = "/api/system/apiservice/upload";
				
				self['apiservicebundledropzone'].on("sending", function(file, xhr, data) {
					var modelobj = self.model.toJSON();
					
					for(var key in modelobj){
						data.append(key, modelobj[key]);
					}
					app.blockUI(self.$el);
					return false;
				});
				
				self['apiservicebundledropzone'].on("complete", function(file, data) {
					app.unblockUI(self.$el);
					
					self['apiservicebundledropzone'].removeFile(file);
					
					if(file.accepted && file.xhr.status == "200"){
						var responsejson = JSON.parse(file.xhr.responseText);
						
						var servicename = responsejson.name;
						var plugin = responsejson.plugin;
						
						app.openDialog({type:"confirm", message:'Successfully uploaded the file, do you want to visit the application'}, function(modal){
							$(modal).dialog("destroy").remove();
							app.navigate('#'+servicename, {trigger:true});
							//window.open(window.location.origin + '/' + plugin + '#'+servicename, '_blank');
						});
					}
					// now will show action dialogue
				});
			}
		}
	});
	
	return BackupView;
});