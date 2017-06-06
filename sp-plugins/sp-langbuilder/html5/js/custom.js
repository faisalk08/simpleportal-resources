var customurimappings = {
	'langkeyexport':{
		templateName:'langkeyexport.html?layout=accordion',
		fieldsettings:{
			"tags":{
				url:'/api/langtag/active', display:'title', id:'id', multiple:true, ajax:true
			}
		}
	},'translator':{
		remoteTemplate:'templates/translator.html',
		fieldsettings:{
			translation:{
				field:'translation',
				fieldplugin:'virtualkeyboard'
			}
		}
	}
};
window.urimappings = _.extend(window.urimappings||{}, customurimappings);

define( [
 	"/uiplugin/backbone-ext/src/backbone-ext.js"
 ], function(Backbone) {
 	var exports = this;//{};
 	
 	window.Translator = window.Langkey.extend({
 		url:function(){
 			return '/api/langkey/translator';
 		},
		validations : {
			'key':'required'
		}
	});
// 	
// 	Translator.prototype.url = function(){
//		return '/api/langkey/translator';
//	}
 	
	var TranslatorView = exports.TranslatorView = Backbone.FormView.extend({
//		templateName:'translator.html',
//		templatedir : 'templates/',
//		remoteTemplate:'templates/translator.html',
		/**
		 * @method overriding the default template and template directory 
		 */
		afterLoad:function(){
			var self = this;

//			Backbone.Fieldplugins.register(self.options.fieldsettings["tags"], null, self);
//			Backbone.Fieldplugins.register(self.options.fieldsettings["status"], null, self);
		},
		afterInitialize : function(callback){
			var self = this;
			
//			delete this.options.templateName;
//			delete this.options.templatedir;

//		 	var TranslatorModel = window.Langkey.extend({
//		 		url:function(){
//		 			return '/api/langkey/translator';
//		 		},
//				validations : {
//					'key':'required'
//				}
//			});
		 	
			self.model = new Translator({local:true});
			
			self.on('afterload', function(){
				self.loadCustomFields();
			});
			
//			TranslatorView.__super__.afterInitialize.apply(self, arguments);
			if(callback)
				callback();
		}, loadCustomFields:function(){
			var self = this;
			
			self.$('[name=key]').on('change', function(){
				self.loadTranslation($(this).val());
			});
			
			self.$('.translation').each(function(){
				Backbone.Fieldplugins.register({field:this.name});
				
				window.VKI_imageURI='/uiplugin/virtual-keyboard/keyboard.png';
				VKI_attach(this, '/uiplugin/virtual-keyboard/keyboard.png');
			});
		}, loadTranslation:function(key){
			var self = this;
			
			self.$('.translation').val('');
			self.$('.translation[name=en]').val(window.Backbone.Utils.convertLangKey(key));
			
			if(key && key != '')
				$.get('/api/langkey/$cmd/aggregate?$match=key='+key, function(data){
					var dataroot ='count';
									
					//@TODO need to correct when aggregate function is correctly implemented
					if(data && data[dataroot]){
						var results = data[dataroot];
						for(var index in results){
							if(index !== 'count'){
								console.log("setting value for tranl -->" + results[index].langId)
								self.setValue(results[index].langId, results[index].translation);
							}
						}
					}
					self.model.unset('languages');
					self.model.unset('$count');
				});
		}
	});
});