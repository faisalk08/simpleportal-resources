window.translation_templates=/(Header|Side)/ig;

/**
 * Using load / loading / after Load as replacement for render
 * Will handle getting templare, load the remote data, then render the data and call the after load method
 */
window.ModelView = window.ModelView.extend({
 	afterLoad:function(callback){
 		if(callback)
 			callback();
 	},
 	loading:function(cancel){},
	load:function(contentdiv){},
	getTitle:function(){
		return this.title||this.modelName||(this.options.modelName||this.options.modelName);
	}
});

/**
 * Overriding the Static view for handling the load function
 * 
 * loadTemplae - loading the template from the remote folder or directly from the html inline templates
 * 
 */
window.StaticView = window.StaticView.extend({
	loading:function(contentdiv, cancel){
		// used for showing an indicator that it is being loaded!
		var self = this;
		if(contentdiv)
			$(contentdiv).addClass('loading');
		
		if(this.config['jarviswidget']){
			id = $('section', self.el).attr('id');
			
			config = $.extend({}, window.DEFAULT_JARWIS_CONFIG, this.jarvisconfig);
	
			$('.jarviswidget', $(id, self.el))
	            .find('.jarviswidget-loader')
	            .stop(true, true)
	            .fadeIn(100)
	            .delay(config.indicatorTime)
	            .fadeOut(100);
	
			var rItem = $(config.widgets, $(self.el)),
	        	pathToFile = rItem.data('widget-load'),
	            ajaxLoader = rItem.children(),
	            btn = $('.jarviswidget-refresh-btn', $(self.el));
	        
			btn.button('loading');
	        
	        ajaxLoader.addClass("widget-body-ajax-loading");
	        
	        // will go automatically if the data loading is faster than 5 second!!
	        setTimeout(function () {
	            btn.button('reset');
	            
	            ajaxLoader.removeClass("widget-body-ajax-loading");
	        }, 5000);	
		} else{
			app.log('If not jarvis widget need loading.. currently not implemented');
		}
	},
	load:function(contentdiv, callback){
		var self = this;
		
		self.loading(contentdiv);
//		var templatedir;
		if($(contentdiv).data("templatedir")){
			this.templatedir = $(contentdiv).data("templatedir");
		}
		
		if(self.template){
			if(self.model&&self.model.id){
				self.model.fetch({
		        	success: function(data){
		        		$(self.el).hide();

		        		self.render(data);
		        		
		        		$(self.el).slideDown(200, function() {
		        			if(contentdiv)
		        				$(contentdiv).removeClass('loading').empty().html(self.el);
		        			
		        			$(self.el).removeClass('loading');
		        			
			        		self.afterLoad(callback);	
		        		});
		        		//self.render(data);
		        	}, error:function(data, error){
						if(callback)
		        			callback(error);
		        	}
		        });
	    	}else{
	    		$(self.el).hide();

	    		self.render();
        		
        		$(self.el).slideDown(200, function() {
        			if(contentdiv)
            			$(contentdiv).removeClass('loading').empty().html(self.el);
            		
            		$(self.el).removeClass('loading');
            			
        			self.afterLoad(callback);
        		});
			}
		}else{
			self.loadTemplate(function(data){
				self.template = _.template(data);
				
				if(self.model&&self.model.id){
					self.model.fetch({
			        	success: function(data){
			        		$(self.el).hide();

							self.render(data);
			        		
			        		$(self.el).slideDown('slow', function() {
			        			if(contentdiv)
			        				$(contentdiv).removeClass('loading').empty().html(self.el);
			        			
			        			$(self.el).removeClass('loading');
			        				
			        			self.afterLoad(callback);
			        		});
			        	}, error:function(data, error){
			        		if(callback)
	        					callback(error);
			        	}
			        });
				}else{
					$(self.el).hide();

					self.render(data);
	        		
	        		$(self.el).slideDown(500, function() {
	        			if(contentdiv)
	        				$(contentdiv).removeClass('loading').empty().html(self.el);
	        			
	        			$(self.el).removeClass('loading');
	        				
	        			self.afterLoad(callback);
	        		});
				}
			});
		}
	},next:function(event){
		var self = this;
		
		// using the Model query load the next
		event.preventDefault();
		//return false;  
		
		// now  get the feasibility using the id
		self.model.id = self.model.get('_id') + '/next';
		self.load();
		
		return false;  
	},initialize: function (options) {
		var self = this;
		
		if(options && options.template){
        	this.template = options.template;
        }else
        	this.template = null;
        
        if(options && options.templateName){
        	this.templateName = options.templateName;
        	this.template = null;
        }
        
        if(options && options.modelName){
        	this.modelName = options.modelName;
        }
        
        if(options && options.title){
        	this.title = options.title;
        }
        
        if(options && options.config)
    		this.config = $.extend({}, this.config, options.config);
    	
    	if(this.model&&!(this.model.attributes&&this.model.attributes.hasOwnProperty('title'))&&this.title){
    		try{
    			this.model.set('title', this.title);
    		}catch(error){}
    	}
    	
    	this.events = $.extend(true, {'click .next-model':'next'}, this.events_, this.events);
    	
    	this.afterInitialize();
    },afterLoad:function(callback){
    	if(callback)
    		callback();
    },
    refresh:function(){
    	var self = this;
    	self.load();
    },configedit:function(){
    	var self = this;
    	
    	var $configbox = $('.jarviswidget-editbox .config-box', $(self.el));
		
		if($configbox.is(':visible')){
			var curfields = [];
			$(':checkbox:checked', $configbox).each(function(){
				curfields.push($(this).val());
			});
			
			self.displayconfig.setFields(curfields);
			self.displayconfig.save(function(){
				$configbox.hide();
				
				self.setfieldconfig();
				self.load();		
			});
		}else{
			if($configbox&&$configbox.length > 0){
				// we need to create the box
				$configbox.show();
			}else{
				var $table = self.fieldconfigTable(); // get the config table
				
				$('.jarviswidget-editbox', $(self.el)).html($table);//self.model.get('info'));
			}
		}
    },
    afterInitialize:function(){
    	var self = this;
    
    	if(this.model&&!this.model.get('displayfields')&&!this.model.models)
    		this.model.set('displayfields', []);
    		
    	if(this.config['jarviswidget']){
    		if(this.config['jarvisconfig'])
    			this.jarvisconfig = $.extend({}, this.jarvisconfig, this.config['jarvisconfig']);
    	}
    	
    	this.datatableconfig = $.extend({}, this.datatableconfig, window.DEFAULT_DATATABLE_CONFIG);
		if(this.config['datatableconfig'])
			this.datatableconfig = $.extend({}, this.datatableconfig, this.config['datatableconfig']);
    	
    	self.setfieldconfig();
    },
    setfieldconfig:function(){
    	var self = this;
    
    	// if it is field config	
    	if(this.config['fieldconfig']&&this.model){
    		var modelname = this.model.modelName;
    		if(!modelname&&self.model&&self.model.models){
				var fristdata = self.model.models[0];
				modelname = fristdata.modelName;
    		}
    		
    		if(modelname){
				self.displayconfig = new DataModelDisplayConfig({modelname:modelname});
				
				var fields = self.displayconfig.fields();
				
				if(!self.model.models){
					if(fields&&fields.length > 0){
						self.model.set('displayfields', fields);
					}else
						self.model.set('displayfields', null);
				}
					
				var changefunction = $.extend(true, {}, {editButton:true});
					
				this.jarvisconfig = $.extend(this.jarvisconfig, changefunction);
			}else{
				this.jarvisconfig.editButton= false;
			}
			
			if(this.model&&!this.model.get('displayfields')&&!this.model.models)
				this.model.set('displayfields', []);
    	}
    },
    render: function () {
    	var self = this;
    	
        $(self.el).addClass('loading');

        var json =  {};
        if(this.model)
            json = this.model.toJSON();
        if(window.userprofile)
            json.userprofile = window.userprofile.toJSON();
        
        if(window.languages)
            json.languages = window.languages;
        else
        	json.languages=[];
        
    	if(self.config.accordion){
    		var id = $(self.el).attr('id');
    		var iconclass = self.config.accordion_iconclass||window.accordion_iconclass||'icon-white';
         	var elm = '<div class="accordion-group">'
 	        	+'<div class="accordion-heading">'
 		        	+'<a class="accordion-toggle" data-toggle="collapse" href="#'+id+'_accordion" data-original-title="">'
 		        		+'<i class="icon-chevron-down '+iconclass+' pull-right"></i>'
 		        		+'<i class="icon-th '+iconclass+'"></i>'
 		        		+'<span class="divider-vertical"></span>'
 		        		+this.title
	        		+'</a>'
	        	+'</div>'
 		        +'<div id="'+id+'_accordion" class="accordion-body collapse in">'
 		        +'<div class="accordion-inner paddind">'
 		        +'</div>'
 		        +'</div>';
         	
         	$(this.el).html(elm);
         	$('.accordion-inner:first', $(this.el)).html(this.template(json));

         	if(this.model && this.model.models && this.model.models.length == 0)
 				$('.accordion-inner:first', $(this.el)).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
         }else{
        	 $(this.el).html(this.template(json));
         	
         	if(this.model && this.model.models && this.model.models.length == 0)
             	$(this.el).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
         }
    	
        $('form', $(this.el)).submit(function(event){
			$(':password', $(self.el)).each(function(){
				var value = $(this).val();
				var encvalue = Base64.encode(value);
				if($(this).attr('encrypted') != 'true'){
					$(this).val(encvalue);
					$(this).attr('encrypted', 'true');
				}
			});
		});
        if(self.afterRender)
        	self.afterRender();
		
		if(self.afterRender_)
        	self.afterRender_();

        $(self.el).removeClass('loading');

        return this;
    },
    afterRender_:function(){
    	var self = this;
//    	if(this.config['jarviswidget']&&this.jarvisconfig){
//    		ConfigureJarvisWidget(null, $(self.el), this.jarvisconfig, this);
//    	}
    	
    	if(this.config['datatable']&&this.datatableconfig&&$('#datatable_'+self.modelName, $(self.el)).length >0){
    		$('#datatable_'+self.modelName, $(self.el)).dataTable(this.datatableconfig);
    	}
    	
    	return this;
    },loadGlobalLink:function(){
    	var self = this;
    	if(this.config['globallink']){
    		var config = {};
    		if(self.globallinkconfig)
    			$.extend(config, {modelname:self.uri||self.modelName}, self.globallinkconfig)
    		
    		self.globallink = new GlobalLink(config);
			self.globallink.load(this.model.get('_id'));
		}
    },jarvisconfig:{},
    datatableconfig:{},
    fieldconfigTable:function(){
    	var self = this;
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
    },
	loadTemplate : function(templateName, fileName, callback){
		/**
         * Used to load  the template using TemplateManager
         * then only create the view/render method
         */
		if(typeof templateName == 'function'){
    		var tmplname = this.templateName||this.modelName;
    		var modelName = this.modelName||this.templateName;
    		
    		callback = templateName;
    		fileName = this.templatedir + utils.capitaliseFirstLetter(tmplname) + '.html';
    		
    		//translation_templates.test() // not working !!
    		if(false&&/(Side|Header|FeasibilityWizard)/ig.test(modelName) && window.utils.getLanguageId() != undefined){
    			fileName = this.templatedir + window.utils.getLanguageId() + '/' + utils.capitaliseFirstLetter(tmplname) + '.html';
	    		
	    		templateName = utils.capitaliseFirstLetter(modelName + window.utils.getLanguageId());
			}else {
				templateName = utils.capitaliseFirstLetter(modelName);
			}
        }else if(typeof fileName == 'function'){
            callback = fileName;
            fileName = this.templatedir + templateName + '.html';
        }else if(fileName == ''){
            fileName = 'templates/'+ fileName+ '.html';
		}
		templateLoader.loadRemoteTemplate(templateName, fileName, callback);
    },
	getTitle:function(){
		if(this.model&&this.model.id){
			//return this.model.get('title');
		}
		return this.title||this.modelName||(this.options.modelName||this.options.modelName);
	},
	remove: function(e, callback) {
		var self = this;
		var $target = $(e.target);
		
		if($target.is('i')){
			$target = $target.parent();
		}
		
		var id = $target.attr('data-id');
		
		if (id && self.model) {			
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'Are you sure to delete the selected item ?';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-trash-o'></i>&nbsp; Delete",
					"class" : "btn btn-danger",
					click : function() {
						var title = self.model.get('title') || self.modelName;
						
						self.model.destroy({
							success: function(model, response) {
								$(this).find('.ui-dialog-content').html("<p>Successfully deleted the item !</p>");
								
								if(self.uri){
									var listuri = self.uri;
									app.showMessage('success', {
										title: title + ' - Deleted successfully',
										onclose:function(){
											app.navigate('#'+ listuri, true);
										},timeout:1000
									});
								}	
								
								if(callback)
									callback();
							},error:function(data, error){
								
								if(error&&error.responseJSON)
									app.showMessage('error', {
							    		title:'Error while deleting - ' + app.currentview.getTitle(),
							    		content:error.responseJSON.exception
							    	});
								if(callback)
									callback(error);
							}
						});
						
						$(this).dialog("close");
					}
				}, {
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
			return false;
		} else {
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'The selected item delete function is not configured.';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
		}
	}
});

