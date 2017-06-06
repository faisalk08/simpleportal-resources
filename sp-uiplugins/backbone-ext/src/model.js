define( [
	"./core.js"
], function(Backbone){
	"use strict";
	
	var Model = Backbone.Model.extend({
		objecttype:'model'
	});
	/**
	 * Default Options for Backbone.Model
	 */
	Model.DEFAULT_OPTIONS={}
	
	/**
	 * Default implementation for Model.{initialize}
	 */
	Model.prototype.initialize = function(options){
		try{
			if(options && options.urlRoot && !options.local && !_.result(this, 'urlRoot'))
				this.urlRoot = options.urlRoot;
			
			if(options && !options.local)
				if(options && options.url && !_.result(this, 'url'))
					this.url = options.url;
		} catch(error){}
		
		if(options && options.local && this.attributes["local"])
			delete this.attributes["local"];
		if(options && options.url && this.attributes["url"] )
			delete this.attributes["url"];
		if(options && options.urlRoot && this.attributes["urlRoot"] ){
			delete this.attributes["urlRoot"];
		} if(options && options.newmodel && this.attributes["newmodel"] )
			delete this.attributes["newmodel"];
		
		this.options = _.extend({objecttype:this.objecttype}, Model.DEFAULT_OPTIONS, options);
		
		this.registerValidation();
	}
	/**
	 * API for returning model type
	 */
	Model.prototype.getObjecttype = function(attrs, options) {
		return this.objecttype;
	}
	
	/**
	 * Default implementation for Model.{_validate} method
	 */
	Model.prototype._validate = function(attrs, options) {
		var self = this;
		if (!options.validate || !self.validate) return true;
		
		if(!attrs||Object.keys(attrs).length == 0){
			attrs = _.extend({}, self.attributes, attrs);
			var error = this.validationError = this.validate(attrs, options) || null;
			if (!error) return true;
			self.trigger('invalid', this, error, _.extend(options, {validationError: error}));
		    return false;
		} else {
			options.skipempty=true;
			var error = self.validate(attrs, options) || null;
			if (!error) return true;
			if(!self.validationError){
				self.validationError = error;
				self.trigger('invalid', self, error, _.extend(options, {validationError: error}));
			} else{
				self.validationError=_.extend(self.validationError||{}, error);	
				self.trigger('invalidfield', self, error, _.extend(options, {validationError: error}));
			}	
		    return false;
		}
	}

	/**
	 * Default implementation of Model.{validate} method
	 */
	Model.prototype.validate = function(attributes, options){
		var self = this,
			validationmessages = {};
		
		if(self.validators)
			for (var key in self.validators) {
		        if(self.validators.hasOwnProperty(key)) {
		        	if(!attributes.hasOwnProperty(key) && options.skipempty){} else{
		        		var check = self.validators[key](attributes[key]);
		        		if (!check.isValid) {
		                	validationmessages[key] = check.message;
		                }else if (self.validationError && self.validationError[key]){
		                	delete self.validationError[key];
		                	self.trigger('validfield', self, key, options);
		                }
		        	}
		        }
		    }
			
		if(validationmessages && Object.keys(validationmessages).length > 0)
			return validationmessages;
	}

	/**
	 * Method for registering the validations, only called while initializing the Model object
	 */
	Model.prototype.registerValidation = function(validations){
		var self = this;
		
		self.validations = _.extend({}, self.validations||{}, self.options.validations||{}, validations||{});
		
		if(self.validations){
			self.validators = {};
			
			for(var field in self.validations){
				var validation = self.validations[field];
				
				if(typeof validation == 'string'){
					if(validation.indexOf(',') == -1 && utils.validations.hasOwnProperty(validation)){
						self.validators[field] =(function(validation, field) {
						  return function(value) {
							  return utils.validations[validation](value);
						  }
						})(validation, field);
					}else{
						var vals = validation.split(',');
						
						self.validators[field] =(function(vals, field) {
						  return function(value) {
							  return utils.validations['groupcheck'](vals, value);
						  }
						})(vals, field);
					}
				} else if(typeof validation == 'function'){
					self.validators[field] = validation; 
				}
			}
		}
	}

	Model.prototype.put = function(url, options){
		var self = this;
		
		var url_ = self.url();
		
		if(url && url.indexOf("/") != 0)
			url_ = url_ + '/' + url;
		else if(url)
			url_ = url;
		
		var model = new Model({urlRoot:url_});
		model.url = function(){return url_;};
		
		if(options && options.data)
			model.set(options.data);
		
		if(options && options.success)
			model.on('sync', options.success);
		if(options && options.error)
			model.on('error', options.error);
		
		model.save(options.data, {type:'PUT'});
	};
	
	Model.prototype.post = function(url, options){
		var self = this;
		
		var url_ = self.url();
		
		if(url && url.indexOf("/") != 0)
			url_ = url_ + '/' + url;
		else if(url)
			url_ = url;
		
		var model = new Model({urlRoot:url_});
		model.url = function(){return url_;};
		
		if(options && options.data)
			model.set(options.data);
		
		if(options && options.success)
			model.on('sync', options.success);
		if(options && options.error)
			model.on('error', options.error);
		
		model.save(options.data);
	};
	
	Model.prototype.remoteGet = function(url, options){
		var self = this;
		
		var url_ = self.url();
		
		if(url && url.indexOf("/") != 0)
			url_ = url_ + '/' + url;
		else if(url)
			url_ = url;
		
		var model = new Model({urlRoot:url_});
		model.url = function(){return url_;};
		
		if(options && options.success)
			model.on('sync', options.success);
		if(options && options.error)
			model.on('error', options.error);
		
		model.fetch();
	};
	
	return Model;
});