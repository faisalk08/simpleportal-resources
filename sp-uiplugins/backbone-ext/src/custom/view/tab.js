define( [
	"./../../core.js",
	"./core.js",
	"./../../model.js"
], function(Backbone, CustomBackboneView, CustomBackboneModel){
	"use strict";
	
	/**
	 * Form with functions to handle the form submit
	 */
	var TabView = CustomBackboneView.extend({
		events:{},
		afterInitialize:function(options){
			this.options = $.extend({}, TabView.DEFAULTS, this.options)
		},
		contentdiv:'.tab-content:first',
		tabdiv:'[role=tablist]:first',
		template:'<span class="view-info"></span>\
			<div id="<%= name %>_tabs">\
			<ul class="nav nav-tabs" role="tablist"></ul>\
			<div class="tab-content"></div>\
			</div>'
		, modelAction:function(event) {
			var self = this;
			event.preventDefault();
			
			var self = this;
			var pluginid;
			
			var $target = $(event.target);
			
			if(!$target.is('.modelaction')){
				$target=$target.parents('.modelaction:first');
			}
			
			var modelaction = $target.data('modelaction');
			if(modelaction == 'edit')
				modelaction ='form';
			
			var actionfound = false;
			if(modelaction && self.model.objecttype == 'collection' || self.model instanceof Backbone.Collection || self.model.models){
				if(self.options.uri && self.options[modelaction]){
					var parenttr =  $target.parents('tr:first');
					if(parenttr.is('.child')){
						parenttr=parenttr.prev()
					}
					var dataid = parenttr.data('id');
					
					var subviewfield = $target.data("subview");
					if(subviewfield){
						actionfound=true;
						dataid = subviewfield +'/' + dataid;
						
						if(self.$('#' + subviewfield + '_list_container').length <= 0){
							self.createTab(self.options.uri + '/edit/' + dataid, subviewfield + '_list_container', subviewfield);
							
							self.$('.tab-content').append('<div role="tabpanel" class="tab-pane" id="'+subviewfield + '_list_container'+'"></div>');
						}
						
						self.openTab(self.options.uri + '/edit/' + dataid, subviewfield + '_list_container');
					}
				}
			} 
			
			if(!actionfound)
				return TabView.__super__.modelAction.apply(this, arguments);
			else
				return true;
		},openTab:function(taburl, tabcontainer, view){
			var self = this;
			var tabcontainer = tabcontainer.replace("#", '');
			
			if(self.$(self.tabdiv).length > 0){
				var arguments_ = taburl.replace('#', '').split('/');
			    var displayarguments = [
			        {
				    	dataprops:{"app-uri" : taburl}, 
				    	container:self.$('#'+tabcontainer), 
				    	disablelayout:true,
				    	view:view
			    	}
			    ];
			    displayarguments = displayarguments.concat(arguments_);
			    
			    var existingurl = $('#'+ tabcontainer).attr('data-app-uri');
			    
			    if(self.$('#'+tabcontainer).data('remote-loading') == 'loaded' || self.$('#'+tabcontainer).data('remote-loading') == 'loading'){
			    	if(!view)
			    		app.navigate(taburl, {trigger:false});
			    } else {
			    	if(!view)
			    		app.navigate(taburl, {trigger:false});
			    	
			    	var newview = app.loadView.apply(app, displayarguments);
			    	if(!newview)
			    		app.showMessage('error', {title:'No view found for your url', message:'No view defined for the mentioned tab!'});
				}
			    self.$('[role=tab][href="#'+tabcontainer+'"]').tab("show");
			}
		},addView:function(view, options){
			var self = this;
			
			var title = view.options ? view.options.display||view.options.modelname : '';
			
			var taburi = view.options.uri;
			var maintabid = taburi.replace(/#|\/|\./ig, '');
			
			if(((view.viewmode && view.viewmode != 'list') || (view.viewmode == 'details' || view.viewmode == 'edit' || view.viewmode == 'form')) && view.model && view.model.id){
				taburi = taburi + '/' + view.model.id;
				maintabid = maintabid  + '_' + view.model.id + '_' + view.viewmode;
				title = view.model.id;
			} else if(view.options && view.options.uri.indexOf("#") != 0){
				taburi = (view.mainuri ?  view.mainuri+ '/' : '') + taburi;
				maintabid = (view.mainuri ?  view.mainuri+ '_' : '').replace("#", "") + view.options.uri;
			}else if(view.viewmode){
				taburi = taburi + '/' + view.viewmode;
				maintabid = maintabid  + '_' + view.viewmode;
				
				title = /*title + '-' + */view.viewmode;
			}
			
			var tabcontentid = maintabid + '_tab';
			tabcontentid = tabcontentid.replace(/#|\/|\./ig, '');
			
			if(self.$(self.contentdiv + ' #' + tabcontentid).length <= 0){
				self.createTab(taburi, tabcontentid, app.getMessage(title));
				
				if(view instanceof TabView){
					view.load(self.$('#' + tabcontentid));
					
					self.$('#' + tabcontentid).attr('data-app-mainviewid', view.mainviewid);
				}
				self.openTab(taburi, tabcontentid, view);
			}else
				self.openTab(taburi, tabcontentid, view);
		}, refreshTab: function($currentTab){
			var self = this;

		    self.refresh();
		},closeTab:function($currentTab){
			var self = this;

			var tabContentId = $currentTab.data("aria-controls");
			
			if(self.$('#' +tabContentId).length > 0){
				$currentTab.parent().remove(); //remove li of tab
			    
				var appmainviewid = self.$('#' +tabContentId).data("app-mainviewid");
				if(appmainviewid && app[appmainviewid])
					app[appmainviewid]=null;
				
				self.$('#' +tabContentId).remove(); //remove respective tab content
			    self.$(self.tabdiv+' a:last').tab('show'); // Select first tab
			}
		},createTab:function(taburl, newtabid, title){
			var self = this;
			
			var tabsetting ={};
			if(typeof taburl == 'object'){
				tabsetting=taburl;
				
				taburl = tabsetting.taburl,
				newtabid = tabsetting.tabid,
				title = tabsetting.title||newtabid;
			}
			
			if(newtabid)
				newtabid = newtabid.replace("#", '');
			
			newtabid = newtabid.replace(/#|\/|\./ig, "");
			
			if(taburl && newtabid && title){
				if(self.$(self.tabdiv).length > 0 && self.$(self.tabdiv + ' [href="#'+newtabid+'"]').length <= 0 )
					self.$(self.tabdiv).append('<li role="presentation" class="'+(tabsetting.cssclass ? tabsetting.cssclass:'')+'"><a href="#'+newtabid+'" data-url="'+taburl+'" data-aria-controls="'+newtabid+'" role="tab" data-toggle="tabajax"><i class="glyphicon glyphicon-th-list '+(tabsetting.icon ? tabsetting.icon:'')+'"></i> <span class="view-title">'+app.getMessage((title||'new-tab'))+'</span><button class="close closeTab" type="button" >×</button></a></li>');
				
				if(self.$(self.contentdiv + ' #'+newtabid).length <= 0)
					self.$(self.contentdiv).append('<div role="tabpanel" class="tab-pane fade" id="'+newtabid + '"></div>');
				
			}else if(tabsetting && tabsetting.icon && title){
				if(self.$(self.tabdiv).length > 0)
					self.$(self.tabdiv).append('<li class="'+(tabsetting.cssclass ? tabsetting.cssclass:'')+'"><a role="tab"><i class="glyphicon glyphicon-th-list '+(tabsetting.icon ? tabsetting.icon:'')+'"></i> '+ app.getMessage(title) +'</span></a></li>');
			}
			
			self.createTabEvents();
		}, createTabEvents:function(){
			var self = this;
			
			self.$('.closeTab.close').off('click');
			self.$('.closeTab.close').on('click', function(e){
				e.preventDefault();
				
				self.closeTab($(e.target).parent());
			});
			
			self.$('[data-toggle="tabajax"]').off('click');
			self.$('[data-toggle="tabajax"]').on('click', function(e){
				e.preventDefault();
				
			    var $this = $(e.target);
			    
			    if($this.is('.closeTab')){
			    	self.closeTab($(e.target).parent());
			    }else if($this.is('.refreshTab')){
			    	self.refreshTab($(e.target).parent());
			    }else{	
				    if($this.is('li'))
				    	$this = $this.find('a');
				    else if($this.is('span'))
				    	$this = $this.parents('a:first');
				    else if($this.is('i'))
				    	$this = $this.parents('a:first');
				    
				    var taburi = $this.data('url'),
				    	tabcontainer=$this.data('aria-controls');
				    
				    if(taburi && tabcontainer){
				    	self.openTab(taburi, tabcontainer);
				    }else
				    	console.log("something missing -" + taburi + ' - - ' + tabcontainer)
				   
			    	$this.tab("show");
			    
				    return false;
			    }
			});
		}, updateOption:function(newoptions){
			var self = this;
			
			if(newoptions){
				self.options = $.extend({}, self.options, newoptions);
			}
		}, updateTabs:function(){
			var self = this;
			
			var mainid = self.options.uri.replace("#", "");
			for(var i in self.options.tabs) {
				var tabsetting = _.extend({}, self.options.tabs[i]);
				
				tabsetting.taburl = self.options.uri + '/' + tabsetting.id;
				tabsetting.tabid = mainid + '_' + tabsetting.id + '_tab';
				tabsetting.title = tabsetting.title||tabsetting.id;
				
				if(!tabsetting.hidden)
					self.createTab(tabsetting)
			}
		}, afterLoad:function(){
			var self = this;
			
			if(self.options.tabs){
				if(self.options.refresh){
					self.createTab({title:'refresh', icon:'glyphicon glyphicon-refresh', cssclass:'refresh pull-right'});
					
					self.$('.refresh').on('click', function(e){
						e.preventDefault();
						
						self.refreshTab($(e.target).parent());
					});
				}	
				
				var mainid = self.options.uri.replace("#", "");
				for(var i in self.options.tabs) {
					var tabsetting = _.extend({}, self.options.tabs[i]);
					
					tabsetting.taburl = self.options.uri + '/' + tabsetting.id;
					if(tabsetting.uri && tabsetting.uri.indexOf("#") == 0){
						tabsetting.taburl = tabsetting.uri;
					}
					
					tabsetting.tabid = mainid + '_' + tabsetting.id + '_tab';
					tabsetting.title = tabsetting.title||tabsetting.id;
					
					self.createTab(tabsetting)
				}
			}
			else
				self.createTabEvents();
		}
	});
	
	TabView.DEFAULTS = {
		numberoftabs:10
	};

	return TabView;
});