/**
 * Overriding the model list view with the changes required for reload,
 * 
 * Jarvis widget, data table, configuration
 */
window.ModelListView = window.ModelListView.extend({   
	getTitle:function(){
		return this.title||this.modelName||(this.options.modelName||this.options.modelName);
	},
	loading:function(contentdiv, cancel){
		// used for showing an indicator that it is being loaded!
		var self = this;
		
		if(contentdiv)
			$(contentdiv).addClass('loading');
		
		if(this.config['jarviswidget']){
			id = $('section', self.el).attr('id');
			
			config = $.extend({}, window.DEFAULT_JARWIS_CONFIG, this.jarvisconfig);
	
			$('.jarviswidget', $(id, self.el))
	            .find('.jarviswidget-loader')
	            .stop(true, true)
	            .fadeIn(100)
	            .delay(config.indicatorTime)
	            .fadeOut(100);
	
			var rItem = $(config.widgets, $(self.el)),
	        	pathToFile = rItem.data('widget-load'),
	            ajaxLoader = rItem.children(),
	            btn = $('.jarviswidget-refresh-btn', $(self.el));
	        
	        if(cancel){
		        btn.button('reset');
		            
		        ajaxLoader.removeClass("widget-body-ajax-loading");
	        }else{
	        	btn.button('loading');
		        
		        ajaxLoader.addClass("widget-body-ajax-loading");
		        
		        // will go automatically if the data loading is faster than 5 second!!
		        setTimeout(function () {
		            btn.button('reset');
		            
		            ajaxLoader.removeClass("widget-body-ajax-loading");
		        }, 5000);	
	        }
		} else{
			app.log('if not jarvis widget need loading.. currently not implemented');
		}
	},
	load:function(contentdiv, callback){
		var self = this;
		
		self.loading(contentdiv);
		
		if(self.template){
			self.model.fetch({
	        	success: function(data){
	        		$(self.el).hide();

	        		self.render(data);
	        		
	        		$(self.el).slideDown(200, function() {
	        			// Animation complete.

		        		if(contentdiv)
		        			$(contentdiv).removeClass('loading').empty().html(self.el);
		        		
		        		$(self.el).removeClass('loading');
		        			
		        		self.afterLoad(callback);
	        		});
	        	}, error:function(data, error){
	        		if(callback)
	        			callback(error);
	        	}
	        });
		}else{
			self.loadTemplate(function(data){
				self.template = _.template(data);
				
				self.model.fetch({
		        	success: function(data){
		        		$(self.el).hide();

		        		self.render(data);
		        		$(self.el).slideDown(200, function() {
		        			if(contentdiv)
		        				$(contentdiv).removeClass('loading').empty().html(self.el);
		        			
		        			$(self.el).removeClass('loading');
		        			
			        		self.afterLoad(callback);
		        		});
		        	}, error:function(data, error){
		        		if(callback)
	        				callback(error);
		        	}
		        });
			});
		}
	},
	afterLoad:function(callback){
		if(callback)
			callback();
	},
	initialize: function (options) {
        if(options && options.template){
        	this.template = options.template;
        }
        
        if(options && options.templateName){
        	this.templateName = options.templateName;
        }
        
        if(options && options.title){
        	this.title = options.title;
        }
        
        if(options && options.config)
    		for(var i in options.config){
    			this.config[i] = options.config[i];
    		}
    	
    	this.events = $.extend(true, {}, this.events_, this.events);
    	
    	this.afterInitialize();
    },
    afterInitialize:function(){
    	var self = this;
    	
    	if(this.config['jarviswidget']){
    		if(this.config['jarvisconfig'])
    			this.jarvisconfig = $.extend({}, this.jarvisconfig, this.config['jarvisconfig']);
    	}
	
		this.datatableconfig = $.extend({}, this.datatableconfig, window.DEFAULT_DATATABLE_CONFIG);
		
		if(this.config['datatableconfig'])
			this.datatableconfig = $.extend({}, this.datatableconfig, this.config['datatableconfig']);
    			
    	// if it is field config	
    	self.setfieldconfig();
    },
    setfieldconfig: function(){
    	var self = this;
    	
    	// if it is field config	
    	if(this.config['fieldconfig']){
    		var modelname = this.model.modelName;
    		if(!modelname&&self.model&&self.model.model){
				modelname = new self.model.model().modelName;
    		}
    		
    		if(modelname){
				self.displayconfig = new DataModelDisplayConfig({modelname:modelname});
				var fields = self.displayconfig.fields();
				
				if(!self.model.models){
					if(fields&&fields.length > 0){
						self.model.set('displayfields', fields);
					}else
						self.model.set('displayfields', null);
				}
					
				var changefunction = $.extend(true, {}, {editButton:true});
					
				this.jarvisconfig = $.extend({}, this.jarvisconfig, changefunction);
			}else{
				this.jarvisconfig.editButton= false;
			}
			
			if(this.model&&!this.model.get('displayfields')&&!this.model.models)
				this.model.set('displayfields', []);
    	}
    },
    afterRender_:function(){
   		var self = this;
   		
//    	if(this.config['jarviswidget']&&this.jarvisconfig){
//    		ConfigureJarvisWidget(null, $(self.el), this.jarvisconfig, self);
//    	}
    	
		if(window&&window.userprofile&&window.userprofile.get('preference')){
			if(window.userprofile.get('preference')['widget.datatable.length']){
				this.datatableconfig.iDisplayLength = Number(window.userprofile.get('preference')['widget.datatable.length']);	
			}
			
			if(window.userprofile.get('preference')[self.modelName + '.widget.datatable.length']){
				this.datatableconfig.iDisplayLength = Number(window.userprofile.get('preference')[self.modelName + '.widget.datatable.length']);	
			}
		}
		
    	if(this.config['datatable']&&this.datatableconfig&&$('#datatable_'+self.modelName, $(self.el)).length >0){
    		$('#datatable_'+self.modelName, $(self.el)).dataTable(this.datatableconfig);
    		
    		$('#datatable_'+self.modelName+'_length', $(self.el)).on('change', function(event){
    			if(app) {
    				app.setPreference(self.modelName + '.widget.datatable.length', $(event.target).val());
    			}
    		});
        }
    },loadGlobalLink:function(){
    	var self = this;
    	if(this.config['globallink']){
    		var config = {};
    		if(self.globallinkconfig)
    			$.extend(config, {modelname:self.uri||self.modelName}, self.globallinkconfig)
    		
    		self.globallink = new GlobalLink(config);
			self.globallink.load(this.model.get('_id'));
		}
    },refresh:function(){
    	var self = this;
    	self.load();
    },configedit:function(){
    	var self = this;
    	
    	var $configbox = $('.jarviswidget-editbox .config-box', $(self.el));
		
		if($configbox.is(':visible')){
			var curfields = [];
			$(':checkbox:checked', $configbox).each(function(){
				curfields.push($(this).val());
			});
			self.displayconfig.setFields(curfields);
			self.displayconfig.save(function(){
				$configbox.hide();
				
				self.setfieldconfig();
				self.load();		
			});
		}else{
			if($configbox&&$configbox.length > 0){
				// we need to create the box
				$configbox.show();
			}else{
				var $table = self.fieldconfigTable(); // get the config table
				
				$('.jarviswidget-editbox', $(self.el)).html($table);//self.model.get('info'));
			}
		}
    },jarvisconfig:{},
    datatableconfig:{},
    fieldconfigTable:function(){
    	var self = this;
    	
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
    },
    paginationJSON:function(data){
    	var self = this;

        var models = this.model ? this.model.models : [];
        if(data && typeof data =='object'){
        	models = data;
        }
        
    	var pageItemCount = this.options.pageItemCount||window.pageItemCount||15;
        var page = this.options.page||1;
        
        var len = models.length;
        var startPos = (page - 1) * (pageItemCount);
        var endPos = Math.min(startPos + (pageItemCount), len);
        
        var json = {};
        json['results'] = this.model ? this.model.toJSON() : [];;
        
        json.page = page;
        json.startPos = startPos;
        json.endPos = endPos;
        json.pageItemCount = pageItemCount;
        json.noOfPages = self.model.noOfPages(pageItemCount);
        
        if(this.model.importid&&!json.importid){
        	json.importid = this.model.importid;
        }else if(!json.importid)
        	json.importid = null;
        	
        if(!json.displayfields)	
        	json.displayfields = null;
        		
        return json;
    }
});

