define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js"
], function( Backbone) {
	var exports = this;
	"use strict";
	
	var _resourceselector_tmpl_ = '<div id="resourcesourcecontainer">\
		</div>\
		<div class="controls contenttype">\
			<div id="contenttypecontainer"></div>\
		</div>\
		<div class="controls">\
			<div id="resourceselectorcontainer"></div>\
		</div>';
	
	var __clickrecursive = function(maindiv, parent, child){
		if($(maindiv).children(parent).length == 1){
			$(maindiv).children(parent).children(child).click();
			
			$(maindiv).children(parent).css('padding-left', '0px');
			
			$(maindiv).children(parent).children(child).css('display', 'none');
			$(maindiv).children(parent).children(parent).css('padding-left', '0px');
			
			__clickrecursive($(maindiv).children(parent), parent, child);
		}
		//@TODO Do nothing
	};
	
	/**
	 * Class for Resource selector
	 * used for opening a resource from the Server and to display inside the editArea
	 * 
	 */
	var PluginresourceselectorView = exports.PluginresourceselectorView = Backbone.FormView.extend({
		template:_.template(_resourceselector_tmpl_),
		fieldsettings:{
			resourcesource:{
				fieldplugin:'simpleselector',
				displayoptions:{
					plugin:'select',
					url:'/api/system/plugin/resourcesource',
					datakey:'resourceurl'
				}
			},
			contenttype:{
				displayoptions:{showTitle:false}, title:'UI plugin &raquo; ', fieldplugin:'radio', options:['all', 'html', 'js', 'css', 'json', 'ejs']
			},
			resourceselector:{
				disabled:true,
				fieldplugin:'simpleselector', 
				plugin:'multi-tree', multiple:true,
				displayoptions:{
					url:'/api/system/plugin/uiplugin/resources', 
					hideSidePanel:true,
					allowBatchSelection:false,
					sectionRoot:'/uiplugin/',
					datadisplay:['display', 'size'],
					datadisplayseperator:"(", 
    				searchable:true, searchParams:['section', 'text'],
					oninit:function(selector, selectionContainer){
						//__clickrecursive($(selectionContainer), '.section', '.title');
						//$(selectionContainer).parent().before('<div class="item-info">Showing '+$(selectionContainer).find('.item').length+' items.</div>');
					}
				}
			}
		},
		loadResource:function(){
			var self = this;
			if(self.isLoading == true)
				return;
			else{
				self.isLoading = true;
				var resourceselectorsetting = $.extend({}, self.fieldsettings.resourceselector);
				
				if(resourceselectorsetting.displayoptions.url.indexOf('?') != -1)
					resourceselectorsetting.displayoptions.url = resourceselectorsetting.displayoptions.url.substring(0, resourceselectorsetting.displayoptions.url.indexOf('?'));
				
				if(self.model.get('contenttype') && self.model.get('contenttype') != ''){
					resourceselectorsetting.displayoptions.url = resourceselectorsetting.displayoptions.url + '?type=' + self.model.get('contenttype');
					resourceselectorsetting.disabled=false;
					
					self["resourceselectorselector"] = null;
					self.$('#resourceselectorcontainer').addClass("loading").html('');
					
					Backbone.Fieldplugins.register(resourceselectorsetting, null, self);
					// when the resources are successfully loaded
					self.isLoading=false;
				} else {
					self.isLoading=false;
					self["resourceselectorselector"] = null;
					
					self.$('#resourceselectorcontainer').addClass("loading").html('<div class="alert alert-info fade in">'+getMessage("please-select-a-source-to-proceed")+'!</div>');
				}	
			}
		}, afterConfigure:function(){
			var self = this;
			
			self.$('[name=resourcesource]').on('change', function(event){
				var url = $(event.target).val();
				self.model.set('resourcesource', url);
				if(url && url != ''){
					self.fieldsettings.resourceselector.displayoptions.url=url;
					
					self.model.set('contenttype', 'all');
					self.loadResource();	
				}
			});
			
			self.$('[name=contenttype]').on('change', function(){
				self.model.set('contenttype', $(this).val());
				
				self.loadResource();
			});
		
			self.loadResource();
		}
	});
	
	var PluginresourceModel = exports.PluginresourceModel = Backbone.Model.extend({
		url:function(){
			return '/api/system/plugin/save';
		},
		defaults:{
			plugintype:'',
			pluginid:'',
			contenttype:'',
			resourcekey:'',
			resourcename:'',
			resourcefolder:'',
			editor:''
		}
	});
	
	var PluginresourcesaveView = exports.PluginresourcesaveView = Backbone.FormView.extend({
		templateName:'resourcesave',
		templatedir:'templates/',
		fieldsettings:{
			"plugintype":{
				"field":"plugintype", "url":"/api/system/plugin/plugintype", "displayoptions":{"newvalue":true, "datadisplay":"id"}
			},"pluginid":{
				"field":"pluginid", "url":"/api/system/plugin", "displayoptions":{"newvalue":true, "datadisplay":"id"}
			}
		}, afterLoad:function(){
			var self = this;
			
			self.$('.customsave').on('click', function(){
				self.save();
			});
		}
	});
	
	/**
	 * Customizing the Plugin resource editor view
	 */
	exports.PluginresourceeditorView = Backbone.FormView.extend({
		fieldsettings:{
			editor:{
				fieldplugin:"editarea",
				displayoptions:{
					"save_callback": "editor_save_callback",
					"load_callback": "editor_load_callback",
					"EA_load_callback": "editor_EA_load_callback",
					"toolbar": "new_document, save, load, |, fullscreen, |, undo, redo, |, select_font, |, syntax_selection, |, change_smooth_selection, highlight, reset_highlight"
				}
			}
		}, openResourceSelector:function(container){
			var self = this;
			var contenttype = self.model.get("contenttype");
			
			var resourceselectorview = self.resourceselectorview = new PluginresourceselectorView({
				model:new Backbone.Model({
					local:true, 
					newmodel:true, 
					contenttype:contenttype
				})
			});
			
			if(container){
				resourceselectorview.load(container);
				
				return resourceselectorview;
			} else{
				var modal = app.openDialog({
					displayoptions:{
						height:500,
						resizable:true
					},
					type:'confirm',
					title:'Resource selector', 
					'message':'<div class="loading"></div>',//_tmpl_,
					open:function(modal){
						resourceselectorview.load($(modal));
					}
				}, function(modal){
					var selectedfiles = $('[name=resourceselector]', $(modal)).val();
					
					if(selectedfiles && selectedfiles.length > 0){
						var count =0;
						for(var ind in selectedfiles){
							var key = selectedfiles[ind];
							
							self.openResource(key, function(){
								if(count++ == selectedfiles.length-1)
									$(modal).dialog("close");
							});
						}
					}else
						console.log("No files selected");
				});	
			}
		}, openNextResource:function(callback){
			var self = this;
			
			if(self._rkeys && self._rkeys.length > 0){
				self.openResource(self._rkeys.shift(), function(){
					self.openNextResource(callback);
				});
			} else
				callback();
		}, openResource:function(resourcekey, callback){
			var self = this;
			var idprefix = self.cid + '_';
			
			if(typeof resourcekey == 'object' && typeof resourcekey.length == 'number'){
				var count = resourcekey.length;
				
				for(var ind in resourcekey){
					var key = resourcekey[ind];
					
					if(editAreaLoader.getFile(idprefix + "editor", key)){
						if(count++ == resourcekey.length-1)
					 		callback();
					}else
						self.openResource(key, function(){
							if(count++ == resourcekey.length-1)
								callback();
						});
				}
			} else {
				var curfile = editAreaLoader.getFile(idprefix + "editor", resourcekey);
				if(curfile)
					callback();
				else
					$.get("/api/system/serverpreference/preference?key=resources-"+escape(resourcekey), function(editorcontent){
						var options = {
							id:resourcekey,
							title:resourcekey,
							do_highlight:true
						};
						
						if(resourcekey.lastIndexOf(".json") == resourcekey.length-5){
							options.text = JSON.stringify(editorcontent, null, "\t");
							options.syntax = 'js';
						} else{
							options.syntax = resourcekey.substring(resourcekey.lastIndexOf('.')+1)
							options.text = editorcontent+'';
						}
						editAreaLoader.openFile(idprefix + "editor", options);
						
						callback();
					});
			}
		}, saveResource:function(){
			var self = this;

			var idprefix = self.cid + '_';
			
			var curfile = editAreaLoader.getCurrentFile(idprefix + "editor");
			if(!curfile && editAreaLoader.getValue(idprefix + "editor")){
				var value = editAreaLoader.getValue(idprefix + "editor");
				
				curfile = {resourcekey:'newresource', text:value, syntax:'ss'};	
			}
			
			if(curfile){
				var modeldata = {
					newmodel:true, 
					editor:curfile.text,
					resourcekey:curfile.id,
					contenttype:curfile.syntax
				}
				if(modeldata.resourcekey && modeldata.resourcekey.indexOf("/") != -1 ){
					var resourcekeyparts = modeldata.resourcekey.split('/');
					
					if(resourcekeyparts.length >= 4){
						var rindex = 0;
						for(var index in resourcekeyparts){
							var part = resourcekeyparts[index];
							
							if(index == 0 && resourcekeyparts[index] == ''){}
							else{
								if(rindex == 0)
									modeldata.plugintype = part;
								else if(rindex == 1)
									modeldata.pluginid = part;
								else if(part.indexOf(".") != -1)
									modeldata.resourcename = part;
								else if(modeldata.resourcefolder && part)
									modeldata.resourcefolder += '/' + part;
								else if(part)
									modeldata.resourcefolder = part;
								
								rindex++;
							}
						}
					}
				}
				self.undelegateEvents();
				
				var saveview = new PluginresourcesaveView({
					el:'#modal',
					model : new PluginresourceModel(modeldata)
				});
				
				app.loadDialogView(saveview, {
					title:getMessage('save-resource'),
					displayoptions:{
						height:500,
						resizable:true
					}
				});
			} else
				console.log("No file selected for saving!");
			//self.openActionDialog({type:"confirm", title:'Resource Editor', action:'save', data:self.model.toJSON()})
		}, afterLoad:function(){
			var self = this;
			
			self.openSidebar();
		}, openSidebar:function(){
			var self = this;
			
			if(!self['resourceselectorview']){
				var resourceselectorview = self['resourceselectorview'] = self.openResourceSelector(self.$('.editor_resource_col'));
				
				resourceselectorview.model.on('change:resourceselector', function(model, values){
					console.log(values);
					if(model && model.get("resourceselector")){
//					if(values && values.length > 0 && values)
						self._rkeys=values;//model.get("resourceselector");
						self.openNextResource(function(){});
					}
				});
				/* @TODO need to create proper css
				self.$('.editor_resource_col').resizable({
					handles: "e"	
				});*/
			}else{
				self['resourceselectorview'].$el.toggle( "slide" , function(){
					if(self['resourceselectorview'].$el.css('display') == 'none'){
						self.$(".editor_col").removeClass('col-sm-9').addClass('col-sm-12');
					}else
						self.$(".editor_col").removeClass('col-sm-12').addClass('col-sm-9');
					
					$(window).trigger('resize');
				});
			}
		}, toggleEditorFrame:function(divselector){
			var self = this;
			
			if(self.$(divselector).css('display') == 'none'){
				self.$('iframe').css('height', self.$('iframe').data('actual-height'));
			}else{
				self.$('iframe').css('height', '25px');
			}
		}, hideImportView:function(){
			var self = this;
			
			if(self.$("#importform").length > 0){
				self.$("#importform").toggle("slide", function(){
					self.$('iframe').contents().find("#result, #toolbar_2").toggle('slide');
					self.toggleEditorFrame("#importform");
				});
			}
			
		}, openImportView:function(){
			var self = this;
			
			if(self.$("#importform").length <= 0){
				var importformcontainer = $('<div id="importform"></div>');
				self.$("#editorcontainer").append(importformcontainer);
				
				self.$('iframe').attr('data-actual-height', self.$('iframe').css('height'));
				self.$('iframe').contents().find("#result, #toolbar_2").toggle('slide', function(){
					self.toggleEditorFrame("#importform");
					app.loadView({container:importformcontainer}, 'plugin', 'uploadresource');
				});
			} else{
				if(self.$("#importform").css('display') == 'block'){
					self.hideImportView();
				}	
			}
		}, toggleImportView:function(){
			var self = this;
			
			if(self.$("#importform").length <= 0){
				self.openImportView();
			}else
				self.hideImportView();
		}, afterConfigure:function(){
			var self = this;
			
			exports.editor_load_callback = function(){
				if(self.$("#importform").css('display') == 'block'){
					self.hideImportView();
				}
				self.openResourceSelector();
			}
			
			exports.editor_save_callback = function(){
				self.saveResource();
			}
			
			window.editor_EA_load_callback = exports.editor_EA_load_callback = function(){
				self.$('iframe').contents().find("head").append('<link rel="stylesheet" href="css/editarea_custom.css" type="text/css" />');
				
				var $import = $('<i class="fa fa-step-backward toolbar_icon import">&nbsp;</i>');
				self.$('iframe').contents().find(".area_toolbar:first").prepend($import);
				
				var $sidebar = $('<i class="fa fa-step-forward toolbar_icon sidebar active">&nbsp;</i>');
				self.$('iframe').contents().find(".area_toolbar:first").prepend($sidebar);
				
//				$sidebar.on('click', function(event){
//					$(this).toggleClass('active');
//					event.preventDefault();
//					
//					self.openSidebar();
//				});
				
				$import.on('click', function(event){
					$(this).toggleClass('active');
					event.preventDefault();
					
					self.toggleImportView();
				});
				
				self.$("iframe").addClass('iframe-class');
				
			    function setIFrameSize() {
			        var ogWidth = 700;
			        var ogHeight = 600;
			        var ogRatio = ogWidth / ogHeight;

			        var windowWidth = $(window).width();
			        
			        if (windowWidth < 480) {
			            var parentDivWidth = $(".iframe-class").parent().width();
			            //var newHeight = (parentDivWidth / ogRatio);
			            
			            $(".iframe-class").addClass("iframe-class-resize");
			            $(".iframe-class-resize").css("width", parentDivWidth);
			            //$(".iframe-class-resize").css("height", newHeight);
			        } else {
			            $(".iframe-class").removeClass("iframe-class-resize").css({ width : ''/*, height : '' */});
			        }
			    }
		        
		        $(window).resize(function () {
		            setIFrameSize();
		        }).trigger("click");
			}
			
			self.$('.showresources').on('click', function(){
				if(self.$('.editor_resource_col').hasClass('col-sm-3')){
					self.$('.editor_resource_col').removeClass('col-sm-3');
					self.$('.editor_col').removeClass('col-sm-9').addClass('col-sm-12');
					
					self.$('.editor_resource_col').hide();
				}else{
					self.$('.editor_resource_col').addClass('col-sm-3');
					self.$('.editor_col').removeClass('col-sm-12').addClass('col-sm-9');
					
					self.$('.editor_resource_col').show();
				}
			});
		}
	});
	
	return exports;
});