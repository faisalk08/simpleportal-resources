(function (factory) {
	"use strict";
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([
			"./core.js",
			"./model.js",
			"./collection.js"
	    ], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		module.exports = factory(require('./core.js'));
	} else {
		// Global browser
		factory(Backbone);
	}
}(function (Backbone, BackboneExtModel, BackboneExtCollection) {
	"use strict";
	var exports = this;//{};
	
	var BackboneExtView = Backbone.View.extend({
		afterLoad:function(){}
	});
	
	BackboneExtView.GLOBAL_FIELDS=['layout', 'themes', 'curtheme'];

	BackboneExtView.DEFAULT_OPTIONS={
		templatedir:'templates/',
		templateExtension:'.html',
		plugins:{
			'datatable': {
				colReorder: true,
				responsive:true,
				columnDefs: [
		             { targets: 'no-sort', orderable: false }
	            ]
			},
			"displayconfig":{
				"mainbody":".panel-body",
				"configboxcontainer":".configbox-control",
				"configboxcontrol":".config",
    			"configbox":'.configbox',
    			"configboxtable":'.configbox table'
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
	BackboneExtView.prototype.log= function(){
		if(console&&console.log)
			console.log.apply(this, arguments);
	};

	/**
	 * To initialize the Backbone view
	 */
	BackboneExtView.prototype.initialize = function (options) {
	    var self = this;
	    self.options = _.extend({}, self.DEFAULT_OPTIONS, BackboneExtView.DEFAULT_OPTIONS, options);
	    
	    if(self.options.viwemode)
	    	self.viewmode = self.options.viewmode;
	    
	    if(options && options.model)
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
	    
	    self.trigger('initialize');
	    
	    if(self.afterInitialize) // can use for extended views
			self.afterInitialize();
	}
	
	/**
	 * Get the uri of the view
	 */
	BackboneExtView.prototype.getUri = function(){
		// get the uri using the view mode and model id
		var uri = this.uri||this.options.uri;
		
		if(this.viewmode)
			uri = uri + '/' + this.viewmode;
		
		if(this.model && this.model.id)
			uri = uri + '/' + this.model.id;
		
		return uri;
	}

	/**
	 * to ge the template name 
	 */
	BackboneExtView.prototype.getTemplateName = function(){
		return this.options.templateName||this.templateName||this.options.modelName||this.modelName;
	}

	/**
	 * To get the Template path for the view
	 */
	BackboneExtView.prototype.getRemoteTemplatePath = function(){
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
	BackboneExtView.prototype.loadTemplate = function(templateName, templatePath, callback){
		var self = this;
		
		if(self.template && typeof self.template == "function"){
			if(typeof templateName == 'function')
				templateName();
			else if(typeof templatePath == 'function')
				templatePath();
			else
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
	
	var getPopupTemplate = function(id){
		return '<div class="modal fade" id="'+id+'_Modal" tabindex="-1" role="dialog" aria-labelledby="'+id+'_ModalLabel">\
				<div class="modal-dialog" role="document">\
		    	<div class="modal-content">\
		      		<div class="modal-header">\
		        		<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
		        		<h4 class="modal-title" id="'+id+'_ModalLabel"></h4>\
		      		</div>\
		      		<div class="modal-body"><%templatedata%></div>\
		     	</div>\
			</div>\
		</div>';
	}
	
	/**
	 * To set the template in to the view
	 */
	BackboneExtView.prototype.setTemplate = function(callback){
		var self = this;
		
		if(self.template && typeof self.template == "function")
			callback();
		else if (self.template && typeof self.template == "string"){
			if(self.options.popup)
				self.template = _.template(getPopupTemplate(self.getTemplateName()).replace("<%templatedata%>", templatedata));
			else
				self.template =_.template(self.template);
			
			callback();
		}else
			self.loadTemplate(function(templatedata, error){
				if(templatedata){
					if(self.options.popup)
						self.template = _.template(getPopupTemplate(self.getTemplateName()).replace("<%templatedata%>", templatedata));
					else
						self.template = _.template(templatedata);
				}else{
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
	BackboneExtView.prototype.load = function(container, callback){
		var self = this;
				
		if(container && typeof container != 'function'){
			// container where to load the content
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
		
		if(self.options.subviewuri)
			return;
		
		self.renderPagedata = function(callback){
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
		
		/**
		 * set the template if template is not loaded yet
		 */
		self.setTemplate(function(){
			/**
			 * callback after fetching data from remote server 
			 */
			self.fetchData(function(error, data) {
				if(error && error.status == 200 && error.responseText){
					self.renderPagedata(callback);
				} else if(error){
					var exception = error;
					if(exception.responseJSON && exception.responseJSON.exception)
						exception = exception.responseJSON.exception;
					else if(exception.exception && exception.exception)
						exception = exception.exception;
					
					app.showMessage('error', {classname:'bg-danger', title:'Error while retreiving model data', message:exception});
					
					self.trigger('afterload');
					
					if(callback)
						callback(exception);
					else
						return self;
				} else{
					/**
					 * Now load the data in to the view element
					 */
					self.renderPagedata(callback);
				}
			});
		});
		
//		if(self.model)
//			self.model.on('sync', function(){
//				self.renderPagedata();	
//			});
	}

	/**
	 * To register various plugins available 
	 */
	BackboneExtView.prototype.configure = function(){
		var self = this;
		
		self.fieldsettings = _.extend({}, self.__proto__.fieldsettings, self.fieldsettings);
		self.validation = {};

		if(self.options.uri && window.urimappings){
			var uriid = self.options.uri.replace('#', '');
			
			if(window.urimappings[uriid] && window.urimappings[uriid].fieldsettings){
				self.fieldsettings = _.extend({}, self.fieldsettings, window.urimappings[uriid].fieldsettings);
			}
			
			if(window.urimappings[uriid] && window.urimappings[uriid].validation){
				self.validation = _.extend({}, self.validation, window.urimappings[uriid].validation);
			}
		}
		
		self.fieldsettings = _.extend({}, self.fieldsettings, self.options.fieldsettings, self.options.modelsettings);
		
		self.validation = _.extend({}, self.validation, self.options.validation);
		
		if(self.model && (self.model.objecttype == "model" || self.model instanceof Backbone.Model|| self.model instanceof BackboneExtModel)){
			//@TODO BUG when sub view loaded sub validation is appending to top views model
//			self.model.registerValidation(self.validation);
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
			
		// register Simple selector plugin using the url argument
		// unnecessary loading the field setting plugin in list page
		if(self.viewmode == "form" || self.viewmode == "details" || (Backbone.FormView && self instanceof Backbone.FormView)){
			if(self.fieldsettings && Object.keys(self.fieldsettings).length > 0){
				registerFieldSettings(self, self.fieldsettings);
			}
		}else if(self.afterConfigure){
			self.trigger("afterconfigure");
			self.afterConfigure();
		}	
		
		self.displayValidation();
	};

	/**
	 * To refresh the content 
	 */
	BackboneExtView.prototype.refresh = function(callback){
		var self = this;
		
		// reload the content 
		self.load(callback);
	};

	/**
	 * To reset the notification
	 */
	BackboneExtView.prototype.resetNotification = function(options){
		var self = this;
		
		self.$(self.options.notification.container).html('');
	};

	/**
	 * To show the notification
	 */
	BackboneExtView.prototype.showNotification = function(options){
		var self = this;
		
		var options = _.extend(self.options.notification||{}, options);
		var _template = _.template('<p class="<%= classname %>"><%= message %></p>');
		
		self.$(self.options.notification.container).html(_template(options));
	};

	BackboneExtView.prototype.displayValidation = function () {
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

	/**
	 * To fetch model data from the remote server
	 */
	BackboneExtView.prototype.fetchData = function(callback){
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
		
		if(self.model 
			&& !(self.model && self.model.options && self.model.options.newmodel) 
			&& !(self.model.options && self.model.options.local)){
			var fetchoptions = {
				success: function(model, data){
		    		if(callback)
		    			callback(null, data);
		    	}, error:function(data, error){
		    		if(error && error.status == 200 && error.responseText){
		    			var responseresult = JSON.parse(error.responseText);
		    			if(responseresult)
		    				self.model.set(responseresult);
		    			
		    			callback(null, responseresult);
		    		}else if(callback)
		    			callback(error);
		    	}
			}
			
			var url;
			if(typeof self.model.url == 'string')
				url = self.model.url;
			else if(typeof self.model.url == "function")
				url = self.model.url()
			if(!url || url.indexOf("http") == 0){
				callback("Not a valid url - please configure url | crossDomain settings properly to continue.")
			}else
				self.model.fetch(fetchoptions);
		} else if(callback)
			callback();
	};

	/**
	 * To fetch model data from the remote server
	 */
	BackboneExtView.prototype.getModelData = function(){
		var self = this;
		var modeldata = _.pick(self.options, BackboneExtView.GLOBAL_FIELDS);
		
		if(self.defaultmodel)
			_.extend(modeldata, self.defaultmodel||{}); 
		
		if(self.model){
			if((self.model.objecttype == "model" || self.model instanceof Backbone.Model
				|| self.model instanceof BackboneExtModel)/* && !(self.model && self.viewmode == "list")*/)
				modeldata = _.extend(modeldata, self.model.toJSON());
			else if(self.model instanceof Backbone.Collection/* || (self.model && self.viewmode == "list") */){
				var count = self.model.totalrecords;
				if(!count && self.model.models)
					count = self.model.models.length;
				
				modeldata = _.extend(modeldata, {info:{count:count}, results:self.model.toJSON()});
			} else if (self.model.models){
				modeldata = _.extend(modeldata, {info:{count:self.model.totalrecords||self.model.models.length}, results:self.model.toJSON()});
			} else if (self.model)
				modeldata = _.extend(modeldata, self.model.toJSON());
		}
				
		// set the user preference also in to the array
		if(window.userprofile)
			modeldata.userprofile = window.userprofile.toJSON();
		else if(window.app.userprofile)
			modeldata.userprofile = window.app.userprofile.toJSON();
		else
			modeldata.userprofile = {};
		
		modeldata.getMessage=(function(view){
			return function(key, args){
				return window.getMessage(key, args);
			}
		})(self);
		
		if(!modeldata.name && self.options&&self.options.name)
			modeldata.name =self.options.name;
		if(!modeldata.title &&self.options&&self.options.title)
			modeldata.title =self.options.title
		
//		console.log(self.viewmode);
		
		// display uri mapping model
		return 	modeldata;
	};

	/**
	 * Overriding Backbone render function
	 */
	BackboneExtView.prototype.render = function (options) {
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
	    	self.$el.data("remote-loading", "loaded");
	    	
	    	self.$el.html(self.template(self.getModelData()));
	    }
		
	    // set some title in the view
//	    self.$('.view-info').html('template : '+self.options.templateName+ '-model url:'+JSON.stringify(self.options));
	        
		// event for after render
	    if(!options.silent)
	    	self.trigger('afterrender');

		if(self.afterRender) // can use for extended views
			self.afterRender();
		
	    return this;
	};

	var setDisplayConfig = function(self){
		if(self.displayconfig){
			var fields = self.displayconfig.fields();
			
			if(self.model && !self.model.models){
				if(fields&&fields.length > 0){
					self.model.set('displayfields', fields);
				}else
					self.model.set('displayfields', null);
			}
			
			if(self.model && !self.model.get('displayfields') && !self.model.models)
				self.model.set('displayfields', []);	
		}
	};
	
	var openConfigBox = function(self){
		var displayconfigoptions = _.extend({}, self.options.plugins['displayconfig']);
    	
    	var $configboxtable = self.$(displayconfigoptions.configboxtable);
		
		if($configboxtable.length > 0 && $configboxtable.is(':visible')){
			var curfields = [];
			
			self.$(':checkbox:checked', $configboxtable).each(function(){
				curfields.push($(this).val());
			});
			
			self.displayconfig.setFields(curfields);
			
			self.displayconfig.save(function(){
				$configboxtable.hide();
				
				setDisplayConfig(self);
				self.load();
			});
		}else{
			if($configboxtable && $configboxtable.length > 0){
				$configboxtable.show();
			}else{
				if(self.$(displayconfigoptions.configbox).length <= 0)
					self.$(displayconfigoptions.mainbody).append("<div class='"+(displayconfigoptions.configbox.replace(/\./, ''))+"'></div>");
				
				var $table = getFieldconfigTable(self); // get the config table
				
				self.$(displayconfigoptions.configbox).html($table);//self.model.get('info'));
			}
		}
	};
	
	var getFieldconfigTable = function(self){
    	var $table = $('<table class="table table-striped table-hover config-box"><tbody></tbody></table>');
		
		var fields = [];
		if(self.model&&self.model.models){
			var fristdata = self.model.models[0];
			
			for(var field in fristdata.attributes){
				fields.push(field);
			}
		}else if(self.model){
			var fields = self.model.get('info')['fields'];
			
			var curfields = self.displayconfig.fields();
		}
		
		for(var i in fields){
			var field = fields[i];
			
			var visible = $.inArray(field, curfields) != -1 ;
			
			if(fields[i] == '_id')
				var $tr = $('<tr/>').html('<td><input type="checkbox" value='+fields[i]+' checked readonly/> '+fields[i]+'</td>');
			else
				var $tr = $('<tr/>').html('<td><input type="checkbox" value='+fields[i]+' '+(visible ? 'checked' : '')+'/> '+fields[i]+'</td>');
			
			$('tbody', $table).append($tr);
		}
		
    	return $table;
    }
	
	/**
	 * 
	 */
	BackboneExtView.prototype.openConfigBox=function(){
    	var self = this;
    	
    	openConfigBox(self);
    };
    
    BackboneExtView.prototype.registerDisplayconfig = function(){
    	var self = this;
    	var displayconfigoptions = _.extend({}, self.options.plugins['displayconfig']);
    	
    	// if it is field config
		var modelname= "testmodel";
		
		self.displayconfig = new Backbone.Utils.DataModelDisplayConfig({modelname:modelname});
		
		var $configboxcontrol = self.$(displayconfigoptions.configboxcontainer + ' '+ displayconfigoptions.configboxcontrol);
		
		if($configboxcontrol.length <= 0){
			$configboxcontrol = $("<i class='glyphicon glyphicon-cog "+displayconfigoptions.configboxcontrol+"'></i>");
			
			self.$(displayconfigoptions.configboxcontainer).append($configboxcontrol);
		}
		
		if($configboxcontrol.length > 0)
			$configboxcontrol.on("click", function(){
				self.openConfigBox();
			});
		
		setDisplayConfig(self);
    }
	
	/**
	 * Data table integration customize this method in case need a specific datatable initialization function
	 * - define your datatable configurations inside options:plugins:datatable
	 */
	BackboneExtView.prototype.registerDatatable = function(){
		var self = this;
		
		var datatable_el = self.$('[data-plugin="datatable"]');
		if(datatable_el.length  >0 && datatable_el.DataTable){
			var datatabloptions = _.extend({}, self.options.plugins['datatable']);
			
			if(self.model && (self.model.objecttype == 'collection' || self.model.models || self.model instanceof Backbone.Collection)){
				if(self.model.totalrecords){
					datatabloptions.recordsTotal=datatabloptions.deferLoading=self.model.totalrecords;
					datatabloptions.recordsFiltered=self.model.models.length
				}
				
				var last_id;
				if(self.model.models && self.model.models.length > 0 && self.model.at(self.model.models.length - 1))
					var last_id = self.last_id = self.model.at(self.model.models.length - 1).get("_id");
				
				self.searchurl = (self.model.url|self.model.urlRoot)+'/search';
				
				if(self.options.search){
					self.searchurl = self.options.search.urlRoot;
				}
				
				if(datatabloptions.serverSide)
					datatabloptions.sorting=false;
				
				if(!datatabloptions.serverSide)
					datatabloptions.sorting=true;
				else{
					datatabloptions.ajax=function(data, callback, settings){
						var paginationurl = (self.searchurl);
						if(self.last_id && data.start != 0)
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
							}else {
								if(data.results.length > 0)
									if(data.results)self.last_id=data.results[data.results.length-1]['_id'];
								
								datatableajaxdata={
									recordsTotal:(data.info ? data.info.count:self.model.totalrecords), 
									recordsFiltered:(data.info ? data.info.count:self.model.totalrecords), 
									data:data.results
								};
							}
//							console.log(datatableajaxdata);
							callback(datatableajaxdata);
						}});
					};	
				}
			}
			
			datatable_el.each(function(index, dtable){
				try{
					console.log(datatabloptions);
					// get the first row fromt he table and check if the last field is actions
					var thcount = self.$('tr:first th', $(dtable)).length;
					console.log("datatable bug ->" + thcount);
					console.log(self.$('tr:first th:last', $(dtable)).data());
					console.log(self.$('tr:nth-child(1) td:last', $(dtable)).html());
					var index =0;
					var indexfield;
					
//					datatabloptions.columns=[];
					self.$('tr:first th', $(dtable)).each(function(){
						var columnprops = $(this).data();
						
						if(!columnprops.hasOwnProperty("visible"))
							columnprops.visible = true;
						
						if(columnprops.data == "")
							delete columnprops.data;
////							columnprops.data = function(row, type, val, meta){
////								if (type === 'set') {
////							        
////							        return;
////								}  
////								console.log(row);
////								console.log(val);
////								console.log(type);
////								console.log(meta);
////								// 'sort', 'type' and undefined all just use the integer
////								return;
//							};
						
						columnprops.targets = [index++];
//						columnprops.defaultContent = '<!-- -->';
						if(columnprops.columntype == "index" ||
						   columnprops.columntype == "selector" ||
						   columnprops.columntype == "action"){
							columnprops.searchable = false;
							columnprops.orderable = false;	
						}
						
						if(columnprops.columntype == "index"){
							columnprops.data = function(row, type, val, meta){
								if (type === 'set') {
									if(meta)
										row.index= meta.settings._iDisplayStart + meta.row;
									
									return;
								} 
								return meta.settings._iDisplayStart + meta.row+1;
							};
							indexfield = index-1;
						} else if(columnprops.columntype == "selector"){
							columnprops.data = function(row, type, val, meta){
								if (type === 'set') {
									if(meta)
										row.index= meta.settings._iDisplayStart + meta.row;
									
									return;
								} 
								return '<input type="checkbox" class="selector"/>';
							};
							indexfield = index-1;
						}else if(!columnprops.data)
							columnprops.defaultContent = '<!-- -->';
						
						if(datatabloptions.columnDefs)
							datatabloptions.columnDefs.push(columnprops);
					});
					var datatable = $(dtable).DataTable(datatabloptions);
//					if(indexfield)
//						datatable.on( 'order.dt search.dt', function () {
//							datatable.column(indexfield, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
//					           console.log("Hello -->" + cell)
//								cell.innerHTML = i+1;
//					        } );
//					    } ).draw();
					
					if(datatabloptions && datatable.buttons && datatable.buttons()){
						datatable.buttons().container()
							.prependTo( $('.col-sm-6:eq(1)', datatable.table().container() ) );

						datatable.buttons().container().addClass('pull-right');	
					}
//					datatable.on( 'order.dt search.dt page.dt', function () {
//						console.log("Pagination called");
//						console.log(datatable.page.info());
//						datatable.column(indexfield, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
//				            cell.innerHTML = datatable.page.info().start + i+1;
//				            console.log(cell);
//				        } );
//				    } );
				}catch(error){
					console.log(error);
				}
			});
		}
	};
	
	var registerFieldSettings = function(self, fieldsettings){
		for(var i in fieldsettings){
			var fieldsetting = _.extend(fieldsettings[i]);
			
			if(fieldsetting && typeof fieldsetting === "object") {
				fieldsetting.field=i;
				
				if(self.viewmode == "form" || self.viewmode == "details" || (Backbone.FormView && self instanceof Backbone.FormView)){
					if(self.viewmode == "form" || (Backbone.FormView && self instanceof Backbone.FormView)){
						if(self.$('[name='+fieldsetting.field+']') && self.$('[name='+fieldsetting.field+']').data("fieldplugin-init")){
							self.log("registerFieldSettings:", "registering twice --- > " + fieldsetting.field)
						}else{
							Backbone.Fieldplugins.register(fieldsetting, self.$('[name='+fieldsetting.field+']'), self);
							
							self.$('[name='+fieldsetting.field+']').attr("data-fieldplugin-init", "true");
							
							if(fieldsetting.change){
								self.on('afterconfigure', (function(_self, _fieldsetting){
									return function(){
										var curvalue = _self.model.get(_fieldsetting.field);
										
										if(curvalue && _self.changeDependencies)
											_self.changeDependencies(_fieldsetting.field, curvalue);
									}
								})(self, fieldsetting));
							}
						}
						
						
						if(self.model && fieldsetting && fieldsetting.displayoptions && fieldsetting.displayoptions.custom){
							self.model.on("change:"+fieldsetting.field, function(){
								if(self.model.get(fieldsetting.field) == '-1'){
									self.openDialog(
										{type:'prompt', message:'Please provide the '+fieldsetting.field+' here!', title:'Custom '+fieldsetting.field},
										function(modal, data){
											self.model.set(fieldsetting.field, data.promptfield);
										}
									);
								}
							});
						}
					}
					
					if(
						(self.model 
						&& (self.model.objecttype == "model" 
							|| self.model instanceof Backbone.Model 
							|| self.model instanceof BackboneExtModel
						)) 
						&& fieldsetting.hasOwnProperty('modelsettings') 
						/*&& fieldsetting.modelsettings*/ 
						&& fieldsetting.multiple && fieldsetting.dataType=="string")
					{
						self.log("registerFieldSettings:", "model settings for strigng field string>>> ");
					} else if(
						(self.model 
						&& (self.model.objecttype == "model" 
							|| self.model instanceof Backbone.Model 
							|| self.model instanceof BackboneExtModel
						)) 
						&& fieldsetting.hasOwnProperty('modelsettings') 
						/*&& fieldsetting.modelsettings*/ 
						&& fieldsetting.multiple
						&& self.options.uri)
					{	
						var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
						var parenturimapping = _.extend({}, parenturimapping_);
						var subservicename = fieldsetting.field;
						
						if(parenturimapping.templatedir)
							parenturimapping.templatedir = parenturimapping.templatedir.replace("/templates/", "/" + subservicename + "/templates/");											
						
						if( parenturimapping.field != subservicename )
							subservicename = (parenturimapping.field ? parenturimapping.field + '/' + subservicename : subservicename);

						parenturimapping.field = subservicename;
						parenturimapping.uri = subservicename;
						
						var parenturi;
						if(self.options.uri){
							parenturimapping.uri = parenturi =  self.options.uri.replace('#', '');
						}
						self.loadSubModelView(fieldsetting, parenturimapping, true);
					} else if(
						(self.model 
						&& (self.model.objecttype == "model" 
							|| self.model instanceof Backbone.Model 
							|| self.model instanceof BackboneExtModel
						))
						&& (fieldsetting.model 
							&& (fieldsetting.type == "object" 
//								|| fieldsetting.dataType == "ssstring" 
								&& (
								fieldsetting.hasOwnProperty('modelsettings') 
								&& fieldsetting.modelsettings
							))
						)
						&& self.options.uri
						)
					{
						var parenturimapping_ = self.parenturimapping||app.getUriViewMapping(self.options.uri.replace('#', '')) ||{};
						var parenturimapping = _.extend({}, parenturimapping_);
						var subservicename = fieldsetting.field;
						
						parenturimapping.templatedir = parenturimapping.templatedir.replace("/templates/", "/" + subservicename + "/templates/");											
						
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
			}
		}

		if(self.afterConfigure)
			self.afterConfigure();
		
		self.trigger("afterconfigure");
	};

//	if(window && window.Backbone){
//		window.BackboneExtView=BackboneExtView;
//	}
	
	BackboneExtView.prototype.openDialog = function(actionprops, callback){
		var modalprops = _.extend({
			message : 'Are you sure to run '+ actionprops.action +' action on the selected item ?'
		}, actionprops); 
		
		app.openDialog(modalprops, callback);
	};
	
	return Backbone.View = BackboneExtView;
}));