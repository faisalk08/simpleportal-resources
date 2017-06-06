define( [
	"./core.js",
	"./form.js",
	"./../../collection.js"
], function(CustomBackboneView, BackboneFormView, BackboneExtCollection){
	"use strict";
	
	/**
	 * Form with functions to handle the form submit
	 */
	var SearchView = BackboneFormView.extend({
		viewmode:'search',
		afterLoad:function(){
			var self = this;
			
			self.$('.export').on('click', function(event){
				self.exportData(event);
			});
			
			// get the target for save button
			var searchtarget = self.$(".save").data("target") || '.search_results';
			self.resultsdiv = searchtarget;
		},
		exportData:function(event){
			var self = this;
			
			var exporturl = $(event.target).attr('href');
			
			var mainfield = _.omit(self.model.toJSON(), function(value, key, object){
	    		return value instanceof Object;
    		});
			
			if(exporturl.indexOf("?") != -1)
				exporturl = exporturl.substring(0, exporturl.indexOf('?'));
			
			$(event.target).attr('href', exporturl + '?'+ $.param(mainfield));
			
			return true;
		},
		
		/**
		 * @Override save method 
		 * 
		 * Function will search inside api instead of saving the record in to the api.
		 */
		save : function (next) {
			var self = this;
			self.search(next);
		}
	});

	/**
	 * Form search handler for form based view
	 */
	SearchView.prototype.search = function (next) {
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
					__search(self, callback);
			});
		else
			__search(self, callback);
		
		return false;
	};
	
	var __search = function(self, callback){
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
            	
        		var results = response;
        		if(response && typeof response.length != "number"){
        			results = response["results"];
        		}
        		
        		var collection = new BackboneExtCollection(results, {local:true});
        		
        		var view = new CustomBackboneView({
        			local:true, 
        			url:'', 
        			model:collection, 
        			templatedir:self.options.templatedir, 
        			templateName:'searchresult.html?layout=nil'
        		});
        		
        		view.load(self.$(self.resultsdiv));
            	
            	self.trigger('aftersearch');
            },
            error: function (model, response, options) {
            	if(callback)
            		callback(response);
            	
            	self.trigger('search_error', this, model, response, options);
            }
        });
	}
	
	return SearchView;
});