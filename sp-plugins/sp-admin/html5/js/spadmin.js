define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js"
], function( Backbone) {
	var exports = this;
	"use strict";

//	var customurimappings = {
//		plugin:{
//			tabs:[
//			      {id:'uploadresource', title:'uploadresource', icon:'glyphicon glyphicon-wrench'},
//			      {id:'resourceeditor', title:'resourceeditor', icon:'glyphicon glyphicon-wrench'}
//			]
//		}
//	}
//	if(exports && exports.customurimappings)
//		exports.customurimappings = $.extend(true, exports.customurimappings, customurimappings);
//	else
//		exports.customurimappings = customurimappings;
		
	/**
	 * now extend the uri mappings for plugin
	 */ 
	exports.PluginlistView=Backbone.ListView.extend({
		afterInitialize:function(){
			var self = this;
			
//			self.options.usage = {templateName:'usage', uri:'usage'};
			
			self.options.tabs.push({id:'uploadresource', title:'uploadresource', icon:'glyphicon glyphicon-wrench'});
			self.options.tabs.push({id:'resourceeditor', title:'resourceeditor', icon:'glyphicon glyphicon-wrench'});
		}
	});
	
	/**
	 * now extend the uri mappings for plugin
	 */ 
	exports.ApiservicelistView=Backbone.ListView.extend({
		afterInitialize:function(){
			var self = this;
			
			self.options.tabs.push({id:'upload', title:'service-uploader', icon:'glyphicon glyphicon-wrench'});
		}
	});
	
	exports.ServerpreferenceformView=Backbone.FormView.extend({
		afterLoad : function(){
			var self = this;
			self.$('[name=preference]').attr('height', '500px');
			var idprefix = self.cid + '_';
			
			self.model.on('change:key', function(event){
				var key = self.model.get("key");
				$.get("/api/system/serverpreference/preference?key="+escape(key), function(preference){
					self.setValue(idprefix + 'preference', preference);
					
					if(key.lastIndexOf(".json") == key.length-5)
						editAreaLoader.setValue(idprefix + "preference", JSON.stringify(preference, null, "\t"));
					else
						editAreaLoader.setValue(idprefix + "preference", preference+'');
				});
			});
		}
	});
	
	exports.PlugindetailsView=Backbone.DetailsView.extend({
		afterConfigure:function(){
			var self = this;
			
			if(self.model.get('plugintype') != ''){
				if(self[self.model.get('plugintype') + "settingView"]){
					var plugintypesettingview = self[self.model.get('plugintype') + "settingView"];
					
					plugintypesettingview.$el.toggle("slide");
				}
			}
			
			if(self.$('.modelaction.usage').length <= 0)
				self.$('.modelaction:first').parent().append($('<a data-method="get" data-modelaction="usage" class="modelaction usage">Usage</a>'));
			
//			self.model.remoteGet('usage', {
//				success:function(model){
//					var _model = self.model.clone();
//					_model.set("usage", model.get('results'));
//					var pluginusageView = new PluginusageView({model:_model});
//					
//					self.$el.append('<div id="usage"></div>');
//					pluginusageView.load(self.$('#usage'));
//				}
//			});
		}
	});
	
	exports.PlugineditView=exports.PluginformView=Backbone.FormView.extend({
		afterLoad:function(){
			var self = this;
			
			self.model.on('change:title', function(){
				self.setValue('pluginid', Backbone.Utils.generateId(self.model.get('title')));
				self.model.trigger('change:pluginid');
			});
			
			self.model.on('change:pluginid', function(){
				if(self.model.get('plugintype') && /theme|webapp/.test(self.model.get('plugintype')))
					self[self.model.get('plugintype')+"settingView"].setValue(self.model.get('plugintype')+"uri", "/" + self.model.get('pluginid'));
			});
			
			self.model.on('change:plugintype', function(){
				if(self[self.model.get('plugintype')+"settingView"]){
					var plugintypesettingview = self[self.model.get('plugintype')+"settingView"];
					
					plugintypesettingview.$el.parents('.form-group.settings').toggle("slide");
				}
			});
			self.$('.form-group.settings').hide();
		}, afterConfigure:function(){
			var self = this;
			
			if(self.model.get('plugintype') != ''){
				self.setValue('plugintype', self.model.get('plugintype'));
				
				if(self[self.model.get('plugintype')+"settingView"]){
					var plugintypesettingview = self[self.model.get('plugintype')+"settingView"];
					
					plugintypesettingview.$el.parents('.form-group.settings').toggle("slide");
				}
			}
		}
	});
	
	exports.ApiserviceeditView=exports.ApiserviceformView=Backbone.FormView.extend({
		afterLoad:function(){
			var self = this;
			
			self.model.on('change:title', function(){
//				self.setValue('title', Backbone.Utils.capitaliseFirstLetter(self.model.get('name')));
				self.setValue('name', Backbone.Utils.lowercaseFirstLetter(Backbone.Utils.generateId(self.model.get('title'))));
				
				self.setValue('modelname', Backbone.Utils.capitaliseFirstLetter(Backbone.Utils.generateId(self.model.get('title'))));
				self.setValue('collection', Backbone.Utils.lowercaseFirstLetter(Backbone.Utils.generateId(self.model.get('title'))));
				
				if(self['configurationView']){
					self['configurationView'].setValue('uri', '#' +Backbone.Utils.generateId(self.model.get('title')));
				}
			});
		}
	});

	exports.ApiserviceserviceconfigurationView=ApiserviceserviceconfigurationView=Backbone.FormView.extend({
		templateName:'serviceconfigurationform',
		templatedir:'templates/',
		
		afterLoad:function(){
			var self =this;
			self.$('[name=primarykey]').change(function(){
				var primarykeys = $('.primarykey:checked').map(function(){
			        return this.value;
			    }).get();
				
				if(primarykeys && primarykeys.length > 0){
					self.$('.primarykeys').removeClass('disabled').addClass('setprimarykeys');
					self.$('.setprimarykeys').click(function(){
						self.savePrimaryKeys();
					});
				}else{
					self.$('.primarykeys').removeClass('setprimarykeys').addClass('disabled');
				}
			});
			
			self.$('.importdata').click(function(){
				self.importData();
			});
		}, importData:function(){
			var self = this;
			if(!self.$('.importdata').is('.disabled') && self.model.get('primaryKeyFields') && self.model.get('primaryKeyFields').length > 0){
				// we need to ask them to upload the data from the previously uploaded csv file!!
				console.log(self.model.get("importeroptions"));
				
				self.model.post('uploaddata', {
					data:{
						update_fields:['importeroptions'], 
						importeroptions:self.model.get("importeroptions")
					},
					success:function(model){
						app.openDialog({type:"confirm", message:'Successfully uploaded the file, do you want to visit the application'}, function(modal){
							$(modal).dialog("destroy").remove();
							
							window.open(window.location.origin+'/'+self.model.get('plugin')+'#'+self.model.get('name'), '_blank');
						});	
					},error:function(data){
						console.log(data);
						console.log(self.model);
					}
				});
			}
		}, 
		savePrimaryKeys:function(){
			var self = this;
			var primarykeys = $('.primarykey:checked').map(function(){
		        return this.value;
		    }).get();
			
			if(primarykeys && primarykeys.length > 0) {
				var modelfields = self.model.get('modelfields');
				for(var i in modelfields){
					var modelfield = modelfields[i];
					if($.inArray(modelfield.field, primarykeys) > -1){
						modelfield.primary=true;
					}
				}
				
				self.model.put('', {
					data:{
						update_fields:['modelfields'], 
						apiservice:{
							_id:self.model.get('_id'), 
							id:self.model.get('id'), 
							modelfields:modelfields
						}
					},
					success:function(model){
						if(model && model.get('primaryKeyFields') && model.get('primaryKeyFields').length > 0){
							self.model.set('primaryKeyFields', model.get('primaryKeyFields'));
							
							self.$('.importdata').removeClass('disabled');
						}
					},error:function(data){
						console.log(data);
						console.log(self.model);
					}
				});
			}
		}
	});
	
	exports.ApiserviceuploadView=Backbone.FormView.extend({
		afterLoad:function(){
			var self = this;

			this.model.url = function(){return "/api/system/apiservice/upload";};
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
						
						console.log(responsejson);
						if(responsejson.id){
							//app.navigate("#apiservice/"+responsejson.id, {trigger:true});
							
							// open a popup where we will show the form with the Service name and the fields found in the file
							responsejson.local=true;
							var apiServiceModel = new Apiservice(responsejson);
							var configurationView = new ApiserviceserviceconfigurationView({model:apiServiceModel});
							
							self.$('form').hide();
							
							configurationView.load(self.$('#apiservice_configuration'));
						}
//						app.openDialog({type:"confirm", message:'Successfully uploaded the file, do you want to visit the application'}, function(modal){
//							$(modal).dialog("destroy").remove();
//							
//							window.open(window.location.origin+'/'+plugin+'#'+servicename, '_blank');
//						});	
					}
					// now will show action dialogue
				});
			}
		}
	});

	/*
	 * custom view for showing the resource upload form
	 */
	var PluginsourceuploadView = exports.PluginsourceuploadView = Backbone.FormView.extend({
		templateName:'uploadform', 
		afterLoad:function(){
			var self = this;
			
			var dataid = self.pluginid||$('#resource-dropzone-form', $(self.el)).data('id');
			
			$('#resource-dropzone-form', $(self.el)).dropzone({
				url:'/api/system/pluginsource/'+dataid+ '/upload'
			});
		}
	});
	
	exports.PluginuploadresourceView=Backbone.FormView.extend({
		afterConfigure:function(){
			var self = this;
			
			self.model.on('change:plugintype', function(model, value){
				self["pluginidselector"]=null;
				self.$('#pluginidcontainer').html('<!-- -->');
				
				self.loadPlugin(value);
			});
			
			if(self['resourcebundledropzone']){
				self['resourcebundledropzone'].on("sending", function(file, xhr, data) {
					var modelobj = self.model.toJSON();
					
					for(var key in modelobj){
						data.append(key, modelobj[key]);
					}
				});
				
				self['resourcebundledropzone'].on("complete", function(file, data) {
					app.unblockUI(self.$el.parent());
					
					self['resourcebundledropzone'].removeFile(file);
					
					if(file.accepted && file.xhr.status == "200"){
						var responsejson = JSON.parse(file.xhr.responseText);
						
						app.openDialog({type:"confirm", message:'Successfully uploaded the file, do you want to see the file content using Resource editor?'}, function(modal){
							$(modal).dialog("destroy").remove();
							
							self.openResource(responsejson.file);
						});	
					}
					// now will show action dialogue
				});
			}
		}, loadPlugin:function(plugintype){
			var self = this;
			
			self.fieldsettings.pluginid.disabled=false;
			self.fieldsettings.pluginid.displayoptions.url = self.fieldsettings.pluginid.url + '?plugintype=' +plugintype;
			
			Backbone.Fieldplugins.register(self.fieldsettings.pluginid, null, self);
		}, openResource:function(resourcekey){
			if(app.mainView.options.uri == 'resourceeditor'){
				app.mainView.openResource(resourcekey, function(){
					console.log("Resource loaded");
				});
			}/*else
				window.open(window.location.origin+'/'+plugin+'#'+servicename, '_blank');*/
		}
	});
	
	exports.PluginsourcedetailsView=Backbone.DetailsView.extend({
		afterLoad:function(){},
		modelaction:{
			install:function(serveraction, self){
				if(self.model.get("authentication") && self.model.get("authentication").authtype == 'basic'){
					// let us ask for user name and password for subversion
					serveraction.type="prompt";
					serveraction.fieldsettings=[{field:'username'},{type:'password', field:'password'}];
					
					self.openActionDialog(serveraction, function(){
						
					});
				} else	
					self.openActionDialog(serveraction, self);
			},update:function(serveraction, self){
				if(self.model.get("authentication") && self.model.get("authentication").authtype == 'basic'){
					// let us ask for user name and password for subversion
					serveraction.type="prompt";
					serveraction.fieldsettings=[{field:'username'},{type:'password', field:'password'}];
					
					self.openActionDialog(serveraction, function(){
						
					});
				} else	
					self.openActionDialog(serveraction, self);
			},reinstall:function(serveraction, self){
				if(self.model.get("authentication") && self.model.get("authentication").authtype == 'basic'){
					// let us ask for user name and password for subversion
					serveraction.type="prompt";
					serveraction.fieldsettings=[{field:'username'},{type:'password', field:'password'}];
					
					self.openActionDialog(serveraction, function(){
						
					});
				} else	
					self.openActionDialog(serveraction, self);
			}
		}
	});
	return exports;
});