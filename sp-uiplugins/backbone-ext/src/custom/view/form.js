define( [
	"./../../core.js",
	"./core.js",
	"./../../model.js"
], function(Backbone, CustomBackboneView, BackboneExtModel){
	"use strict";
	
	/**
	 * Form with functions to handle the form submit
	 */
	var FormView = CustomBackboneView.extend({
		viewmode:"form",
		events:{
			/*"click .modelaction":"modelAction",*/
			"change" 		: "change",
			"reset form" 	: "reset",
			"submit form" 	: "save",
			"click .save" 	: "save",
			"change .subview" : "subViewChange",
			"click .back" 	: function(){
				Backbone.history.history.back();
			}
		},
		afterInitialize:function(){
			var self = this;
			
			// now let us check whether subview is selected
			if(self.options.subviewuri){
				//don't load the main view instead load the sub view;
				self.on("beforeload", function(){
					if(self.options.fieldsettings && self.options.fieldsettings[self.options.subviewuri]){
						var fieldsetting = self.options.fieldsettings[self.options.subviewuri];
						
						var modeluri = self.model.url();
						
						self.model.url= function(){
							return modeluri+'?fields='+ encodeURIComponent(self.options.subviewuri+'=1'); 
						};
						 
						self.fetchData(function(){
							self.openSubmodelView(self.options.subviewuri, {
								afterload:function(){
									self.trigger("afterload")
								}
							});
						});
					}
//					
//					
//					if(self.options.fieldsettings && self.options.fieldsettings[self.options.subview]){
//						var fieldsetting = self.options.fieldsettings[self.options.subview];
//						fieldsetting.field = self.options.subview;
//						
//						var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
//						var parenturimapping = _.extend({}, parenturimapping_);
//						var subservicename = self.options.subview;
//						
//						if( parenturimapping.field != subservicename )
//							subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);
//
//						parenturimapping.field = subservicename;
//						parenturimapping.uri = subservicename;
//						
//						var parenturi;
//						if(self.options.uri){
//							parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
//						}
//						var modeluri = self.model.url();
//						self.model.url= function(){
//							return modeluri+'?fields='+ encodeURIComponent(fieldsetting.field+'=1'); 
//						};
//						 
//						self.fetchData(function(){
//							var submodelView = self.loadSubModelView(fieldsetting, parenturimapping, true, {
//								afterload:function(){
//									self.trigger("afterload")
//								}
//							});
////							
////							if(submodelView)
////								submodelView.on("afterload", );
//						});
//						 //$.get(self.options.urlRoot + '?fields='+ encodeURIComponent(fieldsetting.field+'=1'));
//					}
				});
				
//				if((self.model && (self.model.objecttype == "model" || self.model instanceof Backbone.Model || self.model instanceof BackboneExtModel)) && fieldsetting.hasOwnProperty('modelsettings') && fieldsetting.modelsettings && fieldsetting.multiple){
//					var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
//					var parenturimapping = _.extend({}, parenturimapping_);
//					var subservicename = fieldsetting.field;
//					
//					if( parenturimapping.field != subservicename )
//						subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);
//
//					parenturimapping.field = subservicename;
//					parenturimapping.uri = subservicename;
//					
//					var parenturi;
//					if(self.options.uri){
//						parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
//					}
//										
//					self.loadSubModelView(fieldsetting, parenturimapping, true);
//				}
			}
			
			self.on('afterload', function(){
				if(self.$('.notification').length <= 0){
					self.$('form').before('<div class="notification"></div>');
				}

				self.disableFormAction();
			});
			
			if(self.model){
				if(self.options.onInvalid && self.model)
		    	    self.model.on('invalid', self.options.onInvalid);
		        
		    	if(self.onInvalid && self.model)
		        	self.model.on('invalid', function(){self.onInvalid();});
		        
		        if(self.onInvalid && self.model)
		        	self.model.on('invalidfield', function(error){self.onInvalid(error);});
		        
				self.model.on('validfield', function(view, key){
	    	    	self.removeFormValidation(key);
	    	    });
				
				if(self.model.objecttype == "model" || self.model instanceof Backbone.Model || self.model instanceof BackboneExtModel){
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
		        	if(response && response.responseJSON)
		        		self.showNotification({classname:'bg-danger', message:response.responseJSON.exception.id});
		        	else
		        		self.showNotification({classname:'bg-danger', message:'Some issues saving.'});
		        });
			}
		},
		subViewChange:function(event, originalEvent){
			var self = this;
			
			var subviewid = $(event.target).closest(".subview").attr('data-subview-id');
			if(self[subviewid] && (self[subviewid] instanceof Backbone.FormView || self[subviewid].viewmode=="form"))
				self[subviewid].change.apply(event, originalEvent);
			
			return false;
		}, enableFormAction:function(){
			var self = this;
			
			self.$('form .save, .add-sub').removeClass('disabled').removeAttr('disabled', 'disabled');
		}, disableFormAction:function(){
			var self = this;
			
			self.$('form .save, .add-sub').addClass('disabled').attr('disabled', 'disabled');
		}, removeFormValidation:function(key){
			var self = this;
			
			if(key) {
				self.$('[name='+key+']:first').closest(self.options.formgroup).removeClass('has-error').removeClass('has-feedback');
				self.$('#'+key+'_status:first').addClass('sr-only').html('');	
			}
		}, displayFormValidation:function(key, message){
			var self = this;
			self.options.formgroup = '.form-group';
			
			self.$('[name='+key+']:first').closest(self.options.formgroup).addClass('has-error').addClass('has-feedback');
			self.$('#'+key+'_status:first').removeClass('sr-only').html(message||'');
		},
		/**
		 * To load sub model form in case of nested models and nested sub forms
		 */
		loadSubModelForm : function(fieldsetting, parenturimapping, viewmode, selmodel){
			var self = this;
			
			parenturimapping = parenturimapping||self.parenturimapping||window.app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
			
			var subservicename = parenturimapping.field;
			var containerid = fieldsetting.field.replace('/', '_');
			
			var container = $('#' + containerid +'_modal_container');
			
			if(container && container.length <= 0){
				container = $('<div id="'+ containerid +'_modal_container'+'"></div>');
				container.appendTo(document.body);
			}
			
			var submodelname = fieldsetting.field + 'Model';
			var submodeview = fieldsetting.field + 'FormView';
			
			if(!self[submodeview]||true){
				var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
				
				if(selmodel && selmodel.toJSON)
					defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
				
				self[submodelname] = new BackboneExtModel(defaultmodel);
				
				var servicetemplateurl = 'sub' + parenturimapping.form.templateName+ '&layout=popup&subservice=' + (subservicename);
				if(parenturimapping.form.templateName.indexOf("?") == -1)
					servicetemplateurl = 'sub' + parenturimapping.form.templateName+ '?layout=popup&subservice=' + (subservicename);
				
				var viewoptions = {
					el:container,
					templateName:servicetemplateurl, 
					model:self[submodelname],
					modelsettings:fieldsetting.modelsettings,
					validation:fieldsetting.validation||{},
					uri:parenturimapping.uri + '/' +fieldsetting.field
				};
				
				if(parenturimapping.templatedir)
					viewoptions.templatedir=parenturimapping.templatedir;
				
				if(viewmode == 'view'){
					viewoptions.templateName = 'sub' + parenturimapping.details.templateName+ '&layout=popup&subservice=' + (subservicename);
					if(parenturimapping.details.templateName.indexOf("?") == -1)
						viewoptions.templateName = 'sub' + parenturimapping.details.templateName+ '?layout=popup&subservice=' + (subservicename);
				}else
					viewoptions.viewmode='form';
				
				self[submodeview] = app.getView(viewoptions);
				
				self[submodeview].parenturimapping=parenturimapping;
				
				self[submodeview].on("afterload", function(){
					if((self[submodeview].viewmode == "form" || self[submodeview] instanceof Backbone.FormView)){
						self[submodeview].$('.form-actions').append('<input type="button" class="disabled btn btn-primary add-sub" value="'+getMessage("add")+'">');
					}
				});
				self[submodeview].options.popup =true;
				self[submodeview].load(function(){
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
									if(fieldsetting.dataType =="string" && fieldsetting.multiple && (self.model.objecttype == "model" || self.model instanceof Backbone.Model || self.model instanceof BackboneExtModel )){
										var exisitingdata = self[fieldsetting.field + 'View'].model.get("results")||[];
										exisitingdata.push(self[submodeview].model.get(fieldsetting.field));
										
										self[fieldsetting.field + 'View'].model.set(fieldsetting.field, exisitingdata);
										self[fieldsetting.field + 'View'].refresh();
										
										self.model.set(fieldsetting.field, exisitingdata);
									}else if(!fieldsetting.multiple/*self[submodeview].model instanceof Backbone.Model*/){
										self[fieldsetting.field + 'View'].model.set(self[submodeview].model.toJSON());
										self[fieldsetting.field + 'View'].refresh();
										
										self.model.set(fieldsetting.field, self[submodeview].model.toJSON());
									}else
										self[fieldsetting.field + 'View'].model.add(self[submodeview].model.toJSON());
									
									self[submodeview].$('.modal').modal('hide');
								}
							}
						})(self, fieldsetting, submodeview)
					);
				});
			}else{
				var defaultmodel = _.extend({local:true}, fieldsetting.model||{});
				
				if(selmodel && selmodel.toJSON && selmodel.cid != self[submodeview].model.cid){
					defaultmodel = _.extend(defaultmodel, selmodel.toJSON());
					self[submodelname].set(defaultmodel);
					self[submodeview].$('.modal').modal('show');
				}else{
					self[submodeview].$('.modal').modal('show');
				}
			}
		}, save : function (next) {
		    var self = this;
		    
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
						__save(self, callback);
				});
			else
				__save(self, callback);	
		}
	});

	FormView.prototype.enable = function (key, options, subprops) {
		var self = this;
		var fields = [];
		options=options||{silent:true};
		
		if(typeof key == 'Array'){
			fields = key;
		}else
			fields = [key];
		
		if(self.fieldsettings && self.fieldsettings[key] && subprops && typeof subprops === 'object'){
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

	FormView.prototype.disable = function (key, options, subprops) {
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

	FormView.prototype.resetValue = function (key, value, options) {
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
					}	
					
					if(options.originalfield != key)
						self.changeDependencies(key, changedmodel[key], options);
//					}		
				}
			}
		}
		if(options && options.originalfield && key && (value == 'show' || value == 'hide')){
			//console.log("we dont set values for changed model from dependencies change");
		}else{
			self.model.set(changedmodel, options);
		}
	}

	FormView.prototype.setValue = function (key, value, options) {
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
					}
					
					if(options.originalfield != key)
						self.changeDependencies(key, changedmodel[key], options);
//					}		
				}
			}else if(options.originalfield != key)
				self.changeDependencies(key, changedmodel[key], options);
		}
		
		if(options && options.originalfield && key && (value == 'show' || value == 'hide')){
//			console.log("we dont set values for changed model from dependencies change");
		}else {
			self.model.set(changedmodel, options);	
		}
	}

	FormView.prototype.changeDependencies = function (field, value, options) {
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
									
									var selector = new Backbone.Utils.SimpleSelector(selectoroptions);
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
										
										var selector = new Backbone.Utils.SimpleSelector(selectoroptions);
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
	FormView.prototype.change = function (event, originalEvent) {
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
	 * Event handler when the model is invalid
	 */
	FormView.prototype.onInvalid = function (error) {
		var self = this;
		
		if(self.model.validationError){
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
	FormView.prototype.reset = function (next) {
		var self = this;
		
		if(self.model.serverattributes){
			self.model.set(self.model.serverattributes, {validate:false, silent:true});
			
			if(self.enableFormAction)
				self.disableFormAction();
		}
	}
	
	var __save = function (self, next) {
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
	    }else {
	    	console.log(self.model.validations)
	    	console.log("Model is not valid");
	    	console.log(self.model.validationError);
	    }
	};
	
	return FormView;
});