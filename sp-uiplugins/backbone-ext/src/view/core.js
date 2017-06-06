(function (factory) {
	"use strict";
	
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([
			"./core.js",
			"./custom/model.js",
			"./collection.js",
			"./custom/fieldplugin.js"
	    ], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		module.exports = factory(require('./core.js'));
	} else {
		// Global browser
		factory(Backbone);
	}
}(function (Backbone) {
	"use strict";
	
	Backbone.View.GLOBAL_FIELDS=['layout', 'themes', 'curtheme'];

	Backbone.View.DEFAULT_OPTIONS={
		templatedir:'templates/',
		templateExtension:'.html',
		plugins:{
			'datatable': {
				responsive:true,
				columnDefs: [
		             { targets: 'no-sort', orderable: false }
	            ]
			}
		}, formgroup : '.form-group',
		notification:{
			container:'.notification:first',
			message:'',
			classname:'bg-danger'
		}
	};

	/**
	 * Log messages to the db, or directly to consol.log
	 */
	Backbone.View.prototype.log= function(){
		if(console&&console.log)
			console.log.apply(this, arguments);
	};

	/**
	 * To initialize the Backbone view
	 */
	Backbone.View.prototype.initialize = function (options) {
	    var self = this;
	    
	    self.options = _.extend({}, self.DEFAULT_OPTIONS, Backbone.View.DEFAULT_OPTIONS, options);
	    
	    if(options.model)
	    	delete self.options.model;
	    
	    if(self.options.afterinitialize)
		    self.on('afterinitialize', self.options.afterinitialize);
	    
	    if(self.options.onremove)
		    self.on('remove', self.options.onRemove);
	    
	    if(self.options.beforeload)
		    self.on('beforeload', self.options.beforeload);
	    
	    if(self.options.afterload)
		    self.on('afterload', self.options.afterload);
	    
	    if(self.options.beforerender)
		    self.on('beforerender', self.options.beforerender);
	    
	    if(self.options.beforerender)
		    self.on('beforerender', self.options.beforerender);
	    
	    if(self.model){
	    	if(self.options.onInvalid && self.model)
	    	    self.model.on('invalid', self.options.onInvalid);
	        
	    	if(self.onInvalid && self.model)
	        	self.model.on('invalid', function(){self.onInvalid();});
	        
	        if(self.onInvalid && self.model)
	        	self.model.on('invalidfield', function(error){self.onInvalid(error);});
	        
	        // if it is form view, remove validation method is available then listen to valid field
	        if((self.viewmode == "form" || self instanceof Backbone.FormView) && self.removeFormValidation)
	    	    self.model.on('validfield', function(view, key){
	    	    	self.removeFormValidation(key);
	    	    });
	       
	        if(self.model instanceof Backbone.Model){
	        	self.model.on('sync', function(model, response, options){
	            	self.model.serverattributes = self.model.toJSON();
	            	
	            	if(self.disableFormAction)
	            		self.disableFormAction();
	            });
	            
	            self.model.on('change', function(model, response, options){
	            	if(self.model.serverattributes){
	            		if(_.isMatch(self.model.serverattributes, self.model.changed)){
	            			if(self.disableFormAction)
	            				self.disableFormAction();
	            		}else if(self.enableFormAction){
	            			self.enableFormAction();
	            		}	
	            	}else if(self.enableFormAction){
	            		self.enableFormAction();
	            	}
	            });	
	        }
	        
	        self.on('aftersave', function(model, response, options){
	        	self.showNotification({classname:'bg-success', message:'Data saved to the server successfully.'})
	        });
	        
	        self.on('save_error', function(view, model, response, options){
	        	self.showNotification({classname:'bg-danger', message:response.responseJSON.exception.id})
	        });	
	    }
	    
	    self.trigger('initialize');
	    
	    if(self.afterInitialize) // can use for extended views
			self.afterInitialize();
	}

	/**
	 * to ge the template name 
	 */
	Backbone.View.prototype.getTemplateName = function(){
		return this.options.templateName||this.templateName||this.options.modelName||this.modelName;
	}

	/**
	 * To get the Template path for the view
	 */
	Backbone.View.prototype.getRemoteTemplatePath = function(){
		var self = this;
		
		if(self.options.remoteTemplate||self.remoteTemplate)
			return self.options.remoteTemplate||self.remoteTemplate;
		
		// construct the template from either model name or the Template name itself
		var templatename = self.getTemplateName();
		if(templatename && self.options.templateExtension && templatename.indexOf((self.options.templateExtension)) == -1)
			templatename = templatename + (self.options.templateExtension)
		
		return (self.options.templatedir||this.templatedir||'') + templatename;
	};

	/**
	 * To lad the templates from remote server
	 */
	Backbone.View.prototype.loadTemplate = function(templateName, templatePath, callback){
		var self = this;
		
		if(self.template && typeof self.template == "function"){
			callback();
		}else{
			/**
		     * Used to load  the template using TemplateManager
		     * then only create the view/render method
		     */
			if(typeof templateName == 'function'){
				callback = templateName;
				
				templateName = self.getTemplateName();
				templatePath = self.getRemoteTemplatePath();
		    }else if(typeof templatePath == 'function'){
		        callback = templatePath;
		        
		        templatePath = (self.options.templatedir||this.templatedir||'') + templateName + + (self.options.templateExtension||'.html');
		    }else if(!templatePath){
		    	templatePath = (self.options.templatedir||this.templatedir||'') + templateName + + (self.options.templateExtension||'.html');
			}
			
			if(!templateName && !self.modelName)
				callback(null, 'No template possible with out template name or model name');
			else{
				//check layout is disabled
				if(self.options && self.options.disablelayout){
					if(templatePath.indexOf('?') == -1)
						templatePath += '?'
					else
						templatePath += '&';
					
					templatePath += 'layout=nil';		
				}
				templateLoader.getTemplate(self.modelName, templatePath, callback);	
			}	
		}
	};

	/**
	 * To set the template in to the view
	 */
	Backbone.View.prototype.setTemplate = function(callback){
		var self = this;
		
		if(self.template && typeof self.template == "function")
			callback();
		else
			self.loadTemplate(function(templatedata, error){
				if(templatedata)
					self.template = _.template(templatedata);
				else{
					if(error){
						self.log('Error while getting Template - ' + JSON.stringify(error));
						self.log(self);
					}
					self.options.templateError = true;
				}	
				
				if(callback)
					callback();
			});
	}

	/**
	 * load the view in to the element specified
	 * - get the template
	 * - render the data formatted in to the html 
	 */
	Backbone.View.prototype.load = function(container, callback){
		var self = this;
		
		if(container && typeof container != 'function'){
			// conteainer where to load the content
			self.container = container;
			
			// backbone method to set the new element
			self.setElement($(container));
		} 
		
		var callback;
		if(arguments && arguments.length > 0 && typeof arguments[0] == 'function')
			callback = arguments[0];
		else if(arguments && arguments.length > 1 &&  typeof arguments[1] == 'function')
			callback = arguments[1];
		
		self.trigger('beforeload');
		
		if(self.beforeLoad) // can use for extended views
			self.beforeLoad();
		
		/**
		 * set the template if template is not loaded yet
		 */
		self.setTemplate(function(){
			
			/**
			 * callback after fetching data from remote server 
			 */
			self.fetchData(function(error, data){
				if(error){
					app.showMessage('error', {classname:'bg-danger', title:'Error while retreiving model data', message:error.responseJSON.exception});
					
					self.trigger('afterload');
					if(callback)
						callback(error.responseJSON.exception);
					else
						return self;
				} else{
					/**
					 * Now load the data in to the view element
					 */
					self.render();
					
					self.trigger('afterload');
					
					if(self.afterLoad) // can use for extended views
						self.afterLoad();
					
					// register plugins
					if(self.configure)
						self.configure();
					
					if(callback)
						callback();
					else
						return self;	
				}
			});
		});
	}

	/**
	 * To register various plugins available 
	 */
	Backbone.View.prototype.configure = function(){
		var self = this;
		
		self.fieldsettings = self.fieldsettings||{};
		self.validation = {};

		if(self.options.uri && window.urimappings){
			var uriid = self.options.uri.replace('#', '');
			
			if(window.urimappings[uriid] && window.urimappings[uriid].fieldsettings){
				self.fieldsettings = _.extend({}, window.urimappings[uriid].fieldsettings);
			}
			
			if(window.urimappings[uriid] && window.urimappings[uriid].validation){
				self.validation = _.extend({}, window.urimappings[uriid].validation);
			}
		}
		
		self.fieldsettings = _.extend(self.fieldsettings, self.options.fieldsettings, self.options.modelsettings);
		
		self.validation = _.extend(self.validation, self.options.validation);
		
		if(self.model && self.model instanceof Backbone.Model){
			self.model.registerValidation(self.validation);
		}
		
		if(self.model && self.model.settings){
			self.fieldsettings = _.extend(self.fieldsettings, self.model.settings);
		}
		
		// Registering custom plugins registered using the options 
		if(self.options.plugins){
			for(var i in self.options.plugins){
				var registermethod = 'register' + utils.capitaliseFirstLetter(i);
				
				if(self[registermethod]){
					self[registermethod]();
				}
			}
		}
		
		self.loadSubModelView= (function(self){
			return function(fieldsetting, parenturimapping, refresh){
				parenturimapping =parenturimapping||self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
				
				var subservicename = parenturimapping.field;
				
				var container = self.$('#' + fieldsetting.field +'_list_container');
				
				var submodelname = fieldsetting.field + 'Collection';
				var submodeview = fieldsetting.field + 'View';
				
				if(!self[submodeview]){
					var servicetemplateurl = parenturimapping.templateName+ '&layout=nil&subservice='+ (subservicename);
					if(parenturimapping.templateName && parenturimapping.templateName.indexOf("?") == -1)
						servicetemplateurl = parenturimapping.templateName+ '?layout=nil&subservice='+ (subservicename);
					
					var viewoptions = {
						el:container,
						templateName:servicetemplateurl
					};
					
					if(parenturimapping.templatedir)
						viewoptions.templatedir=parenturimapping.templatedir;
					
					if(fieldsetting.multiple){
						if(fieldsetting.dataType == "string")
							self[submodelname] = new Backbone.Model({local:true, results:self.model.get(fieldsetting.field)||[]});
						else
							self[submodelname] = new Backbone.Collection(
								self.model.get(fieldsetting.field), {local:true}
							);

						viewoptions.modelsettings=fieldsetting.modelsettings;
						viewoptions.uri=parenturimapping.uri;
						viewoptions.uri=parenturimapping.uri + '/' +fieldsetting.field;
						
						if((self.viewmode == "form" || self instanceof Backbone.FormView)){
							viewoptions.plugins={
								datatable:{
									buttons : [
								       {
								    	   text: getMessage("add"),
								    	   action: (function(fieldsetting, parenturimapping){
								    		   return function ( e, dt, node, config ) {
									    		
								    			   self.loadSubModelForm(fieldsetting, parenturimapping);
								    		   };
								    	   })(fieldsetting, parenturimapping)
								       }
						            ]
								}
							}
						}
					} else{
						defaultdata = _.extend({local:true}, self.model.get(fieldsetting.field));
						self[submodelname] = new Backbone.Model(defaultdata);
						
						viewoptions.modelsettings=fieldsetting.modelsettings;
						viewoptions.uri=parenturimapping.uri;
						viewoptions.uri=parenturimapping.uri + '/' +fieldsetting.field;
						
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
					
					self[submodeview].on("afterload", function(){
						if((self.viewmode == "form" || self instanceof Backbone.FormView) && self[submodeview] instanceof Backbone.DetailsView && !fieldsetting.multiple){
							self[submodeview].$('.actions').append('<input type="button" class="btn btn-default" value="'+getMessage("add/edit")+'">');
							
							self[submodeview].$('.actions').click(
								(function(self, fieldsetting, submodeview){
									return function(){
										self.loadSubModelForm(fieldsetting, parenturimapping);
									}
								})(self, fieldsetting, submodeview)
							);
						}
						
						if(!$.DataTable && (self.viewmode == "form" || self instanceof Backbone.FormView) ){
							self[submodeview].$('table>thead>tr>th:last').append('<input type="button" class="btn btn-primary add-sub pull-right" value="'+getMessage("add")+'">');
							self[submodeview].$('table>thead>tr>th:last .add-sub').click((function(fieldsetting, parenturimapping){
								return function(){
									self.loadSubModelForm(fieldsetting, parenturimapping);	
								}
							})(fieldsetting, parenturimapping));
						}
							
					});
					
					self[submodeview].load(function(){
						if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
							self[submodeview].model.on('change', (function(self, fieldsetting){
								return function(model, response, options){
									if(fieldsetting.type == "object" || (typeof fieldsetting.model == "object" && Object.keys.length > 0)){
										self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
									}
								};
							})(self, fieldsetting));
						}
						
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
									
									//self.model.set(change);
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
									
									if(selmodel)
										self.loadSubModelForm(fieldsetting, parenturimapping, 'view', selmodel);
									else{
										self.log('no model found in the collection');
									}
								}
							})(self, fieldsetting, submodeview)
						);
					});
				} else {
					self[submodelname].set(self.model.get(fieldsetting.field));
				}
			};
		})(self);
			
		// register Simple selector plugin using the url argument
		if(self.fieldsettings && Object.keys(self.fieldsettings).length > 0){
			self.log("loadSubModelView", "Registering ---->" +self.cid)
			registerFieldSettings(self, self.fieldsettings);
		}
		
		self.displayValidation();
	};
	