/**
 * Header view with Full screen and language selection
 */
window.HeaderView = window.StaticView.extend({
	config:{accordion:false},
	modelName:'HeaderView', templateName:'HeaderView',
	afterRender:function(){
		var self = this;
		$('.skin-select li span', $(self.el)).click(function(){
			var skinclass=$(this).attr('data-widget-setstyle');
			
			app.setColorSkin(skinclass, true);
		});
		
		$('.skin-select li a', $(self.el)).click(function(){
			var curscheme = $('body').attr('data-color-scheme');
			
			if(curscheme&&curscheme!='')
				$('body').removeClass(curscheme);
			
			app.setColorSkin('default', true);
		});
		
		if(window.translations) {
			$('.langselector a').click(function(e){
				var langId = $(e.target).attr('data-langId');
				
				if(langId && langId != window.utils.getLanguageId()){
					window.userprofile.updateLanguageId(langId, {
						success:function(){
							location.reload();
						},
						error:function(){}
					});
				}
			});
		} else {
			$('.langselector').hide();
		}
		
		$('#logout a', $(self.el)).click(function(e) {
			//get the link
			var $this = $(this);
			$.loginURL = $this.attr('href');
			$.logoutMSG = $this.data('logout-msg');

			// ask verification
			$.SmartMessageBox({
				title : "<i class='fa fa-sign-out txt-color-orangeDark faa-horizontal animated'></i> Logout <span class='txt-color-orangeDark'><strong>" + $('#show-shortcut').text() + "</strong></span> ?",
				content : $.logoutMSG || "You can improve your security further after logging out by closing this opened browser",
				buttons : '[No][Yes]'

			}, function(ButtonPressed) {
				if (ButtonPressed == "Yes") {
					$.root_.addClass('animated fadeOutUp');
					
					if(window.logout&&typeof window.logout == 'function')
						setTimeout(window.logout, 1000);
					else
						setTimeout(logout, 1000);
				}

			});
			e.preventDefault();
		});

		/*
		 * LOGOUT ACTION
		 */
		function logout() {
			window.location = $.loginURL;
		}
		
		// SHOW & HIDE MOBILE SEARCH FIELD
		$('#search-mobile').click(function() {
			$.root_.addClass('search-mobile');
		});

		$('#cancel-search-js').click(function() {
			$.root_.removeClass('search-mobile');
		});
	}
});
/**
 * Left Side Panel with Minify and heighlite functions
 */
