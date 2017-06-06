window.languages=[];
window.translations = {};

window.SPAppRouter = window.BackbootAppRouter.extend({
	log:function(message, type){
		if(!type||type == ''){
			type='INFO'
		}
		
		if(window.console && console.log){
			console.log(type +':'+message);
		}
		
		if(type&&(type == 'ALERT'|type == 'alert')){
			alert(message);
		}
	},
    getMessage:function(key, args){
    	if(!key)
    		return key;
    	var langkey = 'en';
    	
    	if(window.userprofile)
    		langkey = (window.userprofile.get('preference')||{}).languageId;
    		
    	/*
    	 * Should use the translation from the remote server later for now fine to use the json based translation.
    	 *
    	 */
    	if(window.translations && window.translations[langkey]){
    		if(window.translations[langkey][key]){
    			return this.formatLangArguments(window.translations[langkey][key], args);
    		}else if(window.translations[langkey][key.toLowerCase()]){
    			return this.formatLangArguments(window.translations[langkey][key.toLowerCase()], args);
    		}else
    			return this.convertLangKey(key);
    	}else{
    		return this.convertLangKey(key);
    	}
    },
    formatLangArguments:function(value, args){
    	/*
    	 * This function will replace the dynamic value passed in arguments.Eg: {0} will be replaced with first value in arguments array.
    	 */
    	if(args && args.length > 0){
			for(var index in args){
				value = value.replace('{'+index+'}', args[index]);
			}
		}
		
		return value;
    },
    convertLangKey:function(key){
    	return utils.capitaliseFirstLetter(key.replace(/[-|_]/gi, ' '));
    },before:function(){
    	this.hideNotification();
    	$(this.options.main).block();
    },after:function(){
    	this.clearBreadcumb();
    	$(this.options.main).unblock();
    }
});