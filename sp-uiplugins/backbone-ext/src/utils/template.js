/**
 * A Plugin for loading the backbone templates and keeping it in local storage
 * 
 * uses a template Version so that any time any update in the template will reset the template
 * and will again fetch from the server.
 * 
 */
define(function(){
	"use strict";
	
	var TemplateLoader = function(options){
		this.options = $.extend({}, TemplateLoader.DEFAULTS, options);
		
		__init(this, options);
	};
	
	TemplateLoader.prototype.getTemplate = function(templateName, templatepath, callback){
		var self = this,
			templateContent;
		
		if(templateName || templatepath){
			var templateContent = getLocalTemplate(self, templateName, templatepath);
			
			if(!templateContent)
				getRemoteTemplate(self, templateName, templatepath, callback);
			else if(callback)
				callback(templateContent);
			else
				return templateContent;
		}else if(!templateName){
			getRemoteTemplate(self, templateName, templatepath, callback);
		}else if(callback)
			callback(templateContent);
		else
			return templateContent;
	};
	
	TemplateLoader.prototype.getVersion = function() {
		return this.options["templateVersion"];
	}
	
	TemplateLoader.prototype.getStorage = function() {
		if (isLocalStorageAvailable()) {
			return window[storage];
		} else 
			return null;
	}
	
	/**
	 * To add a template to the local templates array
	 */
	TemplateLoader.prototype.addTemplate = function(templateName, data) {
		this.templates[templateName] = data;
	};
	
	/**
	 * To save the templates in to the local storage
	 */
	TemplateLoader.prototype.save=function() {
		var self = this;
		
		if (isLocalStorageAvailable()) {
			try{
				self.getStorage().setItem("templates", JSON.stringify(self.templates));
			}catch(err){
				console.log(err);
			}
		}
	};
	
	TemplateLoader.DEFAULTS = {
		templateVersion:'0.0.0'
	}

	var __loadFromStorage = function(templateLoader){
		if (window[storage]) {
			var templateVersion = window[storage].getItem("templateVersion");
			
			if (templateVersion && templateVersion == templateLoader.getVersion()) {
				var templates = window[storage].getItem("templates");
				
				if (templates) {
					templates = JSON.parse(templates);
					for (var x in templates) {
						if (!templateLoader.templates[x]) {
							templateLoader.addTemplate(x, templates[x]);
						}
					}
				}
			}else {
				window[storage].removeItem("templates");
				window[storage].removeItem("templateVersion");
			}
        }
	}
	
	var __init= function(templateLoader, options){
		templateLoader.templates= {};
		templateLoader.templates_que=[];
		
		// set the value in to local storage
		window[storage].setItem("templateVersion", templateLoader.options["templateVersion"]);
	}
	
	/**
	 * To check the local storage available or not
	 */
	var isLocalStorageAvailable = function() {
		try {
			return storage in window && window[storage] !== null;
		} catch (e) {
			return false;
		}
	}
	
	/**
	 * To read the template content from the local storage or from the 
	 * html element id
	 */
	var getLocalTemplate = function(templateLoader, templateName, templatepath, callback){
		var templateContent;
		
		if(templateName){
			templateContent = templateLoader.templates[templateName];
			
			if(	!templateContent && 
				$(getHtmlTemplateSelector(templateName)) && 
				$(getHtmlTemplateSelector(templateName)).length > 0){
					templateContent = $(getHtmlTemplateSelector(templateName)).html();
			}else if(!templateContent && 
				$(getHtmlTemplateSelector(templateName, 'template')) && 
				$(getHtmlTemplateSelector(templateName, 'template')).length > 0){	
					templateContent = $(getHtmlTemplateSelector(templateName, 'template')).html();
			}
		} else if(templatepath){
			var remoteTemplateName = templatepath.substring(templatepath.indexOf('/')+1);

			remoteTemplateName = formatTemplateKey(remoteTemplateName);//
			
			if($(getHtmlTemplateSelector(templateName)) && $(getHtmlTemplateSelector(templateName)).length > 0){
				templateContent = $(getHtmlTemplateSelector(templateName)).html();
			}else if( $(getHtmlTemplateSelector(templateName, 'template')) && 
				$(getHtmlTemplateSelector(templateName, 'template')).length > 0){	
				
				templateContent = $(getHtmlTemplateSelector(templateName, 'template')).html();
			}else{
				var remoteTemplateName = formatTemplateKey(templatepath);//templatepath.replace(/(\/|\.|\?|=)/g, '_');

				templateContent = templateLoader.templates[formatTemplateKey(remoteTemplateName)];
			}	
		}
		
		if(callback)
			callback(templateContent);
		else
			return templateContent;
	};
	
	var getHtmlTemplateSelector = function(templatename, prefix){
		// using _tmpl after the template name 
		return '#' + templatename + ('_' + (prefix||'tmpl'));
	}
	
	var formatTemplateKey = function(urlpath){
		return urlpath.replace(/(\/|\.|\?|=|&)/g, '_');
	}
	
	var getRemoteTemplate = function(templateLoader, templateName, templatepath, callback){
		if(templateLoader.templates_que[templatepath]);
		
		$.get(templatepath, function(data) {
			if(data){
				if(templatepath){
					var remoteTemplateName = formatTemplateKey(templatepath)//.replace(/(\/|\.|\?|=)/g, '_');
					
					templateLoader.addTemplate(remoteTemplateName, data);
					
					// save the template in to the local storage
					//templateLoader.save();
				}
			}
			
			if(callback)
				callback(data);
			else
				return data;
		}, 'text').fail(function(error) {
			if(callback)
				callback(null, error);
		});
	}
	
	var storage = 'sessionStorage';
	return TemplateLoader;
});