window.SidePanelView = window.StaticView.extend({
	config:{accordion:false},modelName:'SidePanelView', templateName:'SidePanelView',
	afterRender: function(){
		var self = this;
		
		//$.shortcut_dropdown = $('#shortcut');
		
		/** The below code copied from theme app.js **/
		// INITIALIZE LEFT NAV
		if (!null) {
			$('nav ul', $(self.el)).jarvismenu({
				accordion : true,
				speed : $.menu_speed,
				closedSign : '<em class="fa fa-expand-o"></em>',
				openedSign : '<em class="fa fa-collapse-o"></em>'
			});
		} else {
			alert("Error - menu anchor does not exist");
		}

		// COLLAPSE LEFT NAV
		$('.minifyme', $(self.el)).click(function(e) {
			$('body').toggleClass("minified");
			$(this).effect("highlight", {}, 500);
			e.preventDefault();
		});

		// HIDE MENU
		$('#hide-menu >:first-child > a', $(self.el)).click(function(e) {
			$('body').toggleClass("hidden-menu");
			e.preventDefault();
		});

		$(document).mouseup(function(e) {
			if (!$('.ajax-dropdown', $(self.el)).is(e.target)// if the target of the click isn't the container...
			&& $('.ajax-dropdown').has(e.target).length === 0) {
				$('.ajax-dropdown').fadeOut(150);
				$('.ajax-dropdown').prev().removeClass("active")
			}
		});

		$('button[data-loading-text]', $(self.el)).on('click', function() {
			var btn = $(this)
			btn.button('loading')
			setTimeout(function() {
				btn.button('reset')
			}, 3000)
		});
		/*
		* SHORTCUTS
		*/

		$('#show-shortcut', $(self.el)).click(function(e) {
			if ($.shortcut_dropdown.is(":visible")) {
				shortcut_buttons_hide();
			} else {
				shortcut_buttons_show();
			}
			e.preventDefault();
		});
		
		// SHORT CUT (buttons that appear when clicked on user name)
		$.shortcut_dropdown.find('a').click(function(e) {
			e.preventDefault();

			window.location = $(this).attr('href');
			setTimeout(shortcut_buttons_hide, 300);

		});

		// SHORTCUT buttons goes away if mouse is clicked outside of the area
		$(document).mouseup(function(e) {
			if (!$.shortcut_dropdown.is(e.target)// if the target of the click isn't the container...
			&& $.shortcut_dropdown.has(e.target).length === 0) {
				shortcut_buttons_hide()
			}
		});

		// SHORTCUT ANIMATE HIDE
		function shortcut_buttons_hide() {
			$.shortcut_dropdown.animate({
				height : "hide"
			}, 300, "easeOutCirc");
			$.root_.removeClass('shortcut-on');

		}

		// SHORTCUT ANIMATE SHOW
		function shortcut_buttons_show() {
			$.shortcut_dropdown.animate({
				height : "show"
			}, 200, "easeOutCirc")
			$.root_.addClass('shortcut-on');
		}
		
		if($('#profileshortcut', $(self.el)).length > 0)
			$('#shortcut').html($('#profileshortcut', $(self.el)).html());
	}
});