//	/**
//	 * To register various plugins available 
//	 */
//	Backbone.View.prototype.loadSubModelForm = function(fieldsetting, parenturimapping, viewmode, selmodel){
//		var self = this;
//		
//		parenturimapping = parenturimapping||self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
//		
//		var subservicename = parenturimapping.field;
//		var containerid = fieldsetting.field.replace('/', '_');
//		
//		var container = $('#' + containerid +'_modal_container');
//		
//		if(container && container.length <= 0){
//			container = $('<div id="'+ containerid +'_modal_container'+'"></div>');
//			container.appendTo(document.body);
//		}
//		
//		var submodelname = fieldsetting.field + 'Model';
//		var submodeview = fieldsetting.field + 'FormView';
//		
//		if(!self[submodeview] || true){
//			var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
//			
//			if(selmodel && selmodel.toJSON)
//				defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
//			
//			self[submodelname] = new Backbone.Model(defaultmodel);
//			
//			var servicetemplateurl = 'sub' + parenturimapping.form.templateName + '&layout=popup&subservice=' + (subservicename);
//			if(parenturimapping.form.templateName.indexOf("?") == -1)
//				servicetemplateurl = 'sub' + parenturimapping.form.templateName + '?layout=popup&subservice=' + (subservicename);
//			
//			var viewoptions = {
//				el:container,
//				templateName:servicetemplateurl, 
//				model:self[submodelname],
//				modelsettings:fieldsetting.modelsettings,
//				validation:fieldsetting.validation||{},
//				uri:/*self.options.uri +'/' +*/parenturimapping.uri + '/' +fieldsetting.field
//			};
//			
//			if(parenturimapping.templatedir)
//				viewoptions.templatedir = parenturimapping.templatedir;
//			
//			if(viewmode == 'view'){
//				viewoptions.templateName = 'sub' + parenturimapping.details.templateName + '&layout=popup&subservice=' + (subservicename);
//				
//				if(parenturimapping.details.templateName.indexOf("?") == -1)
//					viewoptions.templateName = 'sub' + parenturimapping.details.templateName+ '?layout=popup&subservice=' + (subservicename);
////				
////				viewoptions.templateName='sub' + parenturimapping.details.templateName+ '&layout=popup&subservice=' + (subservicename);
////				
////				self[submodeview] = new Backbone.View(viewoptions);
//			}else
//				viewoptions.viewmode='form';
//			
//			//self[submodeview] = new Backbone.FormView(viewoptions);
//			self[submodeview] = app.getView(viewoptions);
//			
//			self[submodeview].parenturimapping=parenturimapping;
//			
//			self[submodeview].on("afterload", function(){
//				if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
//					self[submodeview].$('.form-actions').append('<input type="button" class="disabled btn btn-primary add-sub" value="'+getMessage("add")+'">');
//				}
//			});
//			
//			self[submodeview].load(function(){
//				if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
//					self[submodeview].model.on('change', (function(self, fieldsetting){
//						return function(model, response, options){
//							if(fieldsetting.type == "object"){
//								self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
//							}
//						};
//					})(self, fieldsetting));
//				}
//				
//				self[submodeview].$('.modal').modal('show');
//				
//				self[submodeview].$('.modal-body').css({
//					width:'auto', //probably not needed
//					height:'auto', //probably not needed 
//					'max-height':'100%'
//				});
//				
//				self[submodeview].$('.add-sub').click(
//					(function(self, fieldsetting, submodeview){
//						return function(){
//							if(self[submodeview].model.isValid()){
//								if(fieldsetting.dataType =="string" && fieldsetting.multiple && self.model instanceof Backbone.Model){
//									var exisitingdata = self[fieldsetting.field + 'View'].model.get("results")||[];
//									exisitingdata.push(self[submodeview].model.get(fieldsetting.field));
//									
//									self[fieldsetting.field + 'View'].model.set(fieldsetting.field, exisitingdata);
//									self[fieldsetting.field + 'View'].refresh();
//									
//									self.model.set(fieldsetting.field, exisitingdata);
//								}else if(!fieldsetting.multiple/*self[submodeview].model instanceof Backbone.Model*/){
//									self[fieldsetting.field + 'View'].model.set(self[submodeview].model.toJSON());
//									self[fieldsetting.field + 'View'].refresh();
//									
//									self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
//								}else
//									self[fieldsetting.field + 'View'].model.add(self[submodeview].model.toJSON());
//								
//								self[submodeview].$('.modal').modal('hide');
//							}
//						}
//					})(self, fieldsetting, submodeview)
//				);
//			});
//		}else{
//			var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
//			
//			if(selmodel && selmodel.toJSON && selmodel.cid != self[submodeview].model.cid){
//				defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
//				self[submodelname].set(defaultmodel);
//				self[submodeview].$('.modal').modal('show');
//			}else{
//				self[submodeview].$('.modal').modal('show');
//			}
//		}
//	};
	
	/**
	 * To refresh the content 
	 */
	Backbone.View.prototype.refresh = function(callback){
		var self = this;
		
		// reload the content 
		self.load(callback);
	};

	/**
	 * To reset the notification
	 */
	Backbone.View.prototype.resetNotification = function(options){
		var self = this;
		
		self.$(self.options.notification.container).html('');
	};

	/**
	 * To show the notification
	 */
	Backbone.View.prototype.showNotification = function(options){
		var self = this;
		
		var options = _.extend(self.options.notification||{}, options);
		var _template = _.template('<p class="<%= classname %>"><%= message %></p>');
		
		self.$(self.options.notification.container).html(_template(options));
	};

	Backbone.View.prototype.displayValidation = function () {
		var self = this;
		
		var validationiconchart = {
			required:'glyphicon glyphicon-asterisk'
		}
		
		if(self.validation){
			for(var validationkey in self.validation){
				if(typeof self.validation[validationkey] == 'string'){
					if(validationiconchart[self.validation[validationkey]]){
						self.$('[name="'+validationkey+'"]').closest('.form-group').find('.control-label').append('<i data-validation-icon="'+self.validation[validationkey]+'" style="color:#a94442;" class="'+validationiconchart[self.validation[validationkey]]+'"></i>');
					}	
				}
			}
		}
	}

	Backbone.View.prototype.enable = function (key, options, subprops) {
		var self = this;
		var fields = [];
		options=options||{silent:true};
		
		if(typeof key == 'Array'){
			fields = key;
		}else
			fields = [key];
		
		if(self.fieldsettings[key] && subprops && typeof subprops === 'object'){
			for(var subkey in subprops){
				if(self[key+'View']){
					self[key+'View'].enable(subkey, options, subprops[subkey]);	
				}
			}
		}else if(self[key+'View']){
			if(subprops == 'show')
				self[key+'View'].$el.show();
			else if(subprops == 'show')
				self[key+'View'].$('input, select').enable();
		}else
			for(var fieldIndex in fields){
				//@use id or name attribute
				self.$('[name="'+fields[fieldIndex]+'"]').removeAttr('disabled');
			}
	}

	Backbone.View.prototype.disable = function (key, options, subprops) {
		var self = this;
		var fields = [];
		options=options||{silent:true};
		
		if(typeof key == 'Array'){
			fields = key;
		}else
			fields = [key];
		
		if(self.fieldsettings[key] && subprops && typeof subprops === 'object'){
			for(var subkey in subprops){
				if(self[key+'View']){
					self[key+'View'].disable(subkey, options, subprops[subkey]);	
				}
			}
		}else if(self[key+'View']){
			if(subprops == 'show')
				self[key+'View'].$el.hide();
			else if(subprops == 'show')
				self[key+'View'].$('input, select').disable();
		}else
			for(var fieldIndex in fields){
				//@use id or name attribute
				self.$('[name="'+fields[fieldIndex]+'"]').attr('disabled', true);
			}
	}

	Backbone.View.prototype.resetValue = function (key, value, options) {
		var self = this;
		var changedmodel = {};
		options=options||{silent:true};
		
		if(typeof key == 'object'){
			changedmodel = key;
			options = value||options; 
		}else
			changedmodel[key]=value;
		
		for(var key in changedmodel){
			//@use id or name attribute
			if(self.model && self.model.attributes && self.model.attributes[key] == changedmodel[key]){
				var fieldsetting = self.fieldsettings[key];
				if(fieldsetting && fieldsetting.modelsettings && self[fieldsetting.field + 'Collection']){
					changedmodel[key]=[];
					self[fieldsetting.field+'Collection'].set(changedmodel[key]);
				}else {
					changedmodel[key]= "";
					self.$('[name="'+key+'"]').val(changedmodel[key]);
					
					if(self.$('[name="'+key+'"]').is(':checkbox')){
						self.$('[name="'+key+'"]').attr('checked', false);
						
						if(options.originalfield != key)
							self.changeDependencies(key, changedmodel[key], options);
					}		
				}
			}
		}
		if(options && options.originalfield && key && (value == 'show' || value == 'hide')){
			//console.log("we dont set values for changed model from dependencies change");
		}else{
			//console.log("Setting value in to the model do we need this or not???");
			self.model.set(changedmodel, options);
		}
	}

	Backbone.View.prototype.setValue = function (key, value, options) {
		var self = this;
		var changedmodel = {};
		options=options||{silent:true};
		
		if(typeof key == 'object'){
			changedmodel = key;
			options = value||options; 
		}else
			changedmodel[key]=value;
		
		for(var key in changedmodel){
			//@use id or name attribute
			if(self.model && self.model.attributes && self.model.attributes[key] != changedmodel[key]){
				var fieldsetting = self.fieldsettings[key];
				if(fieldsetting && fieldsetting.modelsettings && self[fieldsetting.field+'Collection']){
					self[fieldsetting.field+'Collection'].set(changedmodel[key]);
				}else{
					self.$('[name="'+key+'"]').val(changedmodel[key]);
					
					if(self.$('[name="'+key+'"]').is(':checkbox')){
						self.$('[name="'+key+'"]').attr('checked', changedmodel[key]);
						
						if(options.originalfield != key)
							self.changeDependencies(key, changedmodel[key], options);
					}		
				}
			}
		}
		
		if(options && options.originalfield && key && (value == 'show' || value == 'hide')){
//			console.log("we dont set values for changed model from dependencies change");
		}else{
//			console.log("Setting value in to the model do we need this or not???");
			self.model.set(changedmodel, options);	
		}
	}

	Backbone.View.prototype.changeDependencies = function (field, value, options) {
		var self = this;
		
		var fieldsetting = self.fieldsettings[field];
	    
	    if(!options||!options.originalfield)
	    	options={originalfield:field};
	    
	    if(fieldsetting){
	    	if(fieldsetting.change){
	    		var eqfound=false;
	    		for(var i in fieldsetting.change){
	    			
					if(options.originalfield != i){
						var changevalue = fieldsetting.change[i];
						
						if(fieldsetting.url || fieldsetting.options){
							if(changevalue && changevalue == 'dependant'){
								if(self.model.toJSON().options){
									var $dependantcontainer = $('[name="'+i+'"]').parent();

									var selectoroptions = {
										plugin:'select2',
										title:i,
							            container:$dependantcontainer,
							            name:i, id:i,
							            minimumInputLength:0, ajax:false, multiple:false,
							            dataroot:'options', datakey:'id',
							            data:{options:self.model.toJSON().options}
							        };
									
									var selector = new SimpleSelector(selectoroptions);
									selector.load();
								} else{
									$('[name="'+i+'"]').select2('destroy');
								}
							}else if(i == value){
								if(typeof changevalue == 'object'){
									for(var key in changevalue){
										self.enable(key, options, changevalue[key]);
									}
								}
							} else if(typeof changevalue == 'object'){
								for(var key in changevalue){
									self.disable(key, options, changevalue[key]);
								}
							}
						}else{
							if(value){
								if(changevalue == 'enable'){
									self.enable(i, options);
								} else if(changevalue == 'disable'){
									self.disable(i, options);
								} else if(changevalue == 'dependant'){
									if(self.model.toJSON().options){
										var $dependantcontainer = $('[name="'+i+'"]').parent();
										
//										$('[name="'+i+'"]').remove();
										
										var selectoroptions = {
											plugin:'select2',
											title:i,
								            container:$dependantcontainer,
								            name:i, id:i,
								            minimumInputLength:0, ajax:false, multiple:false,
								            dataroot:'options', datakey:'id',
								            data:{options:self.model.toJSON().options}
								        };
										
										var selector = new SimpleSelector(selectoroptions);
										selector.load();
									}else{
										$('[name="'+i+'"]').select2('destroy');
										$('[name="'+i+'"]').removeAttr('disabled');
									}
									
								}else if(typeof changevalue == 'boolean'){
									self.setValue(i, changevalue, options);
								} else if(typeof changevalue == 'object'){
									self.enable(i, options, changevalue);
								} else
									self.setValue(i, changevalue, options);
							}else{
								if(changevalue == 'enable'){
									self.disable(i, options);
								} else if(changevalue == 'disable'){
									self.enable(i, options);
								} else if(typeof changevalue == 'boolean'){
									self.setValue(i, changevalue, options);
								} else if(typeof changevalue == 'object'){
									self.disable(i, options, changevalue);
								} else
									self.resetValue(i, changevalue, options);
							}
						}
					}
				}
			}
	    }
	}

	/**
	 * On change handler for form based view
	 */
	Backbone.View.prototype.change = function (event, originalEvent) {
	    var self = this;
		
	    if(!event)
	    	return false;
	    
	    var target = event.target;
	    var change = {};
	        
	    var value = null;
	    if($(target).is(':radio')){
	    	value = $(target).val();
	    }else if($(target).is(':checkbox')){
	    	value = target.checked;
	    }else{
	    	if(target.nodeName == 'SELECT' && target.multiple){
	    		if(event.val){
	    			value = event.val;
	    		}else if($(target).val() instanceof Array)
					value = $(target).val();
				else
	    			value = [target.value];
	    	}else{
	    		value = target.value;
	        	
	            if(value && value.lastIndexOf(', ') != -1 && value.lastIndexOf(', ') == value.length-2)
	        		value = value.substring(0, value.lastIndexOf(', '));

	            if(value && value.lastIndexOf(',') != -1 && value.lastIndexOf(',') == value.length-1)
	        		value = value.substring(0, value.lastIndexOf(','));
	    	}
	    }
	    
	    if(target.name){
	    	self.model.set(target.name, value, {validate:true});
	    	
	    	var fieldsetting = self.fieldsettings[target.name];
	        
	    	if(fieldsetting){
	        	//To inherit field values from the auto complete or selct2 plugin
	            if(fieldsetting.inherit){
	            	var inheritedfiels = _.pick(event.added.originalModel, fieldsetting.inherit);
	            	
	            	self.setValue(inheritedfiels, {silent:true});
	            }
	    	}
	    	
	    	self.changeDependencies(target.name, value, {silent:true});
	    }
	}

	/**
	 * Form search handler for form based view
	 */
	Backbone.View.prototype.search = function (next) {
		var self = this;
		
		if(next && next.originalEvent instanceof Event){
	    	next.preventDefault();
	    	next=null;
	    }
		
		__search = (function(self){
			return function(callback){
		    	self.trigger('beforesearch');

		    	var mainfield = _.omit(self.model.toJSON(), function(value, key, object){
		    		return value instanceof Object;
	    		});
		    	
		    	if(self.model.urlRoot)
		    		self.model.url = function(){return this.urlRoot}
		    	
		    	// pass the argument in to the url
		    	self.model.fetch({
		    		data:mainfield,
		        	success: function (model, response, options) {
		            	if(callback)
		            		callback();
		            	
		            	// now load the content in to the div
//		            	if(self.options.uri){
//		            		var uri = self.options.uri;
		            		
		            		var results = response;
		            		if(response && typeof response.length != "number"){
		            			results = response["results"];
		            		}
		            		
		            		var collection = new Backbone.Collection(results, {local:true});
		            		var view = new Backbone.View({local:true, url:'', model:collection, templatedir:self.options.templatedir, templateName:'servicelist.html?layout=nil'});
		            		
		            		view.load(self.$('.search_results'));
//		            	}
		            	
		            	self.trigger('aftersearch');
		            },
		            error: function (model, response, options) {
		            	if(callback)
		            		callback(response);
		            	
		            	self.trigger('search_error', this, model, response, options);
		            }
		        });
			}
		})(self);
		
		 // event for before render
		var callback = function(error){
			if(error){
				if(next)
					next(error);
			}else {
				if(self.afterSearch)
					self.afterSearch(aftersearchcallback);
			}
		};
		
		if(self.beforeSearch) // if before save is available should get a callback from the before Save function
			self.beforeSearch(function(error){
				if(!error)
					if(next)
						next(error);
				else
					__search(callback);
			});
		else
			__search(callback);
		
		return false;
	};

	/**
	 * Form save handler for form based view
	 */
	Backbone.View.prototype.save = function (next) {
	    var self = this;
	    
	    if(self instanceof Backbone.SearchView || self.viewmode == "search"){
	    	self.search(next);
	    }else{
	    	if(next && next.originalEvent instanceof Event){
	        	next.preventDefault();
	        	next=null;
	        }
	        
	        // event for before render
	    	var callback = function(error){
	    		if(error){
	    			if(next)
	    				next(error);
	    		}else {
	    			if(self.afterSave)
	    				self.afterSave(aftersavecallback);
	    		}
	    	};
	    	
	    	if(self.beforeSave) // if before save is available should get a callback from the before Save function
	    		self.beforeSave(function(error){
	    			if(!error)
	    				if(next)
	    					next(error);
	    			else
	    				self.__save(callback);
	    		});
	    	else
	    		self.__save(callback);	
	    }
	};

	/**
	 * Event handler when the model is invalid
	 */
	Backbone.View.prototype.onInvalid = function (error) {
		var self = this;
		
		if((self.viewmode == "form" || self instanceof Backbone.FormView) && self.model.validationError){
			var validationError = self.model.validationError;
			
			if(self.model.previousValidationError){
				for (var key in self.model.previousValidationError) {
					if(!validationError[key])
						self.removeFormValidation(key);
			    }
			}

			for (var key in validationError) {
				self.displayFormValidation(key, validationError[key]);
		    }
			
			self.disableFormAction();
		}
	};

	/**
	 * Event handler for Reset function 
	 */
	Backbone.View.prototype.reset = function (next) {
		var self = this;
		
		if(self.model.serverattributes){
			self.model.set(self.model.serverattributes, {validate:false, silent:true});
			
			if(self instanceof Backbone.FormView && self.enableFormAction)
				self.disableFormAction();
		}
	}

	/**
	 * hidden function for saving the record to the remote Server
	 */
	Backbone.View.prototype.__save = function (next) {
	    var self = this;
	    
	    if(self.model.isValid()){
	    	self.trigger('beforesave');
	    	
	    	self.model.save(null, {
	        	wait:true,
	        	validate:true,
	            success: function (model, response, options) {
	            	if(next)
	            		next();
	            	self.trigger('aftersave');
	            },
	            error: function (model, response, options) {
	            	if(next)
	            		next(response);
	            	
	            	self.trigger('save_error', this, model, response, options);
	            }
	        });
	    }
	}

	/**
	 * To fetch model data from the remote server
	 */
	Backbone.View.prototype.fetchData = function(callback){
		var self = this;

	    self.fieldsettings = self.fieldsettings||{};
		self.validation = {};
		self.defaultmodel = {};
		
		if(self.options.uri && window.urimappings){
			var uriid = self.options.uri.replace('#', '');
			
			if(window.urimappings[uriid] && window.urimappings[uriid].fieldsettings){
				self.fieldsettings = _.extend({}, window.urimappings[uriid].fieldsettings);
			}
			
			if(window.urimappings[uriid] && window.urimappings[uriid].validation){
				self.validation = _.extend({}, window.urimappings[uriid].validation);
			}
			
			if(window.urimappings[uriid] && window.urimappings[uriid].defaultmodel){
				self.defaultmodel = _.extend({}, window.urimappings[uriid].defaultmodel);
			}
		}
		
		self.fieldsettings = _.extend(self.fieldsettings, self.options.fieldsettings, self.options.modelsettings);
		self.validation = _.extend(self.validation, self.options.validation);
		self.defaultmodel = _.extend(self.defaultmodel, self.options.defaultmodel);
		
		if(self.model && !(self.model && self.model.options && self.model.options.newmodel) && !(self.model.options && self.model.options.local)){
			self.model.fetch({
		    	success: function(data){
		    		if(callback)
		    			callback(null, data);
		    	}, error:function(data, error){
		    		if(callback)
		    			callback(error);
		    	}
		    });
		}else if(callback)
			callback();
	};

	/**
	 * To fetch model data from the remote server
	 */
	Backbone.View.prototype.getModelData = function(){
		var self = this;
		var modeldata = _.pick(self.options, Backbone.View.GLOBAL_FIELDS);
		
		if(self.defaultmodel)
			_.extend(modeldata, self.defaultmodel||{}); 
		
		if(self.model){
			if(self.model instanceof Backbone.Model)
				modeldata = _.extend(modeldata, self.model.toJSON());
			else if(self.model instanceof Backbone.Collection)
				modeldata = _.extend(modeldata, {info:{count:self.model.totalrecords||self.model.models.length}, results:self.model.toJSON()});
			else if (self.model.models)
				modeldata = _.extend(modeldata, {info:{count:self.model.totalrecords||self.model.models.length}, results:self.model.toJSON()});
			else if (self.model)
				modeldata = _.extend(modeldata, self.model.toJSON());
		}
				
		// set the user preference also in to the array
		if(window.userprofile)
			modeldata.userprofile = window.userprofile.toJSON();
		else
			modeldata.userprofile = {};
		
		// display uri mapping model
		return 	modeldata;
	};

	/**
	 * Overriding Backbone render function
	 */
	Backbone.View.prototype.render = function (options) {
		var self = this;
		options=options||{};
		// event for before render
		if(!options.silent)
			self.trigger('beforerender');

		if(self.beforeRender) // can use for extended views
			self.beforeRender();
		
		/**
		 * Set the css class defined in the model view
		 */
	    if(self.options.cssclass||self.cssclass)
	    	self.$el.addClass(self.options.cssclass||self.cssclass);
	    
	    if(self.options.dataprops)
	        for(var propkey in self.options.dataprops){
	        	self.$el.attr("data-" + propkey, self.options.dataprops[propkey]);
	        }
	    
	    // loading the content in to the html
	    if(self.template !== 'function' && self.options.templateError)
	    	self.log('Error while setting Template');
	    else {
	    	$(this.el).attr("data-remote-loading", "loaded");
	    	self.$el.html(self.template(self.getModelData()));
	    }
		
	    // set some title in the view
	    //self.$('.view-info').html('template : '+self.options.templateName+ '-model url:'+JSON.stringify(self.options));
	        
		// event for after render
	    if(!options.silent)
	    	self.trigger('afterrender');

		if(self.afterRender) // can use for extended views
			self.afterRender();
		
	    return this;
	};

	/**
	 * Data table integration customize this method in case need a specific datatable initialization function
	 * - define your datatable configurations inside options:plugins:datatable
	 */
	Backbone.View.prototype.registerDatatable = function(){
		var self = this;
		
		var datatable_el = self.$('[data-plugin="datatable"]');
		if(datatable_el.DataTable){
			var datatabloptions = _.extend({}, self.options.plugins['datatable']);
			
			if(self.model instanceof Backbone.Collection){
				if(self.model.totalrecords){
					datatabloptions.recordsTotal=datatabloptions.deferLoading=self.model.totalrecords;
					datatabloptions.recordsFiltered=self.model.models.length
				}
				
				var last_id;
				if(self.model.models && self.model.at(self.model.models.length - 1))
					var last_id = self.last_id = self.model.at(self.model.models.length - 1).get("_id");
				self.searchurl = (self.model.url|self.model.urlRoot)+'/search';
				
				if(self.options.search){
					self.searchurl = self.options.search.urlRoot;
				}
				
				if(!datatabloptions.serverSide)
					datatabloptions.sorting=true;
				else{
					datatabloptions.ajax=function(data, callback, settings){
						var paginationurl = (self.searchurl);
						if(self.last_id)
							var paginationurl = (self.searchurl) + "?_id>="+self.last_id
						
						$.ajax(paginationurl, {success : function(data){
							var datatableajaxdata={recordsTotal:0, recordsFiltered:0, data:[] };
							
							if(data && typeof data == 'object' && typeof data.length == "number"){
								if(data)self.last_id=data[data.length-1]['_id'];
								
								datatableajaxdata={
									recordsTotal:self.model.totalrecords, 
									recordsFiltered:self.model.totalrecords, 
									data:data
								};	
							}else{
								if(data.results)self.last_id=data.results[data.results.length-1]['_id'];
								
								datatableajaxdata={
									recordsTotal:(data.info ? data.info.count:self.model.totalrecords), 
									recordsFiltered:(data.info ? data.info.count:self.model.totalrecords), 
									data:data.results
								};
							}
							callback(datatableajaxdata);
						}});
					};	
				}
			}
			
			datatable_el.each(function(){
				try{
					var datatable = $(this).DataTable(datatabloptions);
					
					if(datatabloptions && datatable.buttons && datatable.buttons()){
						datatable.buttons().container()
							.prependTo( $('.col-sm-6:eq(1)', datatable.table().container() ) );

						datatable.buttons().container().addClass('pull-right');	
					}
					
//					datatable.on( 'order.dt search.dt page.dt', function () {
//						console.log("Pagination called");
//						console.log(datatable.page.info());
//						datatable.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
//				            cell.innerHTML = datatable.page.info().start + i+1;
//				            console.log(cell);
//				        } );
//				    } );
				}catch(error){
					self.log("registerDatatable", error);
				}
			});
		}
	};
	
	var registerFieldSettings = function(self, fieldsettings){
		for(var i in fieldsettings){
			var fieldsetting = fieldsettings[i];
			fieldsetting.field=i;
			
			if(self instanceof Backbone.FormView || self.options.viewmode == "form"){
				Backbone.Fieldplugins.register(fieldsetting, self.$('[name='+fieldsetting.field+']'), self);
			}

			if((self.model && self.model instanceof Backbone.Model) && fieldsetting.hasOwnProperty('modelsettings') && fieldsetting.modelsettings && fieldsetting.multiple){
				var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
				var parenturimapping = _.extend({}, parenturimapping_);
				var subservicename = fieldsetting.field;
				
				if( parenturimapping.field != subservicename )
					subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);

				parenturimapping.field = subservicename;
				parenturimapping.uri = subservicename;
				
				var parenturi;
				if(self.options.uri){
					parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
				}
									
				self.loadSubModelView(fieldsetting, parenturimapping, true);
			} else if((self.model && self.model instanceof Backbone.Model) && ( fieldsetting.model || fieldsetting.type == "object" || fieldsetting.dataType == "string" || (fieldsetting.hasOwnProperty('modelsettings') && fieldsetting.modelsettings))){
				var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
				var parenturimapping = _.extend({}, parenturimapping_);
				var subservicename = fieldsetting.field;
				
				if( parenturimapping.field != subservicename )
					subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);
				
				parenturimapping.field = subservicename;
				parenturimapping.uri = subservicename;

				var parenturi;
				if(self.options.uri){
					parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
				}
													
				self.loadSubModelView(fieldsetting, parenturimapping, true);
			}
		}

		if(self.afterConfigure)
			self.afterConfigure();
	};

	return Backbone.View;
}));