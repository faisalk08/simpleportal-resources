define( [
	"./core.js"
], function(Backbone){
	"use strict";
	
	var Collection = Backbone.Collection.extend({
		objecttype:'collection',
		modelId:function(attrs){
			return attrs['id'] ? attrs['id'] : attrs['_id'];
		}, parse: function(response) {
			var self = this;
			
			if(response && typeof response == 'object' && typeof response.length != 'number' && response["results"]){
				self.totalrecords=response["info"] ? response["info"].count : response["results"].length;
				return response["results"];
			}else
				return response;
		}, next:function(success){
			var lastModel = this.last();
			
			var self = this;
			
			self.fetch({remove: false, data: {'_id>': lastModel.id}, success:function(){
				if(success)
					success();
			}});
		}
	});
	
	/**
	 * Default Options for Collection
	 */
	Collection.DEFAULT_OPTIONS={}

	/**
	 * Default implementation for Collection.{initialize}
	 */
	Collection.prototype.initialize = function(models, options){
		options || (options = {});
		
		if(options && (options.urlRoot && !options.local) && !_.result(this, 'urlRoot') )
			this.urlRoot = options.urlRoot;
		
		if(options && !options.local)
			if(options.url && !_.result(this, 'url'))
				this.url = options.url;	

		if(options && (options.url && !options.local) && !_.result(this, 'url'))
			this.url = options.url;
		else if(this.urlRoot)
			this.url = this.urlRoot;
		
		if(!this.model)
			this.model = Backbone.Model;
		
		this.options = _.extend({}, Collection.DEFAULT_OPTIONS, options);

		if(this.options["dataroot"]){
			this.parse=function(response) {
				if(typeof response == "object")
					return response[options["dataroot"]];
				else
					return response;
			}
		}
	};
	
//	if(window && window.Backbone){
//		window.Backbone.Collection=Collection;
//	}
	
	return Collection;
	/*{
		Collection:Collection
	};*/
});