/**
 * User preference
 */
window.UserpreferenceView=window.StaticView.extend({
    templateName:'SettingsView', modelName:'Userpreference',
	title:'Userpreference',config:{fieldconfig:false, jarviswidget:false, datatable:false},
	afterLoad:function(){
		var self = this;
		$('.killsession').click(function(event){
			self.logout(event);
		})
	},events:{
		'.killsession click':'logout'
	},logout:function(event){
		var self = this;
		var $killel = $(event.target)
		var msg = 'do-you-want-to-proceed-with-logout';
		
		if(confirm(getMessage(msg) + '?')){
			window.location='/logoutall'
		}
		
		return false;
	}
});

/**
 * The offline tool List View
 * This can be used overall in the app
 * @todo: "modelName","templateName" and "title" need to configured properly
 */
window.ModelListView = window.ModelListView.extend({   
	render:function(data){
		var self = this;
        
        $(self.el).addClass('loading');
        var models = this.model ? this.model.models : [];
        if(data && typeof data =='object'){
        	models = data;
        }
        
        var json = self.paginationJSON();
        
    	$(this.el).html(this.template(json));
    	
        //Pagination and breadcrumb functionality can be written here
    	
    	//Configure the datatable
    	if(self.afterRender_)
    		self.afterRender_(); // tool specific jarvis widget, datatable, is coded inside common views
    	
    	if(self.afterRender)
    		self.afterRender();
        
    	//dropdown menu in datatable fix http://stackoverflow.com/questions/18138785/bootstraps-dropdown-hidden-by-datatables
    	try{
	    	$("[rel=qtip]", $(self.el)).each(function(event) {    		
	    		$(this).qtip({
	                position:{
	                	my: 'right center',
	                    at: 'left center'
	                },
	                hide:{event:'click mouseleave'}
	            });
	    	});
    	} catch(error){
    	}
    	
        $(self.el).removeClass('loading');
        return this;
	},
	events_: {
        "change"        		: "change",
    	".searchbutton:click"	: "change",
    	".sort:change" 			: "sort",
    	"click .sort"			:'sortClick',
    	'click .remove'			: 'remove'
    },
	remove: function(e, ids, callback) {
		var self = this;
		var $target = $(e.target);
		
		if($target.is('i'))
			$target=$target.parent();
		
		var id = $target.attr('data-id');
		if(ids){
			id = ids;
		}
		
		if (id) {			
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'Are you sure to delete the selected item ?';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-trash-o'></i>&nbsp; Delete",
					"class" : "btn btn-danger",
					click : function() {
						var query = {};
						if(self.model.models&&self.model.models.length > 0)
							query[self.model.models[0].idAttribute] = id; 
						else{
							query._id = id;
							query.id = id;
						}
						var modelobject = new window[self.modelName](query);
						var title = self.model.get('title') || self.modelName;
						
						modelobject.destroy({
							success: function(model, response) {
								$(this).find('.ui-dialog-content').html("<p>Successfully deleted the item !</p>");
								
								if(self.uri){
									var listuri = self.uri;
									app.showMessage('success', {
										title: self.modelName + ' - Deleted successfully',
										content:self.modelName + ' - Deleted successfully',
										onclose:function(){
											app.navigate('#'+ listuri, true);
										},timeout:1000
									});
								}	
								
								if(callback)
									callback();
								else{
									$(this).find('.ui-dialog-content').html("<p>Successfully deleted the item !</p>");
									$target.closest('tr').remove();
								}
							},error:function(data, error){
								if(error&&error.responseJSON){
									app.showMessage('error', {
							    		title:'Error while deleting - ' + self.title,
							    		content:error.responseJSON.exception
							    	});
								}
								
								if(callback)
									callback(error);
								else
									$(this).find('.ui-dialog-content').html("<p>Error while deleting this item. Please try again later.</p>");
							}
						});
						
						$(this).dialog("close");
					}
				}, {
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
			return false;
		} else {
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'The selected item delete function is not configured.';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
		}
	}
});



