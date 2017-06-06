(function (factory) {
	"use strict";
	
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([
	        "./backbone-ext-view.js"
	    ], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		module.exports = factory(require("./backbone-ext-view.js"));
	} else {
		// Global browser
		factory(Backbone);
	}
}(function (Backbone) {
	//"use strict";
	/**
	 * Default routes for the Backbone.Router
	 * can be extended using the initialization options segment also
	 */
	Backbone.Router.DEFAULT_ROUTES={
		""											: "loadDynamicPage",
		"ajax/*pageurl"								: "loadAjaxPage",
		":model/:sub/:subpage/:id"					: "loadDynamicPage",
		":model/:sub/:page"							: "loadDynamicPage",
		":model/:sub"								: "loadDynamicPage",
		":model"									: "loadDynamicPage"		
	};

	/**
	 * Default Options for Backbone.Router
	 * Customized for Dashboard view with layout
	 * - Header
	 * - Sidebar
	 * - Main Body 
	 */
	Backbone.Router.DEFAULT_OPTIONS = {
		header:"#header",
		headertemplate:'header.html',
		sidepanel:"#sidepanel",
		sidepaneltemplate:'sidepanel.html',
		tabview:true,// to enable tabbed view or not
		main:"#main",
		timer:'#curtime .time',
		timertimeout:500,
		blockui:{
			message:'Loading your content',
			css: { 
				border: '3px solid #a00' 
			}
		}, urimapping:{},
		layout:{},
		viewmodes:['list', 'edit', 'form', 'details', 'search', 'setting', 'report', 'backup', 'schedule']
	}
	
	Backbone.Router.prototype.addViewMode = function(viewmode){
		var self = this;
		
		if(viewmode && self.options)
			self.options.viewmodes.push(viewmode);
	}
	
	/**
	 * Log messages to the db, or directly to consol.log
	 */
	Backbone.Router.prototype.log = function(){
		if(console&&console.log)
			console.log.apply(this, arguments);
	};

	/**
	 * Implementation of initialize method for Router
	 */
	Backbone.Router.prototype.initialize = function (options) {
		this.__loadUserProfile(options);
	}

	/**
	 * Implementation of initialize method for Router
	 */
	Backbone.Router.prototype.__initialize = function (options) {
		var self = this;
	    
		// need to find a fix routes hidden method is called again
		self.routes = _.extend(self.routes, Backbone.Router.DEFAULT_ROUTES);
		if(options && options.routes)
			self.routes = _.extend(self.routes, options.routes);
		
		// Calling once again _bindRoutes, Default bind routes wont include DEFAULT_ROUTES Set in the Backbone ext
		self._bindRoutes();
		
		self.options = _.extend({}, Backbone.Router.DEFAULT_OPTIONS, options);
		
		self.urimapping = self.urimapping||{};
		if( self.options.urimapping && self.urimapping)
			self.urimapping = _.extend(self.urimapping, self.options.urimapping);
		
		// inherit uri mapping window option
		if( window.urimappings )
			self.urimapping = _.extend(self.urimapping||{}, window.urimappings);

	    var urioptions = _.pick(self.options, Backbone.View.GLOBAL_FIELDS);
		
	    if(self.userprofile)
	    	self.setPreference(self.userprofile.get('preference')||{}, {silent:true});
	    
	    // Mostly used for Dashboard type view
	    if(self.options.header) {
	    	self.headerView = self.getView(_.extend({}, urioptions, {
				templatedir:self.options.headertemplatedir||self.options.templatedir, 
				templateName:self.options.headertemplate, 
				el: self.options.header,
				events:{
					"click a,span":function(event){
						// get the type f reference to set
						var preferenceselector = $(event.target).closest('.preferenceselector');
						
						if(preferenceselector && preferenceselector.length > 0){
							var preference_key = preferenceselector.attr('data-preference-key');
							var preference_value = $(event.target).attr('data-'+preference_key);
							
							if( preference_key && preference_value ){
								self.setPreference(preference_key, preference_value);
							}
						}
					}
				}
			}));
	    	
	    	if(self.headerView){
	    		self.headerView.load();
	    	}
		}
	    
	    /*
	     * sidepanel jquery selector has to be available to load the sidepanel view in to the window
	     * to override the default template of sidepanel can be overriden using mention 'sidepaneltemplate' argument in the options
	     */
	    if(self.options.sidepanel){
	    	self.sidepanelView = self.getView(_.extend({}, urioptions, {
				templatedir:$(self.options.sidepanel).data("templatedir")||self.options.sidepaneltemplatedir||self.options.templatedir, 
				templateName:($(self.options.sidepanel).data("template")||self.options.sidepaneltemplate) + '?layout=null', 
				el: self.options.sidepanel
			}));
			
			self.sidepanelView.on("afterload", function() {
		        $('.togglemenuleft').click(function(){
		        	if($('.togglemenuleft .glyphicon').hasClass("glyphicon-circle-arrow-left")){
		        		$('#sidepanel.col-sm-2').removeClass("col-sm-2").addClass("col-sm-1");
			        	$('.main.col-sm-10').removeClass("col-sm-10").removeClass("col-sm-offset-2").addClass("col-sm-11").addClass("col-sm-offset-1");
			        	
			        	$('#sidepanel .glyphicon').addClass('bigicon');
			        	$('#sidepanel a span').hide();
			        	
			        	$('.togglemenuleft .glyphicon').removeClass("glyphicon-circle-arrow-left").addClass("glyphicon-circle-arrow-right")
		        	}else{
		        		$('#sidepanel.col-sm-1').removeClass("col-sm-1").addClass("col-sm-2");
			        	$('.main.col-sm-11').removeClass("col-sm-11").removeClass("col-sm-offset-1").addClass("col-sm-10").addClass("col-sm-offset-2");
			        	
			        	$('#sidepanel .glyphicon').removeClass('bigicon');
			        	$('#sidepanel a span').show();
			        	
			        	$('.togglemenuleft .glyphicon').removeClass("glyphicon-circle-arrow-right").addClass("glyphicon-circle-arrow-left")
		        	}
		        });
				
				$('#navbox-trigger').click(function () {
		            $('#navigation-bar').toggleClass('navbox-open');
		            return $('.sidepanel').toggleClass('navbox-open');
		        });
		        
				$(".sidepanel_control span").on("click", function(event){
					var slidertoggle = $(event.target).parent().data("toggle");
					if(slidertoggle == "down" ){
						if($('.sidepanel').hasClass("up")){
							$('.sidepanel').slideUp( "slow", function() {
								// Animation complete.
								$('.sidepanel').removeClass("up");
							});
							$(event.target).find('.glyphicon').removeClass('glyphicon-menu-up').addClass('glyphicon-menu-down')
						} else{
							$('.sidepanel').slideDown( "slow", function() {
								// Animation complete.
								$('.sidepanel').addClass("up");
								$('#navigation-bar').addClass('navbox-open').show();
							});
							$(event.target).find('.glyphicon').removeClass('glyphicon-menu-down').addClass('glyphicon-menu-up')
						}
					}
				});
		        
		        return $(document).on('click', function (e) {
		            var $target;
		            $target = $(e.target);
		            if (!$target.closest('.navbox').length && !$target.closest('#navbox-trigger').length) {
		                return $('#navigation-bar').removeClass('navbox-open');
		            }
		        });
			});
			
			self.sidepanelView.load();
		}
	    
	    /*
	     * uri mappings to the sidepanel
	     */
	    if(self.options && self.options.layout)
		    for(var index in self.options.layout.sidepanel){
				var layout = self.options.layout.sidepanel[index];
				var mainuri = layout.uri.replace('#', '');
				
				self.urimapping[mainuri] = _.extend({modelname:Backbone.Utils.capitaliseFirstLetter(mainuri)}, self.urimapping[mainuri]||{}, layout);
				
				if(layout.subpage){
					for(var sindex in layout.subpage){
						var sublayout = layout.subpage[sindex];
						
						var suburi = sublayout.uri;
						if(sublayout.uri.indexOf('#') == -1)
							suburi = mainuri + '/' + sublayout.uri;
						
						suburi = suburi.replace('#', '');
						var submodelname = suburi.replace(/\//ig, '');
						
						// only copy urlRoot 
						self.urimapping[suburi] = _.extend({suburi:true}, _.pick(self.urimapping[mainuri], ['uri', 'url', 'urlRoot', 'templatedir', 'modelname']), {modelname:Backbone.Utils.capitaliseFirstLetter(submodelname)}, self.urimapping[suburi]||{}, sublayout);
					}
				}
			}
	    
		self.startTimer();
		
		if(window && !window.getMessage)
			window.getMessage = (function(router){
				return function(key, args){
					return router.getMessage(key, args);	
				}
			})(self);
		
		if(self.options.tabview){
			var _model= new Backbone.Model({name:'main', local:true});
			
			self.mainTabView = new Backbone.TabView({model:_model});
			self.loadMainView(self.mainTabView);	
		}
		
		// if onLoad
		if(options.onLoad && typeof options.onLoad  == "function")
			options.onLoad(self);
	}

	/**
	 * Utility method for getting the Internationalization key default implementation is 
	 * using a local variable translations and corresponding language key as the sub object
	 * {
	 * 	de:{key:'value in de'}
	 *  en:{key:'value en'}
	 * }
	 */
	Backbone.Router.prototype.getMessage = function(key, args){
		if(!key)
			return key;
		
		var langkey = 'en';
		if(this.userprofile)
			if(this.userprofile.get('preference') && this.userprofile.get('preference').languageId)
	    		langkey = this.userprofile.get('preference').languageId;
			else
				langkey = this.userprofile.get('languageId');
		
		return Backbone.Utils.getTranlsatedMessage(window.translations, langkey, key, args);
	}

	/**
	 * @method getPreference
	 */
	Backbone.Router.prototype.getPreference = function (key, defaultvalue) {
		var self = this;
		
		if(self.preference)
			return self.preference[key]||defaultvalue;
		
		return defaultvalue;
	}

	/**
	 * Implementation of initialize method for Router
	 */
	Backbone.Router.prototype.setPreference = function (key, value, options) {
		var self = this;
		
		var preference = {};
		
		options=options||{};
		if(typeof key == 'object'){
			preference = key;
			options=value||{};
		}	
		else if (key, value)
			preference[key]=value;
		
		if(self.userprofile && !options.silent && Object.keys(preference).length > 0 ){
			self.userprofile.updatePreference(preference, {
				success:function(){
					self.preference = _.extend({}, self.preference, preference);
					
					if(!options || !options.disablereload)
						window.location.reload();
				}, error:function(){
					self.log("setPreference", 'Error while saving prefernce');
				}
			});
		}else if(preference)
			self.preference = _.extend(self.preference||{}, preference);
	}

	/**
	 * Implementation of initialize method for Router
	 */
	Backbone.Router.prototype.__loadUserProfile = function (options) {
		var self = this;
		var userProfile = new window.DefaultUserprofile();
		
		userProfile.fetch({
			success:function(profile){
				self.userprofile = window.userprofile = userProfile;
				
				if(profile && profile.get('preference') && profile.get('preference').colorskin)
					$('body').addClass(profile.get('preference').colorskin);
				
				self.__initialize(options);
				
				if(!Backbone.history.started)
					Backbone.history.start({pushState:false});
			}, error:function(){
				app.showMessage('error', {title:'No userprofile, please login to proceed', message:'No userprofile, please login to proceed'});
			}
		});
	}

	/**
	 * To get the backbone View using the uri 
	 */
	Backbone.Router.prototype.getView = function (options, urimappingarguments) {
		var self = this;
		
		var viewmodes = 
			['list', 'edit', 'form', 'details', 'search', 'setting', 'report', 'backup', 'schedule'],
			model,
			modeluri,
			viewmode,
			modelid,
			modeloptions={};
		if(urimappingarguments){
			//@TODO get view using uri, should remove default values set in the options
			var urimapping = self.getUriViewMapping.apply(this, urimappingarguments);
			
			if(urimapping){
				urimapping=_.extend({uriarguments:urimappingarguments}, options||{}, urimapping);
				
				if(urimappingarguments.length > 0 && urimappingarguments[0])
					modeluri = urimappingarguments[0];
				
				if(urimappingarguments.length > 1 && urimappingarguments[1])
					if(_.indexOf(self.options.viewmodes, urimappingarguments[1]) > -1)
						viewmode = urimappingarguments[1];
					else if(urimapping[urimappingarguments[1]] && typeof urimapping[urimappingarguments[1]] === 'object')
						viewmode = urimappingarguments[1];
					else if(urimapping && urimapping.suburi){
						if(urimapping.viewmode)
							viewmode = urimapping.viewmode;
					}else {
						viewmode = 'details';
						modelid = urimappingarguments[1];
					}
				else if(urimappingarguments.length > 1 && !urimappingarguments[1] && urimapping.defaultmode)
					viewmode = urimapping.defaultmode;
				
				if(urimappingarguments.length > 2 && urimappingarguments[2])
					modelid = urimappingarguments[2];
				
				if(viewmode == 'setting'){
					modelid=modeluri;
					modeluri = 'apiservice';
					urimapping.uri='#apiservice';
				}
				if(urimapping && urimapping.staticpage){
					if(urimapping.remoteTemplate && !urimapping.templateName)
						urimapping.templateName = urimapping.remoteTemplate.substring(urimapping.remoteTemplate.lastIndexOf("/"))
					return new Backbone.View(urimapping);
				} else if(modeluri && urimapping.model){
					return new Backbone.View(urimapping);
				} else if(modeluri && (urimapping.url || urimapping.urlRoot)){
					// every model specific url will have a uri and the sub path like mode and the the id
					var modelname = urimapping.modelname||Backbone.Utils.capitaliseFirstLetter(modeluri);
					
					//now check u have mode specifc properties inside urimapping and copy that to the parent
					if(viewmode && urimapping[viewmode] && typeof urimapping[viewmode] == 'object'){
						if(!urimapping.suburi)
							urimapping=_.extend({}, urimapping, urimapping[viewmode]);
					} else if(viewmode && viewmode == 'edit' && urimapping['form'] && typeof urimapping['form'] == 'object'){
						urimapping=_.extend({}, urimapping, urimapping['form']);
					}
					
					var modelclass = Backbone.Collection; // default behaviour
					modeloptions.urlRoot = urimapping.urlRoot||urimapping.url;
					
					if(modelid){
						modelclass = Backbone.Model;
						/* else {
							//modeloptions.url = urimapping.url + '/' + modelid;
						}*/
						if(urimapping.apiaction){
							modelid = modelid + '/' + urimapping.apiaction;
						}
						
						if(viewmode != 'setting' && viewmode != 'report' && viewmode != 'backup') {
							if(typeof window[modelname] == "function"/* && modelname != 'Plugin'*/){
								modelclass = window[modelname];
							}
							
							// set the id attribute inside the model options
							var modelidfield = modelclass['idAttribute']||'_id';
							modeloptions[modelidfield] = modelid;
						}
					} else {
						if(viewmode == 'form' || viewmode == 'edit' || viewmode == 'search'|| viewmode == 'setting' || viewmode == 'report'|| viewmode == 'backup'){
							modelclass = Backbone.Model;
							if(typeof window[modelname] == "function"/* && modelname != 'Plugin'*/)
								modelclass = window[modelname];
							
							modeloptions.newmodel = true;
						} else if(typeof window[modelname + 'Collection'] == 'function'){
							modelclass = window[modelname + 'Collection'];
						}
					}
					
					if(options&&options.dataroot)
						modeloptions.dataroot = options.dataroot;
					
					// set the model 
					if(!urimapping.model && modelclass && (modelid || viewmode == 'form' || viewmode == 'edit' || viewmode == 'search'|| viewmode == 'backup'|| viewmode == 'report'|| viewmode == 'setting'))
						urimapping.model = new modelclass(modeloptions);
					else if(modelclass)
						urimapping.model = new modelclass(null, modeloptions);
					
					// validation
					if(viewmode == 'form' && !urimapping['form'] && !urimapping.suburi)
						return null;
					else if (typeof window[modelname + viewmode + 'View'] == 'function'){
						return new window[modelname + viewmode + 'View'](urimapping);
					} else if (typeof window[modelname +'View'] == 'function'){
						return new window[modelname +'View'](urimapping);
					} else if(viewmode == 'form' || viewmode == 'edit'){
						return new Backbone.FormView(urimapping);
					} else if(viewmode == 'details' || viewmode == 'setting'){
						return new Backbone.DetailsView(urimapping);
					} else if(viewmode == 'report'){
						return new Backbone.ReportView(urimapping);
					} else if(viewmode == 'backup'){
						return new Backbone.BackupView(urimapping);
					} else if(viewmode == 'search'){
						return new Backbone.SearchView(urimapping);
					} else if(viewmode == 'list'){
						return new Backbone.ListView(urimapping);
					} else {
						return new Backbone.View(urimapping);
					}
				}else if(modeluri){
					var modelname = urimapping.modelname||Backbone.Utils.capitaliseFirstLetter(modeluri);
					
					if(typeof window[modelname] == "function" && modelname != 'Plugin'){
						modelclass = window[modelname];
						
						urimapping.model = new modelclass(modeloptions);
					}
					
					if (typeof window[modelname +'View'] == 'function'){
						return new window[modelname +'View'](urimapping);
					}else
						return null;
				}else
					return new Backbone.View(urimapping);
			}else{
				return null;
			}
		}else {
			// check viewmodes
			if(options && (options.viewmode == 'form' || options.viewmode == 'edit'))
				return new Backbone.FormView(options)
			else if(options && options.viewmode == "details" || options.viewmode == 'setting') {
				if(options&&options.dataroot)
					modeloptions.dataroot = options.dataroot;
				if(options.urlRoot){
					var modeloptions = {};
					modeloptions.urlRoot = options.urlRoot||options.url;

					if(options && options.dataroot)
						modeloptions.dataroot = options.dataroot;
					
					options.model=new Backbone.Model(modeloptions);
				}
				
				return new Backbone.DetailsView(options)
			} else if(options && options.viewmode == "search")
				return new Backbone.SearchView(options)
			else if(options && options.viewmode == "list"){
				if(options.urlRoot){
					var modeloptions ={};
					
					modeloptions.urlRoot = options.urlRoot||options.url;

					if(options&&options.dataroot)
						modeloptions.dataroot = options.dataroot;
					
					options.model=new Backbone.Collection(null, modeloptions);
				}
				return new Backbone.ListView(options)
			}else 
				return new Backbone.View(options);
		}
	}

	/**
	 * To get the uri view mapping, can use mapping to load corresponding Template and the models and views attached to it
	 */
	Backbone.Router.prototype.getUriViewMapping = function(){
		var self = this;
		
		function getUrimapping(uri, suburimapping){
			var urimapping;
			if(uri)
				urimapping = self.urimapping[uri];
			
			if(/*!urimapping && */window.urimappings && window.urimappings[uri])
				urimapping = _.extend(urimapping, window.urimappings[uri]);
					
			return urimapping;
		}
		
		var parameters = [].concat([].slice.call(arguments,0));
		var urimapping;
		do{
			urimapping = getUrimapping(parameters.join('/'));
			parameters.pop();
		} while (!urimapping && parameters.length > 0);

		if(urimapping)
			urimapping = _.extend({}, urimapping);
		
		return urimapping;
	}

	/**
	 * To load a dynamic page 
	 */
	Backbone.Router.prototype.loadAjaxPage = function(url, query){
   		var self = this;
		console.log(url);
   		var DynamicView = Backbone.View.extend({
   			remoteTemplate:url, templateName:url.substring(url.lastIndexOf("/"))
		});
   		
		var mainview = new DynamicView({
//			config:{datatable:true}
//		,
//			model:window.userprofile
		});
		
		self.loadMainView(mainview);
   	};
	
	/**
	 * To load a dynamic page 
	 */
	Backbone.Router.prototype.loadDynamicPage = function() {
		var self = this;

		var arguments = arguments;
		if(arguments.length > 0 && arguments[0] == undefined)
			arguments=[];
		
		//@TODO default uri from the options
		if(!arguments || arguments.length <= 0 && self.options.defaulturi){
			console.log($(self.options.main));
			if(self.options.defaulturi.indexOf("#ajax") != -1)
				self.loadAjaxPage(self.options.defaulturi.replace("#ajax", ""));
			else if(!$(self.options.main).data("staticpage"))
				arguments = self.options.defaulturi.replace("#", "").split("/");
		}
		if(arguments && arguments.length > 0){
			var dynamicarguments = [null, arguments];
			
			var view = self.getView.apply(self, dynamicarguments);
			
			if(view)
				view.mainuri = arguments[0];
//			console.log(view.model)
//			console.log(view);
			_loadBackboneView(self, view);
		}
	}

	Backbone.Router.prototype.loadDialogView=function(view, options){
		var self = this;
		
		var modalprops = {
			message:'<!-- Popup view -->', 
			title:'Popup',
			open:function(modal){
				$("#modal").children().off();
				
				self.loadView({container:'#modal', view:view});
			}
		};
		
		if(options)
			modalprops = $.extend(modalprops, options); 
		
		self.openDialog(modalprops);
	};
//	
//	Backbone.Router.prototype.loadTabView=function(view){
//		
//		if(self.mainTabView && view)
//			self.mainTabView.addView(view);
//	};
	
	/**
	 * To load the main content div
	 * Mostly used inside Dashboard type views
	 */
	Backbone.Router.prototype.loadMainView=function(view){
		var self = this;
		
		if(view /*&& view instanceof Backbone.View*/){
			if(self.mainView)
				self.mainView.undelegateEvents();
			
			// block the containers parent div
			view.on('beforeload', function(){self.blockUI($(self.options.main).parent())});
			view.on('beforesave', function(){self.blockUI($(self.options.main).parent())});
			
			// un block the containers parent div
			view.on('afterload', function(){
				self.unblockUI($(self.options.main).parent());
			});
			
			view.on('aftersave', function(){
				self.unblockUI($(self.options.main).parent());
			});
			
			view.on('save_error', function(view, model, response, options){
				self.unblockUI($(self.options.main).parent());
	        });
					
			view.load(self.options.main);
			
			self.mainView = view;
		}else {
			app.showMessage('error', {title:'No view found for your url', message:'No view found for your url'});
			
			Backbone.history.history.back();
		}
	};

	/**
	 * To open a view inside a specific selector
	 * 
	 * Mostly using modal popups or dialogue popups using jQuery or related plugins
	 */
	Backbone.Router.prototype.loadView = function(options){
		var self = this;
		
		var view;
		
		if(options.view)
			view = options.view;
		else if(options.charttype){
			if(!options.title)
				options.title = options.name;
			
			var view = new Backbone.ChartView({
				charttype:options.charttype||'chartjs-pie',
				templateName:options.templateName||'chart',
				model:new Backbone.Model({
					name:options.name,
					title:options.title,
					urlRoot:options.urlRoot||options.url
				})
			});
			
			view.load(options.container);
		} else 
			view = self.getView(null,  [].slice.call(arguments,1));
		
		if(options.container && view/* && view instanceof Backbone.View*/){
			if(!options.silent){
				var blockcontainer =  $(options.container).parent();
				if($(options.container).attr('id') == 'modal')
					blockcontainer = $(document.body);

				// block the containers parent div
				view.on('beforeload', function(){
					self.blockUI(blockcontainer)
				});
				
				view.on('beforesave', function(){
					self.blockUI(blockcontainer)
				});
				
				// un block the containers parent div
				view.on('afterload', function() {
					self.unblockUI(blockcontainer);
//					
//					view.$el.attr("tabindex", "-1");
//					view.$el.focus();
				});
				
				view.on('aftersave', function(){
					self.unblockUI(blockcontainer);
				});
				
				view.on('save_error', function(view, model, response, options){
					self.unblockUI(blockcontainer);
		        });		
			}

			if(options && options.disablelayout){
				view.options.disablelayout = options.disablelayout;
			}
			
			if(options && options.dataprops){
				view.options.dataprops = _.extend(view.options.dataprops||{}, options.dataprops);
			}
			
//			app.log("options.container -- " + options.container);
//			app.log("view property check -- " + view.myproperty + ' -- '+ view.cid)
			view.load(options.container);
			
			return view;
		}else{
			return null;
		}
	}

	/**
	 * To block certain section of the UI
	 */
	Backbone.Router.prototype.blockUI=function(container, options){
		var self = this;
		
		if(container && $.blockUI ){
			var blockprops = _.extend({}, self.options.blockui, options);
			
			$(container).block(blockprops);
		}
	}

	/**
	 * To block certain section of the UI
	 */
	Backbone.Router.prototype.unblockUI=function(container){
		var self = this;
		
		if(container && $.blockUI){
			$(container).unblock();
		}
	}

	/**
	 * To show the cur time 
	 */
	Backbone.Router.prototype.startTimer=function(){
		var self =this;
		
		var curtime = new Date();
		
		var timercontainer = $(self.options.timer);
		
		if(timercontainer && timercontainer.length > 0){
			timercontainer.html(curtime.toLocaleDateString() + ' ' + curtime.toLocaleTimeString());
			
			// timer timeout every
			setTimeout(function(){
				self.startTimer();
			},self.options.timertimeout);		
		}
	}

	/**
	 * showMessage 
	 **/
	Backbone.Router.prototype.showMessage=function(messagetype, messageprops){
		//@TODO 
		var erromessage;
		var messagetitle;
		
		if(messagetype && messagetype == 'error'){
			erromessage = "Some error occured!";
		}	
		
		if(messageprops && !messageprops.message && messageprops.content)
			messageprops.message = messageprops.content;
		
		app.openDialog(messageprops);
	}

	Backbone.Router.prototype.openDialog = function(modalprops, callback){
		return openDialog(modalprops, callback);
	}
	
	var openDialog = function (modalprops, callback){
		if(!modalprops.message)
			return null;
		
		var modelbuttons=[];
		if(modalprops.type == "confirm"){
			modelbuttons = [{
				html : "<i class='fa fa-trash-o'></i>&nbsp; Continue",
				"class" : "btn btn-danger",
				click : function() {
					callback(this)
				}
			}, {
				html : "<i class='fa fa-times'></i>&nbsp; Cancel",
				"class" : "btn btn-default",
				click : function() {
					$(this).dialog("close");
				}
			}];
		} else if(modalprops.type == "prompt"){
			modelbuttons = [{
				html : "<i class='fa fa-trash-o'></i>&nbsp; Continue",
				"class" : "btn btn-danger",
				click : function() {
					callback(this, $('form', $(this)).serializeArray()
					    .reduce(function(a, x) { a[x.name] = x.value; return a; }, {}));
					$(this).html('');
					$(this).dialog("destroy").remove();
				}
			}, {
				html : "<i class='fa fa-times'></i>&nbsp; Cancel",
				"class" : "btn btn-default",
				click : function() {
					//$(this).dialog("close");
					$(this).dialog("destroy").remove();
				}
			}];
			
			//@TODO
			var propmttemplate = '\
				<div id="dialog-form">\
					<label>'+modalprops.message+'</label>\
				    <form>';
				        
	        if(modalprops.fieldsettings && typeof modalprops.fieldsettings.length == 'number'){
	        	for(var index in modalprops.fieldsettings) {
	        		var fieldsetting = modalprops.fieldsettings[index];
		        	propmttemplate += '\
		        		<div>\
		        			<label for="name">'+(fieldsetting.display||fieldsetting.field)+'</label>\
		        			<input type="'+(fieldsetting.type||'text')+'" name="'+(fieldsetting.field)+'" value="'+(fieldsetting.value||'')+'"id="txt2" class="form-control" />\
		        		<div>';
	        	}
			}else{
				propmttemplate += '\
						<div>\
				        	<label for="name">'+modalprops.title+'</label>\
				        	<input type="text" name="promptfield" value="'+(modalprops.value||'')+'"id="txt2" class="form-control" />\
				        <div>';
			}	
			
			propmttemplate +='\
					</form>\
				</div>';
			
			modalprops.message=propmttemplate;
		} else{
			//@TODO other type of modal
		}
		
		if($('#modal').length <= 0)
			$('body').append('<div id="modal"></div>');
		
		var options = {
			autoOpen : false,
			width : 600,
			resizable : false,
			modal : true,
			title : modalprops.title,
			open: function() {
	          $(this).html(modalprops.message);
	          
	          // if modalprops.open
	          if(modalprops.open)
	        	  modalprops.open(this);
		    },close:function(){
		    	if(modalprops.close)
		        	  modalprops.close(this);
		    },
			buttons : modelbuttons
		};
		
		if(modalprops && modalprops.displayoptions)
			options = $.extend(options, modalprops.displayoptions);
		
		var modal = $('#modal').dialog(options).dialog("open");
		
		return modal;
	}
	
	var _loadBackboneView = function (app, view){
		if(view){
			if(view.options && view.options.dialogview){
				app.loadDialogView(view);
			}else if(view.options && view.options.tabs && (app.options.tabview && !self.mainView)){
				// we will load the tabbed view
				var mainuri = view.options.uri;
					mainviewid = mainuri.replace("#", "") + 'tabView';
					
				// add the current view in to the tab
				if(app[mainviewid]){
					app[mainviewid].addView(view);
					
					if(app.mainTabView)
						app.mainTabView.addView(app[mainviewid]);
				} else {
					// get the main urimapping
					var urimapping = app.getUriViewMapping.apply(app, [mainuri.replace("#", "")]);
					
					/*if(app[mainviewid]){
						var view = app.getView.apply(self, dynamicarguments);
						if(view)
							app[mainviewid].addView(view);
						else
							console.log("@TODO no view configured - " + mainviewid)
					}else */
					if(urimapping && urimapping.tabs){
						var taburimapping = _.extend({}, urimapping);
						delete taburimapping.templateName;
						
						taburimapping.model= new Backbone.Model({name:mainuri, local:true});
						
						app[mainviewid] = new Backbone.TabView(taburimapping);
						app[mainviewid].mainviewid=mainviewid;
						
						view.on("afterload", function(){
							// now check once more whether more tabs being added dynamically
							var latesturimapping = app.getUriViewMapping.apply(app, [mainuri.replace("#", "")]);
							
							if(latesturimapping.tabs != taburimapping.tabs){
								app[mainviewid].updateOption({tabs:latesturimapping.tabs});
								
								app[mainviewid].updateTabs();
							}
						});
						
						app[mainviewid].on("afterload", function(){
							app[mainviewid].addView(view);
						});
						
						if(app.mainTabView)
							app.mainTabView.addView(app[mainviewid]);
						else
							app.loadMainView(app[mainviewid]);
					}else
						app.log("_loadBackboneView", "@TODO no view configured")
				}
			} else if(app.mainTabView)
				app.mainTabView.addView(view);
			else
				app.loadMainView(view);
		}else
			app.log("_loadBackboneView", "No view to load!!");
	};

	return Backbone.Router;
}));