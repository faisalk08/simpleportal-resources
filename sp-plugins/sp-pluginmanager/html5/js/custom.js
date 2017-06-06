define( [
 	"/uiplugin/backbone-ext/src/backbone-ext.js"
 ], function(Backbone) {
 	var exports = this;//{};

 	exports.customurimappings = {
		'pluginmanager':{
			templateName:'PluginManager', remoteTemplate:'templates/PluginManager.html'
		},'pluginsource':{
			url:'/api/system/pluginsource', uri:'pluginsource',
			templatedir:'templates/pluginsource/', temaplteName:"searchform.html",
			defaultmode:'search',
			details:{
				templatedir:'templates/pluginsource/'
			},"search":{
				"urlRoot":"/api/system/pluginsource/search",
				"templateName":"searchform.html", 
				templatedir:'templates/pluginsource/'
			}
		}, plugin:{
			url:'/api/system/plugin', uri:'plugin',
			templatedir:'templates/plugin/', temaplteName:"searchform.html",
			defaultmode:'search',
			details:{
				templatedir:'templates/plugin/'
			}, usage:{
				apiaction:'usage', templatedir:'templates/plugin/', "templateName":"usage.html"
			}, resources:{
				templatedir:'templates/plugin/', "templateName":"resources.html"
			},"search":{
				"urlRoot":"/api/system/plugin/search",
				"templateName":"searchform.html", 
				templatedir:'templates/plugin/'
			}
		}
	};
 	
 	/**
 	 * Plugin collection
 	 */
 	exports.Plugin = exports.Pluginsource = Backbone.Model.extend({
 		idAttribute:'_id',
 		defaults:{
 			title:'',
 			description:'',
 			plugintype:'',
 			version:'',
 			dependencies:[],
 			installed:false,
 			curversion:0.0,
 			isNew:function(){
 				if(this.curversion&&this.version&&Number(this.curversion)<Number(this.version))
 					return true;
 				else
 					return false;
 			}
 		},
 	    url:function(){
 	        if(this.id)
 	            return '/api/system/pluginsource/'+this.id;
 	        else
 	    	   return '/api/system/pluginsource';
 	   	},install:function(callback){
 	   		var self = this;
 			
 			$.post('/api/system/pluginsource/' + self.id + '/install', {}).done(function(data) {
 		    	if(callback&&callback.success);
 		    		callback.success(data);
 		  	}) .fail(function(data) {
 		    	if(callback&&callback.error);
 		    		callback.error(data);
 		  	});
 	   	},uninstall:function(callback){
 	   		var self = this;
 			
 			$.post('/api/system/pluginsource/' + self.id + '/uninstall', {}).done(function(data) {
 		    	if(callback&&callback.success);
 		    		callback.success(data);
 		  	}) .fail(function(data) {
 		    	if(callback&&callback.error);
 		    		callback.error(data);
 		  	});
 	   	},update:function(callback){
 	   		var self = this;
 			
 			$.post('/api/system/pluginsource/' + self.id + '/update', {}).done(function(data) {
 		    	if(callback&&callback.success);
 		    		callback.success(data);
 		  	}) .fail(function(data) {
 		    	if(callback&&callback.error);
 		    		callback.error(data);
 		  	});
 	   	},process:function(uri, callback){
 	   		var self = this;
 	   		
 			if(uri){
 				$.post('/api/system/pluginsource/' + self.id + '/' + uri, {}).done(function(data) {
 			    	if(callback&&callback.success);
 			    		callback.success(data);
 			  	}) .fail(function(data) {
 			    	if(callback&&callback.error);
 			    		callback.error(data);
 			  	});
 			}else if(callback&&callback.error);
 				callback.error('No proper uris defined for processing');
 	   	}
 	});
 	
 	exports.Plugin = exports.Plugin.extend({
 		idAttribute:'_id',
 		url:function(){ 
 	        if(this.id)
 	            return '/api/system/plugin/'+this.id;
 	        else
 	    	   return '/api/system/plugin';
 	   	}
 	})
 	/**
 	 * Plugin collection
 	 */
 	window.PluginCollection = Backbone.Collection.extend({
 		modelId:function(attrs){
 			return attrs['_id'] ? attrs['_id'] : attrs['id'];
 		},model: exports.Plugin,
 		url:function(){ return '/api/system/plugin'},
 		parse:function(response){
			var self = this;
	
			if(response && typeof response == 'object' && typeof response.length != 'number' && response["results"]){
				self.totalrecords=response["info"] ? response["info"].count : response["results"].length;
				return response["results"];
			}else
				return response;
		}
 	});
 	
 	/**
 	 * Plugin collection
 	 */
 	window.PluginsourceCollection = Backbone.Collection.extend({
 		modelId:function(attrs){
 			return attrs['_id'] ? attrs['_id'] : attrs['id'];
 		},model: exports.Pluginsource,
 		url:function(){ return '/api/system/pluginsource'},
 		updateSource:function(callback){
 	   		var self = this;
 			
 			$.post('/api/system/pluginsource/update', {}).done(function(data) {
 		    	if(callback&&callback.success);
 		    		callback.success(data);
 		  	}) .fail(function(data) {
 		    	if(callback&&callback.error);
 		    		callback.error(data);
 		  	});
 	   	}, parse:function(response){
			var self = this;
	
			if(response && typeof response == 'object' && typeof response.length != 'number' && response["results"]){
				self.totalrecords=response["info"] ? response["info"].count : response["results"].length;
				return response["results"];
			}else
				return response;
		}
 	});
 	
 	/**
 	 * Plugin collection
 	 */
 	exports.Pluginmanager = Backbone.Model.extend({
 	   url:function(){ return '/api/system/plugin'},
 		updateSource:function(callback){
 	   		var self = this;
 			
 			$.post('/api/system/pluginsource/update', {}).done(function(data) {
 		    	if(callback&&callback.success);
 		    		callback.success(data);
 		  	}) .fail(function(data) {
 		    	if(callback&&callback.error);
 		    		callback.error(data);
 		  	});
 	   	}
 	});
 	
	/**
	 * User profile list view
	 */
 	exports.PluginmanagerView = Backbone.DetailsView.extend({
	    modelName:'Pluginmanager', templateName:'Pluginmanager',
		title:'Plugin',
		events:{
			"click .ajaxload.showpluginsource" : 'loadPluginsource',
			"click .ajaxload.pluginsearch" : 'loadPluginsearch'
		},loadPluginsearch:function(event){
			var self = this;
			if(!self.$('#pluginsearch').data("loaded")){
				var pmview = new window.PluginSearchView({templatedir:'templates/plugin/', templateName:'searchform.html'});
				pmview.urlRoot='/api/plugin/search';
				
				self.$('#pluginsearch').data("loaded", true);
				
				pmview.load(self.$('#pluginsearch'));
			}
		},
		loadPluginsource:function(event){
			var self = this;
			
			if(!self.$('#pluginsource').data("loaded")){
				var pmview = new window.PluginsourceSearchView({templatedir:'templates/pluginsource/', templateName:'searchform.html'});
				
				self.$('#pluginsource').data("loaded", true);
				pmview.load(self.$('#pluginsource'));
			}
		},
		afterLoad:function(){
			var self = this;
			var $form = $('#plugin-upload-form',$(self.el));
			
			self.loadPluginsearch();
			
			self.$('.ajaxload').click(function(event){
				if($(event.target).is('.showpluginsource'))
					self.loadPluginsource(event);
				else if($(event.target).is('.pluginsearch'))
					self.loadPluginsearch(event);
			});
			
			var options = {
				beforeSend: function(xhr, opts) {
					$('#plugin-upload-form .message p').html('');
					
	                $('.pager > .next > a',$(self.el)).addClass('disabled');
	                
	                app.showProcessMessage({status:'processing', taskargs:0});
				},
				complete: function(response) {
					$('.easy-pie-chart').addClass('hide');
					
	                $('#plugin-upload-form').fadeIn(3000);
	                
	                $('.pager > .next > a',$(self.el)).removeClass('disabled');
				}, 
				success: function(data) {					
					//self.showProcessMessage({status:'processing', taskargs:0});
					console.log("Back from server!!!");
				},
				error: function(error, somemore) {
					app.showErrorMessage(error);
					
	                //self.showProcessMessage({status:'finished', taskargs:0});
	                $('.pager > .next > a',$(self.el)).removeClass('disabled');
				}
			};
			
			$form.validate({
				rules : {
					pluginfile:{required:true}
				},
				messages : {
					pluginfile:{required: '<i class="error fa fa-warning fa-bg-red"></i>Please select a plugin file exported from Server'}
				},
				submitHandler : function(form) {
					$form.ajaxSubmit(options);
					
					return false;
				}
			});
			
			$('.updatecache', $(self.el)).click(function(data){
				var proceed=confirm(app.getMessage('you-want-to-update'));
				if(proceed){
					$('body').block({message:'Processing your request, it may take couple of minutes!!'});
					
					var model = new Pluginmanager();
					model.updateSource({
						success:function(data){
							$('body').unblock();
							app.showMessage('success', {
								title: "Successfully updated the cache setting from the remote server"
							});
							self.refresh();
						},
						error:function(error){
							var errorMessage = error;
							if(error&& error.responseJSON)
								errorMessage = error.responseJSON.exception;
							
							if(error&& error.status==400 && error.responseJSON.exception.indexOf('Unauthorized.') != -1){
								redirecturl = error.responseJSON.exception.substring(error.responseJSON.exception.indexOf('http://'));
								
								if(error.responseJSON.exception.indexOf('https://') != -1)
									redirecturl = error.responseJSON.exception.substring(error.responseJSON.exception.indexOf('https://'));
								
								window.open(redirecturl);
							}else
								app.showMessage('exception', {
									title: errorMessage
								});
							$('body').unblock();
						}
					});
				}else
					return false;
			});
			
			$('.processapp', $(self.el)).click(function(event){
				var target = $(event.target);
				
				if(confirm(getMessage('do-you-want-continue') + ' ?')){
					var id = target.parents('.well:first').data('id');
					
					$('body').block({message:'Processing your request, it may take couple of minutes!!'});
					var action = target.data('process');
					
					if(action && action !='' && id){
						var model = new Plugincache({id:id});
						model.process(action, {
							success:function(data){
								$('body').unblock();
								
								app.showMessage('success', {
									title: "Successfully executed - "+action+" for the app - "+ id
								});
								
								self.refresh();
							},
							error:function(error){
								if(error&&error.responseJSON)
									app.showMessage('exception', {
										title: error.responseJSON.exception
									});
								$('body').unblock();
							}
						});
					}	
				}
			});
		}
	});
 	
 	exports.PluginSearchView = Backbone.SearchView.extend({
 		modelName:'Pluginsearch', templateName:'searchform',
 		registerDropDownPlugin:function(callback){
 			var self = this;
 			
 	    	self.plugintypes = [];
 	    	var ptitemcount = $( '.dropdown-menu input[value!=-1]', self.$el).length;
 	    	$( '.dropdown-menu input[value!=-1]:checked', self.$el).each(function(){
 	    		self.plugintypes.push($(this).val());
 	    	});
 	    	
 	    	$( '.dropdown-menu a', self.$el).on( 'click', function( event ) {
 	    		var $target = $( event.currentTarget ),
 	    	       val = $target.attr( 'data-value' ),
 	    	       $inp = $target.find( 'input' ),
 	    	       idx;
 	    		
 	    		if($inp.val() == -1){
 	    			if(($inp.is(":checked") && $( event.target ).is("input")) || (!$( event.target ).is("input") && !$inp.is(":checked")) ){
 	    				self.plugintypes = [];
 	        			setTimeout( function() { 
 	        				$inp.prop( 'checked', true );
 	        				
 	        				$( '.dropdown-menu input[value!=-1]', self.$el).prop( "checked", true ).attr('disabled', true);
 	        			}, 0);
 	        		}else{
 	        			$( '.dropdown-menu input[value!=-1]', self.$el).prop( "checked", false ).removeAttr('disabled');
 	        			setTimeout( function() { $inp.prop( 'checked', false ) }, 0);
 	        		}
 	    		}else{
 	    			if ( ( idx = self.plugintypes.indexOf( val ) ) > -1 ) {
 	    				self.plugintypes.splice( idx, 1 );
 	        			setTimeout( function() { $inp.prop( 'checked', false ) }, 0);
 	        		} else {
 	        			self.plugintypes.push( val );
 	        			
 	        			// check itis the last element
 	        			if($( '.dropdown-menu input[value!=-1]:checked', self.$el).length == ptitemcount){
 	        				$( '.dropdown-menu input[value=-1]').click();
 	        			}
 	        			
 	        			setTimeout( function() { $inp.prop( 'checked', true ) }, 0);
 	        		}
 	    		}
 	    		if(self.plugintypes.length > 0)
 	    			$target.parents('.dropdown:first').find('.dropdown-toggle .text').html(self.plugintypes.join(','));
 	    		else
 	    			$target.parents('.dropdown:first').find('.dropdown-toggle .text').html('All');
 	    		$( event.target ).blur();
 	    		
 	    		if(callback)
 	    			callback(self.plugintypes);
 	    		
 	    	   return false;
 	    	});
 		}, afterLoad:function(){
 			var self = this;
 			
 			self.registerDropDownPlugin();
 			
 			var pm = new window.PluginsourceCollection();
 			self.searchResultView = new window.PluginlistView({templatedir:self.options.templatedir, model:pm});
 			self.loadSearchresult();
 			
 			$('form', self.$el).on("submit", function(){
 				self.loadSearchresult();
 				return false;
 			})
 		}, loadSearchresult : function(){
 			var self = this;
 			
 			self.searchResultView.model.url = function(){
 				var searchquery = self.urlRoot||'/api/pluginsource/pluginlist';
 				if(self.plugintypes && self.plugintypes.length > 0)
 					searchquery += '?plugintype=' + self.plugintypes;//.join(',');
 				
 				var searchfields=[];
 				$('form input:checkbox, form input:radio', self.$el).each(function(){
 					if(this.name != 'plugintype'){
 						searchfields.push(this.name+'='+$(this).is(':checked'));
 					}
 				});
 				if(searchfields.length > 0)
 					searchquery += (searchquery.indexOf('?') == -1 ? '?' : '&') + searchfields.join('&');
 				
 				return searchquery;
 			};
 			
 			self.$('.searchresult').data("loaded", true);
 			self.searchResultView.load(self.$('.searchresult'));
 		}
 	});
 	
 	exports.PluginsourceSearchView = exports.PluginSearchView.extend({
 		templateName:'Pluginsourcesearch', modelName:'Pluginsourcesearch'
 	});
 	
 	exports.PluginlistView = Backbone.ListView.extend({
 	    modelName:'Pluginlist', templateName:'searchresult.html',
 	    events:{
			"click .processapp" : 'processPlugin'
		},
		processPlugin:function(event){
			var $target = $(event.target);
			if(confirm(getMessage('do-you-want-continue') + ' ?')){
				var processopitions = $target.data();
				var id = $target.parents('.well:first').data('id');
				
				$('body').block({message:'Processing your request, it may take couple of minutes!!'});
				
				var action = processopitions.process;
				console.log(action + '-->' + id);
				
				if(action && action != '' && id){
					var model = new Pluginsource({_id:id});
					
					model.process(action, {
						success:function(data){
							$('body').unblock();
							
							app.showMessage('success', {
								title: "Successfully executed - "+action+" for the app - "+ id
							});
							
							self.refresh();
						},
						error:function(error){
							if(error && error.responseJSON)
								app.showMessage('error', {
									title: error.responseJSON.exception
								});
							
							$('body').unblock();
						}
					});
				}	
			}
		},
 	    afterLoad:function(){}
 	});
 	
 	/**
 	 * Plugin source list view
 	 */
 	exports.PluginsourcelistView = Backbone.ListView.extend({
 	    modelName:'Pluginsourcelist',
 	    afterLoad:function(){}
 	});
 	
 	/**
 	 * PLugin source details view
 	 */
 	exports.PluginsourcedetailsView = Backbone.DetailsView.extend({
 		modelName:'Pluginsourcedetails', templateName:'details.html'
 	});

 	/**
 	 * PLugin source details view
 	 */
 	exports.PlugindetailsView = Backbone.DetailsView.extend({
 		modelName:'Plugindetails', templateName:'details.html'
 	});
 	
 	/**
 	 * PLugin source details view
 	 */
 	exports.PluginresourcesView = Backbone.DetailsView.extend({
 		modelName:'resources', templateName:'resources'
 	});
 	
 	return exports;
});