/**
 * The offline tool Form View
 * This can be used overall in the app
 * @todo: mention the correct "modelName", "title"
 */
window.ModelFormView = window.StaticView.extend({	
	globallinkconfig:{crud:true}, config:{globallink:true,fieldconfig:false, jarviswidget:true, datatable:false, jarvisconfig:{refreshButton:false}},
	render: function () {
    	var self = this;
    	
        $(self.el).addClass('loading');

        var json =  {};
        if(this.model)
            json = this.model.toJSON();
        if(window.userprofile)
            json.userprofile = window.userprofile.toJSON();
        
    	$(this.el).html(this.template(json));
     	
     	if(this.model && this.model.models && this.model.models.length == 0)
         	$(this.el).append('<div class="alert"><strong>Info!</strong> No '+this.title+' found!!!');
       	
		if(self.afterRender_)
        	self.afterRender_();
       
     	if(self.afterRender)
        	self.afterRender();
        	
        $(self.el).removeClass('loading');
        
		$("[rel=tooltip]", $(self.el)).tooltip();
		
		$('.easy-pie-chart', $(self.el)).each(function() {
			var $spark = $(this);
			
			var barColor = $spark.css('color') || $spark.data('pie-color'), trackColor = $spark.data('pie-track-color') || '#eeeeee', size = parseInt($spark.data('pie-size')) || 25;
			$spark.easyPieChart({
				barColor : barColor,
				trackColor : trackColor,
				scaleColor : false,
				lineCap : 'butt',
				lineWidth : parseInt(size / 8.5),
				animate : 1500,
				rotate : -90,
				size : size,
				onStep : function(value) {
					this.$el.find('span').text(~~value);
				}
			});
		});
		
		if(self.model){
			self.model.on('change', function(){
				if(self.model.hasChanged('created_at')){
					if(app){
				    	app.formchanged=false;
				    }
				}else if(app){
			    	app.formchanged=true;
					app.currenthash = window.location.hash;	
			    }
			});
		}
        return this;
	},
	change: function (event) {
		// Apply the change to the model
	    var target = event.target;
	    var change = {};
	    
	    var value = null;
	    if($(target).is(':radio')){
	    	value = $(target).val();
	    }else if($(target).is(':checkbox')){
	    	value = target.checked;
	    }else{
	    	value = target.value;
	    
	        if(value && value.lastIndexOf(', ') != -1 && value.lastIndexOf(', ') == value.length-2)
	    		value = value.substring(0, value.lastIndexOf(', '));
	
	        if(value && value.lastIndexOf(',') != -1 && value.lastIndexOf(',') == value.length-1)
	    		value = value.substring(0, value.lastIndexOf(','));
	    }
	    change[target.name] = value;
		
	    this.model.set(change);
	},
	events_:{
		'change':'change'
	}
});

