define( [
 	"./../../core.js",
	"./../../view.js",
	"./../../model.js",
	"./../../collection.js"
], function(Backbone, BackboneExtView, BackboneExtModel, BackboneExtCollection){
	"use strict";
		
	var CustomBackboneView = BackboneExtView.extend({
		events:{
			"click .back" 	: function(){
				Backbone.history.history.back();
			},
			"click .modelaction":"modelAction"
		}, modelAction:function(event) {
			event.preventDefault();
			
			var self = this;
			var pluginid;
			
			var $target = $(event.target);
			
			if(!$target.is('.modelaction')){
				$target=$target.parents('.modelaction:first');
			}
			var dataprops = $target.data();
			var modelaction = $target.data('modelaction');
			if(modelaction == 'edit')
				modelaction ='form';
			
			var modelactionprops = $target.data();
			
			if(self.$el.hasClass("subview") && modelaction == 'remove'){
				var parenttr =  $target.parents('tr:first');
				if($target.parent().is("li"))
					parenttr =  $target.parents('li:first');
				
				if(parenttr.is('.child')){
					parenttr=parenttr.prev()
				}
				var dataid = parenttr.data('id');
				if(!dataid){
					dataid = parenttr.find("td:first").html().trim();
				}
				var subviewid = self.$el.data("subview-id");
				
				var results = self.model.get("results");
				var remresults = _.without(results, dataid);
				
				self.model.set("results", remresults);
				self.model.trigger("add");
				
				return true;
			} else if(self.model.objecttype == 'collection' || self.model instanceof Backbone.Collection || self.model.models) {
				var parenttr =  $target.parents('tr:first');
				if($target.parent().is("li"))
					parenttr =  $target.parents('li:first');
				
				if(parenttr.is('.child')){
					parenttr = parenttr.prev()
				} else if (!parenttr.data('id'))
					parenttr = parenttr.parents('tr:first');
				
				var dataid = parenttr.data('id');
				
				if(self.options.uri && self.options[modelaction]){
					if(dataid && modelaction == 'details'){
						app.navigate(self.options.uri + '/' + dataid, {trigger:true});
					} else if(dataid && modelaction == 'form'){
						app.navigate(self.options.uri + '/edit/' + dataid, {trigger:true});
					}
				} else if (modelaction == 'remove'){
					if(dataid){
						var model = self.model.get(dataid);
						
						if(model)
							self.openActionDialog($.extend(dataprops, {type:"confirm", title:model.get('id')||model.get('_id')||model['id'], action:modelaction, model:model}), function(error){
								if(!error)
									parenttr.remove();
							});	
//						else
//							console.log(model);
					}
				}else {
					var actionfound;
					if(self.options.action)
						actionfound = self.options.action.filter(function(val){return val.action == modelaction||val.url == modelaction});
					
					if(actionfound && actionfound.length == 1){
						var serveraction = actionfound[0];
						var actionurl = serveraction.url||serveraction.action;
						if(serveraction.url && serveraction.action){
							actionurl = serveraction.url + '/' + dataid + '/' + serveraction.action;
						} else if(serveraction.action)
							actionurl = serveraction.action;
						
						if(serveraction.action && self.modelaction && self.modelaction[serveraction.action]){
							self.modelaction[serveraction.action]($.extend(dataprops, {actionmethod:serveraction.method, dataid:dataid, type:"confirm", title:dataid, action:actionurl}), self);
						} else
							self.openActionDialog($.extend(dataprops, {actionmethod:serveraction.method, type:"confirm", dataid:dataid, title:dataid, action:actionurl}));
					} else if(modelaction && self.modelaction && self.modelaction[modelaction]){
						self.modelaction[modelaction]($.extend(dataprops, {actionmethod:modelactionprops.method||"get", dataid:dataid, title:modelaction, action:modelaction}), self);
					} 
				}
			} else if((self.model.objecttype == "model" || self.model instanceof Backbone.Model) && (self.model.get('id')|| self.model.get('_id'))){
				var modelid = self.model.get('id') || self.model.get('_id');
				var modeltitle = self.model.get('title') || self.model.get('name') ||modelid;
				
				var actionfound;
				if(self.options.action)
					actionfound = self.options.action.filter(function(val){return val.action == modelaction||val.url == modelaction});
				
				if(actionfound && actionfound.length == 1){
					var serveraction = actionfound[0];
					var actionurl = serveraction.url;
					
					if(serveraction.url && serveraction.action){
						actionurl = serveraction.url + '/' + modelid + '/' + serveraction.action;
					} else if(serveraction.action)
						actionurl = serveraction.action;
					
					var actionkey = serveraction.action || serveraction.url;
					if(actionkey && self.modelaction && self.modelaction[actionkey]){
						self.modelaction[actionkey]($.extend(dataprops, {actionmethod:serveraction.method, type:"confirm", title:modeltitle, action:actionurl}), self);
					} else
						self.openActionDialog($.extend(dataprops, {actionmethod:serveraction.method, type:"confirm", title:modeltitle, action:actionurl}));
				}else if(modelaction == "form"){
					app.navigate(self.options.uri + '/edit/' + modelid, {trigger:true});
				}else
					self.openActionDialog($.extend(dataprops, {type:"confirm", title:modeltitle, action:modelaction}));
				return true;
			} else {
				if(modelaction){
					var actionfound;
					if(self.options.action)
						actionfound = self.options.action.filter(function(val){return val.action == modelaction||val.url == modelaction});
					
					if(actionfound && actionfound.length == 1){
						var serveraction = actionfound[0];
							
						self.openActionDialog($.extend(dataprops, {actionmethod:actionfound.method, type:"confirm", title:self.model.get('id'), action:serveraction.url||modelaction}));
					} else
						return false;
				} else{
					self.log("modelAction", "Un defined model action");
					return false;
				}
			}
			
			return false;
		}, openDialog:function(actionprops, callback){
			var modalprops = _.extend({
				message : 'Are you sure to run '+ actionprops.action +' action on the selected item ?'
			}, actionprops); 
			
			app.openDialog(modalprops, callback);
		}, openActionDialog:function(actionprops, callback){
			var self = this;
			function dialogSuccess(modal, data){
				if(actionprops.action == "remove"){
					var model = self.model;
					if(actionprops.model)
						model = actionprops.model;
					
					model.destroy(
						{
							success : function(model, response){
								if(callback)
									callback();
								else{
									app.showMessage('success', {
							    		title:actionprops.title + ' - '+ actionprops.action,
							    		message:actionprops.action+" successfully for the "+actionprops.title
							    	});
								}
							}, error : function(data, error){
								if(error&&error.responseJSON)
									app.showMessage('error', {
							    		title:actionprops.action + ' encountered some error',
							    		message:error.responseJSON.exception
							    	});
								
								if(callback)
									callback(error);
							}
						}
					);
				} else if(actionprops.actionmethod == "get"){
					$.get(actionprops.url||actionprops.action, function(data){
						self.openDialog({message:data+''});
					});
				} else if(actionprops.action||actionprops.url){
					if(self.model){
						if(actionprops.actionmethod == "get" || actionprops.method == "get"){
							var view = app.getView({}, ['plugin', 'usage', self.model.id]);
							self.$el.append("<div id='"+actionprops.modelaction+"_div' ></div>");
							
							view.load(self.$("#"+actionprops.modelaction+"_div"));
						}else if(self.model.post) {
							self.model.post(actionprops.url||actionprops.action,
								{
									data:data||actionprops.data,
									success : function(model, response){
										if(callback)
											callback();
										else {
											app.showMessage('success', {
									    		title:actionprops.title + ' - '+ actionprops.action,
									    		message: response && response.stdout ? response.stdout : actionprops.action + " successfully for the " + actionprops.title
									    	});
										}
									}, error : function(data, error){
										if(error && error.responseJSON)
											app.showMessage('error', {
									    		title:actionprops.action + ' encountered some error',
									    		message:error.responseJSON.exception
									    	});
										
										if(callback)
											callback(error);
									}
								}
							);	
						}
					}else{
						$.ajax(
							actionprops.url||actionprops.action,
							{
								method:'POST',
								data:data||actionprops.data,
								success:function(response) {
									if(callback)
										callback();
									else {
										app.showMessage('success', {
								    		title:actionprops.title + ' - '+ actionprops.action,
								    		message: response && response.stdout ? response.stdout : actionprops.action + " successfully for the " + actionprops.title
								    	});
									}
								}, error : function(data, error){
									if(error && error.responseJSON)
										app.showMessage('error', {
								    		title:actionprops.action + ' encountered some error',
								    		message:error.responseJSON.exception
								    	});
									
									if(callback)
										callback(error);
								}
							}
						)
					}
				}
				$(modal).dialog("close");
			}
			
			self.openDialog(actionprops, dialogSuccess);
		},
		openSubmodelView:function(field, options){
			var self = this;
			
			if(field && self.options.fieldsettings && self.options.fieldsettings[field]){
				var fieldsetting = self.options.fieldsettings[field];
				fieldsetting.field = field;
				
				var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
				var parenturimapping = _.extend({}, parenturimapping_);
				var subservicename = field;
				
				if( parenturimapping.field != subservicename )
					subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);

				parenturimapping.field = subservicename;
				parenturimapping.uri = subservicename;
				
				var parenturi;
				if(self.options.uri){
					parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
				}
				self.loadSubModelView(fieldsetting, parenturimapping, true, options);
			}else
				self.log("openSubmodelView", "No view found!!")
		},loadSubModelView:function(fieldsetting, parenturimapping, refresh, options){
			var self = this;
			
			parenturimapping = parenturimapping||self.parenturimapping||window.app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
			
			var subservicename = parenturimapping.field;
			
			var container = self.$('#' + fieldsetting.field +'_list_container');
			
//			if(!container || container.length == 0){
//				self.$el.append('<div id="'+fieldsetting.field +'_list_container"></div>');
//				container = self.$('#' + fieldsetting.field +'_list_container');
//			}
			var submodelname = fieldsetting.field + 'Collection';
			var submodeview = fieldsetting.field + 'View';
			
			if(!self[submodeview] || refresh){
				var servicetemplateurl = parenturimapping.templateName+ '&layout=nil&subservice='+ (subservicename);
				if(parenturimapping.templateName && parenturimapping.templateName.indexOf("?") == -1)
					servicetemplateurl = parenturimapping.templateName+ '?layout=nil&subservice='+ (subservicename);
				
				self.$('.loading').remove();
				if(!self.$el.html() || self.$el.html().trim() == ''){
					servicetemplateurl = servicetemplateurl.replace('?layout=nil&', '?');
					container=self.$el;
				}
				
				var viewoptions = {
					el:container,
					templateName:servicetemplateurl
				};
				
				if(parenturimapping.templatedir)
					viewoptions.templatedir=parenturimapping.templatedir;
				
				if(fieldsetting.multiple) {
					viewoptions.modelsettings = fieldsetting.modelsettings;
					viewoptions.uri = parenturimapping.uri;
					viewoptions.uri = parenturimapping.uri + '/' +fieldsetting.field;
					
					var defaultdata = self.model.get(fieldsetting.field);
					var fieldtree = viewoptions.uri.split("/");
					var _modeldata = self.model.toJSON();
					for(var i in viewoptions.uri.split("/")){
						if(i > 0){
							defaultdata = _.extend(defaultdata, _modeldata[fieldtree[i]]);
						}
					}
					
					if(fieldsetting.dataType == "string")
						self[submodelname] = new BackboneExtModel({local:true, results:defaultdata||[]});
					else
						self[submodelname] = new BackboneExtCollection(
							defaultdata, {local:true}
						);
					
					if((self.viewmode == "form" || self instanceof Backbone.FormView)){
						viewoptions.plugins={
							datatable:{
								buttons : [
							       {
							    	   text: getMessage("add"),
							    	   action: (function(fieldsetting, parenturimapping){
							    		   return function ( e, dt, node, config ) {
							    			   self.loadSubModelForm(fieldsetting, parenturimapping);
//							    			   self.loadSubModelView(fieldsetting, parenturimapping);
							    		   };
							    	   })(fieldsetting, parenturimapping)
							       }
					            ]
							}
						}
					}
				} else {
					var defaultdata = _.extend({local:true}, fieldsetting.model/*, self.model.get(fieldsetting.field)*/);
					viewoptions.modelsettings=fieldsetting.modelsettings;
					viewoptions.uri=parenturimapping.uri;
					viewoptions.uri=parenturimapping.uri + '/' +fieldsetting.field;
					
					var fieldtree = viewoptions.uri.split("/");
					var _modeldata = self.model.toJSON();
					for(var i in viewoptions.uri.split("/")){
						if(i > 0){
							defaultdata = _.extend(defaultdata, _modeldata[fieldtree[i]]);
						}
					}
					self[submodelname] = new BackboneExtModel(defaultdata);
					
					//viewoptions.templateName='sub' + parenturimapping.details.templateName+ '&layout=nil&subservice=' + (subservicename);
					var servicetemplateurl = 'sub' + parenturimapping.details.templateName;
					if((self.viewmode == "form" || self instanceof Backbone.FormView))
						servicetemplateurl='sub' + parenturimapping.form.templateName;
					
					viewoptions.templateName= servicetemplateurl + '&layout=nil&subservice='+ (subservicename);
					if(servicetemplateurl.indexOf("?") == -1)
						viewoptions.templateName= servicetemplateurl + '?layout=nil&subservice='+ (subservicename);
				}
				
				viewoptions.model = self[submodelname];
				viewoptions.cssclass='subview';
				viewoptions.dataprops={"subview-id": submodeview};
				
				if(!fieldsetting.multiple){
					viewoptions.viewmode='details';
					
					if((self.viewmode == "form" || self instanceof Backbone.FormView))
						viewoptions.viewmode='form';
				}
				
				self[submodeview] = app.getView(viewoptions);
				self[submodeview].parenturimapping=parenturimapping;
				
				if(options && options.afterload)
					self[submodeview].on("afterload", options.afterload);
				
				self[submodeview].on("afterload", function(){
					if((self.viewmode == "form" || self instanceof Backbone.FormView) && (self[submodeview].viewmode == 'details' || (Backbone.DetailsView && self[submodeview] instanceof Backbone.DetailsView)) && !fieldsetting.multiple){
						self[submodeview].$('.actions').append('<input type="button" class="btn btn-default" value="'+getMessage("add/edit")+'">');
						
						self[submodeview].$('.actions').click(
							(function(self, fieldsetting, submodeview){
								return function(){
									self.loadSubModelForm(fieldsetting, parenturimapping);
//									self.loadSubModelView(fieldsetting, parenturimapping);
								}
							})(self, fieldsetting, submodeview)
						);
					}
					
					if(!$.DataTable && (self.viewmode == "form" || self instanceof Backbone.FormView) ){
						self[submodeview].$('table>thead>tr>th:last').append('<input type="button" class="btn btn-primary add-sub pull-right" value="'+getMessage("add")+'">');
						
						self[submodeview].$('table>thead>tr>th:last .add-sub').click((function(fieldsetting, parenturimapping){
							return function(){
								self.loadSubModelForm(fieldsetting, parenturimapping);
//								self.loadSubModelView(fieldsetting, parenturimapping);
							}
						})(fieldsetting, parenturimapping));
					}
						
				});
				
				self[submodeview].load(function(){
					if((self[submodeview].viewmode == "form" || (Backbone.FormView && self[submodeview] instanceof Backbone.FormView))){
						self[submodeview].model.on('change', (function(self, fieldsetting){
							return function(model, response, options){
								if(fieldsetting.type == "object" || (typeof fieldsetting.model == "object" && Object.keys.length > 0)){
									self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
								}
							};
						})(self, fieldsetting));
					}
					
//					self[submodeview].$('.modelaction .remove-sub').click(
//						(function(self, fieldsetting, submodeview){
//							return function(event){
//								event.preventDefault();
//								console.log("Hello");
//							}
//						})(self, fieldsetting, submodeview)
//					);
					
					self[submodelname].on('add', (function(self, fieldsetting){
						return function(){
							if(fieldsetting.dataType == "string"){
								var newvalues = self[submodelname].toJSON();//pluck(fieldsetting.field);
								
								var valuearray = self.model.get(fieldsetting.field)||[];
								if(self.model.get(fieldsetting.field) instanceof Array){}
								else if(typeof self.model.get(fieldsetting.field) == "object"){
									valuearray = [valuearray[fieldsetting.field]];
								} else if(typeof self.model.get(fieldsetting.field) == "string"){
									valuearray = [valuearray];
								}
									
								for(var valueobject in newvalues){
									var curvalue = newvalues[valueobject][fieldsetting.field];
									
									if(_.indexOf(valuearray, curvalue) == -1)
										valuearray.push(curvalue);
								}
								
								var change = {};
								change[fieldsetting.field]=valuearray;
								
//								self.model.set(change);
							}else
								self.model.set(fieldsetting.field, self[submodelname].toJSON());

							self[submodeview].refresh();
						};
					})(self, fieldsetting));
					
					self[submodeview].$('.view-sub').click(
						(function(self, fieldsetting, submodeview){
							return function(event){
								var selvalue = $(event.target).attr('data-id');
								var selfield = $(event.target).attr('data-field');
								
								var wherquery={};
									wherquery[selfield] = selvalue;
								
								var selmodel = self[submodelname].findWhere(wherquery);
								if(!selmodel && /^\d+$/.test(selvalue)){
									wherquery[selfield] = Number(selvalue);
									selmodel = self[submodelname].findWhere();
								}
								
								if(selmodel) {
									self.loadSubModelForm(fieldsetting, parenturimapping, 'view', selmodel);
//									self.loadSubModelView(fieldsetting, parenturimapping, 'view', selmodel);
								} else {
									self.log('no model found in the collection');
								}
							}
						})(self, fieldsetting, submodeview)
					);
				});
			} else {
				self[submodelname].set(self.model.get(fieldsetting.field));
			}
			
			return self[submodeview];
		}, loadSubModelForm : function(fieldsetting, parenturimapping, viewmode, selmodel){
			var self = this;
			
			parenturimapping = parenturimapping||self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
			
			var subservicename = parenturimapping.field;
			var containerid = fieldsetting.field.replace('/', '_');
			
			var container = $('#' + containerid +'_modal_container');
			
			if(container && container.length <= 0){
				container = $('<div id="'+ containerid +'_modal_container'+'"></div>');
				container.appendTo(document.body);
			}
			
			var submodelname = fieldsetting.field + 'Model';
			var submodeview = fieldsetting.field + 'FormView';
			
			if(!self[submodeview] || true){
				var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
				
				if(selmodel && selmodel.toJSON)
					defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
				
				self[submodelname] = new BackboneExtModel(defaultmodel);
				
				var servicetemplateurl = 'sub' + parenturimapping.form.templateName + '&layout=popup&subservice=' + (subservicename);
				if(parenturimapping.form.templateName.indexOf("?") == -1)
					servicetemplateurl = 'sub' + parenturimapping.form.templateName + '?layout=popup&subservice=' + (subservicename);
				
				var viewoptions = {
					el:container,
					templateName:servicetemplateurl, 
					model:self[submodelname],
					modelsettings:fieldsetting.modelsettings,
					validation:fieldsetting.validation||{},
					uri:/*self.options.uri +'/' +*/parenturimapping.uri + '/' +fieldsetting.field
				};
				
				if(parenturimapping.templatedir)
					viewoptions.templatedir = parenturimapping.templatedir;
				
				if(viewmode == 'view'){
					viewoptions.templateName = 'sub' + parenturimapping.details.templateName + '&layout=popup&subservice=' + (subservicename);
					
					if(parenturimapping.details.templateName.indexOf("?") == -1)
						viewoptions.templateName = 'sub' + parenturimapping.details.templateName+ '?layout=popup&subservice=' + (subservicename);
				}else
					viewoptions.viewmode='form';
				
				self[submodeview] = app.getView(viewoptions);
				
				self[submodeview].parenturimapping=parenturimapping;
				
				self[submodeview].on("afterload", function(){
					if(self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView){
						self[submodeview].$('.form-actions').append('<input type="button" class="disabled btn btn-primary add-sub" value="'+getMessage("add")+'">');
					}
					
					if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
						self[submodeview].model.on('change', (function(self, fieldsetting){
							return function(model, response, options){
								if(fieldsetting.type == "object"){
									self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
								}
							};
						})(self, fieldsetting));
					}
					
					self[submodeview].$('.modal').modal('show');
					
					self[submodeview].$('.modal-body').css({
						width:'auto', //probably not needed
						height:'auto', //probably not needed 
						'max-height':'100%'
					});
					
					self[submodeview].$('.add-sub').click(
						(function(self, fieldsetting, submodeview){
							return function(){
								if(self[submodeview].model.isValid()){
									if(fieldsetting.dataType =="string" && fieldsetting.multiple && self.model instanceof Backbone.Model) {
										var exisitingdata = self[fieldsetting.field + 'View'].model.get("results")||[];
										exisitingdata.push(self[submodeview].model.get(fieldsetting.field));
										
										self[fieldsetting.field + 'View'].model.set(fieldsetting.field, exisitingdata);
										self[fieldsetting.field + 'View'].refresh();
										
										self.model.set(fieldsetting.field, exisitingdata);
									} else if( !fieldsetting.multiple /*self[submodeview].model instanceof Backbone.Model*/) {
										self[fieldsetting.field + 'View'].model.set(self[submodeview].model.toJSON());
										self[fieldsetting.field + 'View'].refresh();
										
										self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
									} else
										self[fieldsetting.field + 'View'].model.add(self[submodeview].model.toJSON());
									
									self[submodeview].$('.modal').modal('hide');
								}
							}
						})(self, fieldsetting, submodeview)
					);
				});
				
//				self[submodeview].on('afterload', function(){
//				});
				
				app.loadDialogView(self[submodeview]);
//				self[submodeview].load(function(){
//					if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
//						self[submodeview].model.on('change', (function(self, fieldsetting){
//							return function(model, response, options){
//								if(fieldsetting.type == "object"){
//									self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
//								}
//							};
//						})(self, fieldsetting));
//					}
//					
//					self[submodeview].$('.modal').modal('show');
//					
//					self[submodeview].$('.modal-body').css({
//						width:'auto', //probably not needed
//						height:'auto', //probably not needed 
//						'max-height':'100%'
//					});
//					
//					self[submodeview].$('.add-sub').click(
//						(function(self, fieldsetting, submodeview){
//							return function(){
//								if(self[submodeview].model.isValid()){
//									if(fieldsetting.dataType =="string" && fieldsetting.multiple && self.model instanceof Backbone.Model){
//										var exisitingdata = self[fieldsetting.field + 'View'].model.get("results")||[];
//										exisitingdata.push(self[submodeview].model.get(fieldsetting.field));
//										
//										self[fieldsetting.field + 'View'].model.set(fieldsetting.field, exisitingdata);
//										self[fieldsetting.field + 'View'].refresh();
//										
//										self.model.set(fieldsetting.field, exisitingdata);
//									}else if(!fieldsetting.multiple/*self[submodeview].model instanceof Backbone.Model*/){
//										self[fieldsetting.field + 'View'].model.set(self[submodeview].model.toJSON());
//										self[fieldsetting.field + 'View'].refresh();
//										
//										self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
//									}else
//										self[fieldsetting.field + 'View'].model.add(self[submodeview].model.toJSON());
//									
//									self[submodeview].$('.modal').modal('hide');
//								}
//							}
//						})(self, fieldsetting, submodeview)
//					);
//				});
			} else{
				var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
				
				if(selmodel && selmodel.toJSON && selmodel.cid != self[submodeview].model.cid){
					defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
					self[submodelname].set(defaultmodel);
					
					self[submodeview].$('.modal').modal('show');
				}else{
					self[submodeview].$('.modal').modal('show');
				}
			}
		}
	});
	
	return CustomBackboneView;
});