/**
 * The offline tool List View
 * This can be used overall in the app
 * @todo: "modelName","templateName" and "title" need to configured properly
 */
window.ModelListView = window.ModelListView.extend({   
	render:function(data){
		var self = this;
        
        $(self.el).addClass('loading');
        var models = this.model ? this.model.models : [];
        if(data && typeof data =='object'){
        	models = data;
        }
        
        var json = self.paginationJSON();
        
    	$(this.el).html(this.template(json));
    	
        //Pagination and breadcrumb functionality can be written here
    	
    	//Configure the datatable
    	if(self.afterRender_)
    		self.afterRender_(); // tool specific jarvis widget, datatable, is coded inside common views
    	
    	if(self.afterRender)
    		self.afterRender();
        
    	//dropdown menu in datatable fix http://stackoverflow.com/questions/18138785/bootstraps-dropdown-hidden-by-datatables
    	try{
	    	$("[rel=qtip]", $(self.el)).each(function(event) {    		
	    		$(this).qtip({
	                position:{
	                	my: 'right center',
	                    at: 'left center'
	                },
	                hide:{event:'click mouseleave'}
	            });
	    	});
    	} catch(error){
    	}
    	
        $(self.el).removeClass('loading');
        return this;
	},
	events_: {
        "change"        		: "change",
    	".searchbutton:click"	: "change",
    	".sort:change" 			: "sort",
    	"click .sort"			:'sortClick',
    	'click .remove'			: 'remove'
    },
	remove: function(e, ids, callback) {
		var self = this;
		var $target = $(e.target);
		
		if($target.is('i'))
			$target=$target.parent();
		
		var id = $target.attr('data-id');
		if(ids){
			id = ids;
		}
		
		if (id) {			
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'Are you sure to delete the selected item ?';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-trash-o'></i>&nbsp; Delete",
					"class" : "btn btn-danger",
					click : function() {
						var query = {};
						if(self.model.models&&self.model.models.length > 0)
							query[self.model.models[0].idAttribute] = id; 
						else{
							query._id = id;
							query.id = id;
						}
						var modelobject = new window[self.modelName](query);
						var title = self.model.get('title') || self.modelName;
						
						modelobject.destroy({
							success: function(model, response) {
								$(this).find('.ui-dialog-content').html("<p>Successfully deleted the item !</p>");
								
								if(self.uri){
									var listuri = self.uri;
									app.showMessage('success', {
										title: self.modelName + ' - Deleted successfully',
										content:self.modelName + ' - Deleted successfully',
										onclose:function(){
											app.navigate('#'+ listuri, true);
										},timeout:1000
									});
								}	
								
								if(callback)
									callback();
								else{
									$(this).find('.ui-dialog-content').html("<p>Successfully deleted the item !</p>");
									$target.closest('tr').remove();
								}
							},error:function(data, error){
								if(error&&error.responseJSON){
									app.showMessage('error', {
							    		title:'Error while deleting - ' + self.title,
							    		content:error.responseJSON.exception
							    	});
								}
								
								if(callback)
									callback(error);
								else
									$(this).find('.ui-dialog-content').html("<p>Error while deleting this item. Please try again later.</p>");
							}
						});
						
						$(this).dialog("close");
					}
				}, {
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
			return false;
		} else {
			$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : self.title,
				open: function() {
			          var markup = 'The selected item delete function is not configured.';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						$(this).dialog("close");
					}
				}]
			}).dialog("open");
		}
	}
});
