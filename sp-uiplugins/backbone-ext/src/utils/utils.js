define(function(){
	"use strict";
	
    /**
     * Default implementation
     */
    var utils = {
		/**
		 * Default options for Utils
		 */
		DEFAULT_OPTIONS : {
			datepicker:{
				format:'dd.mm.yyyy'
			}
		},
	
		/**
		 * @property validations
		 * Default validation mechanism can be extended or repaced with a more configurable js validation tool.
		 * 
		 */
		validations:{
			groupcheck:function(validations, value){
				var message = [];
				var result = true;
				for(var i in validations){
					var validation = validations[i];
					if(utils.validations[validation]){
						var result_ = utils.validations[validation](value);
						if(!result_.isValid)
							message.push(result_.message);
						result = result&&result_.isValid;
					}
				}
				
				if(result)
					message =[];
				
				return utils.validations.message(result, message.join(','));
			},
			required:function(value){
				return utils.validations.message((value && (value + '').length > 0), "You must enter a Value");
			},
			time:function(value){
				if(!value)
					return utils.validations.message(true);
				return utils.validations.message((value.match(/^(\d{1,2}(.\d{2})?)([ap]m)?$/)), 'Not a valid Time!');
			},
			url:function(value){
				if(!value)
					return utils.validations.message(true);
				
				//var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
				
//    				var regexp = new RegExp("^(((ht|f)tp(s?))\://)?(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
//    				return utils.validations.message(regexp.search(regexp) != -1, "It has to be URL!");
				
				return utils.validations.message(utils.isValidURL(value), "It has to be URL!");
				//return utils.validations.message((value && value.length > 0), "It has to be URL!");
			},
			colorcode:function(value){
				if(!value)
					return utils.validations.message(true);
				
				var regexp = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
				return utils.validations.message(regexp.test(value), "It has to be Hex color code!");
			},
			email:function(value){
				if(!value)
					return utils.validations.message(true);
				var regexp = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
				return utils.validations.message(regexp.test(value), "It has to be Email!");
			},
			float:function(value){
				if(!value)
					return utils.validations.message(true);
				
				return utils.validations.message(/^-?\d*(\.\d+)?$/.test(value), "It has to be a float value");
			},
			number:function(value){
				if(!value)
					return utils.validations.message(true);
				
				return utils.validations.message(/^\d+$/.test(value), "It has to be a number");
			},
			message:function(result, message){
				return result ? {isValid: true} : {isValid: false, message: message};
			}
		},
	    /**
	     * Asynchronously load templates located in separate .html files
	     * @method loadTemplate
	     */ 
	    loadTemplate: function(views, callback) {
	    	var deferreds = [];
	        
	        if(window)
	        	window.templates = window.templates||{};
	        
	        $.each(views, function(index, view) {
	            if(view.indexOf('.html') == -1||view.indexOf('.htm') == -1)
	                deferreds.push($.get('templates/' + view + '.html', function(data) {
	                	window.templates[view] = data;
	                	if (window[view])
	                		window[view].prototype.template = _.template(data);
	                }));
	        	else
	        		deferreds.push($.get('templates/' + view, function(data) {
	        			window.templates[view] = data;
	        			if (window[view])
	        				window[view].prototype.template = _.template(data);
	                }));
	        });

	        //@TODO makesure always jquery is available!!
	        $.when.apply(null, deferreds).done(callback);
	    },
	    
	    /**
	     * Asynchronously get templates located in separate .html files
	     * @method getTemplate
	     */ 
	    getTemplate: function(view, callback) {
	    	window.templates = window.templates||{};
	    	if(window.templates[view])
	    		callback(window.templates[view]);
	    	else if(view.indexOf('.html') == -1||view.indexOf('.htm') == -1)
	            $.get('templates/' + view + '.html', function(data) {
	            	window.templates[view] = data;
	            	callback(data);
	            });
	    	else{
	    		$.get('templates/' + view, function(data) {
	            	window.templates[view] = data;
	            	callback(data);
	            });
	    	}
	    },
	    
	    loadModels: function(models, callback) {
	        var deferreds = [];
	        window.templates = window.templates||{};
	        $.each(views, function(index, view) {
	        	if (window[view]) {
	                deferreds.push($.get('js/models/' + view + '.js', function(data) {
	                	window[view].prototype.template = _.template(data);
	                }));
	            } else {
	                alert(view + " not found");
	            }
	        });

	        $.when.apply(null, deferreds).done(callback);
	    },

	    /**
	     * Ajax based file upload
	     * 
	     * @method uploadFile
	     * @param url url to submit
	     * @param file file to upload
	     * @param callback callback function when server returns a result
	     */ 
	    uploadFile: function (url, file, callback) {
	        var self = this;
	        
	        var data = new FormData();
	        
	        data.append('file', file);
	        
	        $.ajax({
	            url: url,
	            type: 'POST',
	            data: data,
	            processData: false,
	            cache: false,
	            contentType: false
	        })
	        .done(function (data) {
	        	callback(null, data);
	        })
	        .fail(function () {
	        	callback('An error occurred while uploading ' + file.name);
	        });
	    },
	    
	    /**
	     * Get number of days between two days
	     * 
	     * @method getDayDifference
	     * @param startDate start date
	     * @param endDate end date to compare
	     * 
	     * @returns number of days 
	     */ 
	    getDayDifference: function(startDate, endDate) {
	    	
	    	var numberOfDays = -1;
	    	
	    	if(startDate != undefined && startDate != '' && startDate instanceof Date && 
	    	   endDate != undefined && endDate != '' && endDate instanceof Date) {
	    		
	    		if(endDate >= startDate) {
	            	var oneDay = 1000*60*60*24;
	            	numberOfDays = Math.round((endDate.getTime() - startDate.getTime()) / oneDay) + 1;
	            }
	    	}
	    	
	    	return numberOfDays;
	    },
	    
	    /**
	     * Validate given url
	     *  
	     * @method isValidURL
	     * @param url to validate
	     * 
	     */
	    isValidURL: function(url) {
	    	
	    	// non-mandatory http 
	    	var urlPattern = new RegExp("^(((ht|f)tp(s?))\://)?(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
	    	
	    	// mandatory http
	    	// var urlPattern = new RegExp("^(((ht|f)tp(s?))\://).+(www.|[a-zA-Z].)[a-zA-Z0-9\-\.]+\.(com|de|edu|gov|mil|net|org|biz|info|name|museum|us|ca|uk|be|bd|in|eu)(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\;\?\'\\\+&amp;%\$#\=~_\-]+))*$");
	    	
	    	if(url.search(urlPattern) != -1)
	    		return true; 
	    	
			return false;
	    	
	    },
	    
	    appendToUrl : function(url, data){
	    	var extension;
	    	
	    	if(data && typeof data == "object")
	    		extension = Object.keys(data).map(function(k) {
	    		    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
	    		}).join('&');
	    	
	    	if(extension && !(url.indexOf(extension) + extension.length == url.length)){
	    		if(url.lastIndexOf("?") == -1)
	    			url = url + '?';
		    	else if(path.lastIndexOf("&") == url.length-1)
		    		url = url + '&';
	    		
	    		return url + ((url.indexOf(extension) + extension.length == url.length) ? "" : extension);
	    	}else
	    		return url;
	    },
	    
	    generateId: function(name) {
	    	if (name) {
	    		//name = name.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
	    		name = name.replace(/(undefined|null|[^-\.a-zA-Z0-9]+)/g, '').toLowerCase();
	    	}
	    	
	    	return name;
	    },
	    
	    /**
	     * To capitalize the given words first letter
	     */
	    capitaliseFirstLetter : function(string){
	    	if(!string)
	    		return string;
	    	return string.charAt(0).toUpperCase() + string.slice(1);
	    },
	    lowercaseFirstLetter : function(string){
	    	if(!string)
	    		return string;
	    	return string.charAt(0).toLowerCase() + string.slice(1);
	    },
	    
	    /**
	     * Cookie related functions
	     * 
	     */
	    createCookie : function(name,value,days) {
	    	if (days) {
		        var date = new Date();
		        date.setTime(date.getTime()+(days*24*60*60*1000));
		        var expires = "; expires="+date.toGMTString();
	    	}
	    	else 
	    		var expires = "";
			document.cookie = name+"="+value+expires+"; path=/";
		},
	    readCookie : function(name) {
	    	var nameEQ = name + "=";
	    	var ca = document.cookie.split(';');
	    	for(var i=0;i < ca.length;i++) {
		        var c = ca[i];
		        while (c.charAt(0)==' ') c = c.substring(1,c.length);
		        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	    	}
	    	return null;
	    },
	    eraseCookie : function(name) {
	    	utils.createCookie(name,"",-1);
	    },
	    
	    /**
	     * Custom method for getting the language id from the users profile
	     * @TODO use cookies to get the users language.
	     * 
	     */
	    getLanguageId : function(){
			if(window.userprofile && window.userprofile.get('languageId')){
				var langkey = window.userprofile.get('languageId');
		
				var langid = langkey.split('_')[0];
				if(langid == 'en')
					return null;
				else
					return langid;
			}  else
				return null;            
		},
		
		getTranlsatedMessage : function(translationlookup, langkey, key, args){
			if(!key || typeof key !== 'string')
				return key;
			
			/*
			 * Should use the translation from the remote server later for now fine to use the json based translation.
			 */
			if(translationlookup && translationlookup[langkey]){
				if(translationlookup[langkey][key]){
					return this.formatLangArguments(translationlookup[langkey][key], args);
				} else if(translationlookup[langkey][key.toLowerCase()]){
					return this.formatLangArguments(translationlookup[langkey][key.toLowerCase()], args);
				} else if(translationlookup[langkey][key.toUpperCase()]){
					return this.formatLangArguments(translationlookup[langkey][key.toUpperCase()], args);
				}else if(key.indexOf("-") > -1){
					var keyarray = key.split("-");
					
					var translatedmessage = '';
					for(var index in keyarray)
						translatedmessage += ' ' + this.getTranlsatedMessage(translationlookup, langkey, keyarray[index]);
					
					return translatedmessage;
				}else return this.convertLangKey(key);
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
		}
		
		/**
		 * To get the random color.
		 * @TODO should remove white or dark color using a blacklisted random color
		 * 
		 * @method getRandomColor
		 */
		,getRandomColor:function(skipcolor) {
		    var letters = '0123456789ABCDEF'.split('');
		    
		    var color = '#';
		    for (var i = 0; i < 6; i++ ) {
		    	color += letters[Math.floor(Math.random() * 16)];
		    }
		    
		    do{
		    	color = '#';
			    for (var i = 0; i < 6; i++ ) {
			    	color += letters[Math.floor(Math.random() * 16)];
			    }
		    }while(skipcolor && _.indexOf(skipcolor, color) != -1)
		    	
		    return color;
		},
		dateTools : {
			parseFormat: function(format){
				var separator = format.match(/[.\/-].*?/),
					parts = format.split(/\W+/);
				if (!separator || !parts || parts.length == 0){
					throw new Error("Invalid date format.");
				}
				return {separator: separator, parts: parts};
			},
			parseDate: function(date, format) {
				if(!date) return;
				var parseddate;
				if(typeof format !== 'object')
					parseddate = $.datepicker.parseDate(format, date);
				
				if (parseddate)
					return parseddate;
				else{
					if(typeof format === 'string')
						format = utils.dateTools.parseFormat(format);
					
					var parts = date.split(format.separator),
						date = new Date(),
						val;
					if (parts.length == format.parts.length) {
						for (var i=0, cnt = format.parts.length; i < cnt; i++) {
							val = parseInt(parts[i], 10)||1;
							switch(format.parts[i]) {
								case 'dd':
								case 'd':
									date.setDate(val);
									break;
								case 'mm':
								case 'MM':
								case 'm':
									date.setMonth(val - 1);
									break;
								case 'yy':
								case 'YY':
									date.setFullYear(2000 + val);
									break;
								case 'yyyy':
								case 'YYYY':
									date.setFullYear(val);
									break;
							}
						}
					}
					return date;
				}
			},
			formatDate: function(date, format){
				var fomateddate = $.datepicker.formatDate(format, date);
				if (fomateddate)
					return fomateddate;
				else {
					if(typeof format === 'string')
						format = utils.dateTools.parseFormat(format);
					
					var val = {
						d: date.getDate(),
						m: date.getMonth() + 1,
						yy: date.getFullYear().toString().substring(2),
						yyyy: date.getFullYear()
					};
					
					val.dd = (val.d < 10 ? '0' : '') + val.d;
					val.mm = (val.m < 10 ? '0' : '') + val.m;
					var date = [];
					
					for (var i=0, cnt = format.parts.length; i < cnt; i++) {
						date.push(val[format.parts[i]]);
					}
					return date.join(format.separator);
				}
			},
			parseFormat: function(format){
				var separator = format.match(/[.\/-].*?/),
					parts = format.split(/\W+/);
				if (!separator || !parts || parts.length == 0){
					throw new Error("Invalid date format.");
				}
				return {separator: separator, parts: parts};
			},
			
			/**
			 * Method to add days to a specific date
			 * @method addDays
			 * @param someDate 
			 * @param days number of days to add 
			 */
			addDays : function(someDate, days) { //someDate: Date, days: int
				var tempDate = someDate;
				tempDate.setTime(tempDate.getTime() +  (days * 24 * 60 * 60 * 1000));
				return tempDate;
			},
			addHours : function(someDate, hours) { //someDate: Date, days: int
				var tempDate = someDate;
				tempDate.setTime(tempDate.getTime() +  (hours * 60 * 60 * 1000));
				return tempDate;
			},
			addWeeks : function(someDate, weeks) { //someDate: Date, days: int
				var tempDate = someDate;
				tempDate.setTime(tempDate.getTime() +  (weeks * 7 * 24 * 60 * 60 * 1000));
				return tempDate;
			},
			countWeekendDays:function ( startdate, enddate ) {
			    var ndays = 1 + Math.round((enddate.getTime() - startdate.getTime())/(24*3600*1000));
			    
			    var nsaturdays = Math.floor((startdate.getDay() + ndays) / 7);
			    
			    return 2*nsaturdays + (startdate.getDay() == 0) - (enddate.getDay() == 6);
			},countWorkingDays:function (startDate, endDate) {
				  
			    // Validate input
			    if (endDate < startDate)
			        return 0;
			    
			    // Calculate days between dates
			    var millisecondsPerDay = 86400 * 1000; // Day in milliseconds
			    startDate.setHours(0,0,0,1);  // Start just after midnight
			    endDate.setHours(23,59,59,999);  // End just before midnight
			    var diff = endDate - startDate;  // Milliseconds between datetime objects    
			    var days = Math.ceil(diff / millisecondsPerDay);
			    
			    // Subtract two weekend days for every week in between
			    var weeks = Math.floor(days / 7);
			    days = days - (weeks * 2);

			    // Handle special cases
			    var startDay = startDate.getDay();
			    var endDay = endDate.getDay();
			    
			    // Remove weekend not previously removed.   
			    if (startDay - endDay > 1)         
			        days = days - 2;      
			    
			    // Remove start day if span starts on Sunday but ends before Saturday
			    if (startDay == 0 && endDay != 6)
			        days = days - 1  
			            
			    // Remove end day if span ends on Saturday but starts after Sunday
			    if (endDay == 6 && startDay != 0)
			        days = days - 1  
			    
			    return days;
			}
		},
		
		datePicker : function(view, $dateField, options){
			var model = view.model;
			options = _.extend(window.utils.DEFAULT_OPTIONS.datepicker, options);
			
			for(var i in options){
				if(typeof options[i] == 'string'){}
				else if(options[i].length > 1){
					//for(var j in options[i])
						options[i][0].on('changed', function(){
							$dateField.trigger('change');
						});
				}else
					options[i].on('changed', function(){
						$dateField.trigger('change');
					});
			}
			
			$dateField
			.datepicker({format:'dd.mm.yyyy'})
			.on('show', function(){
				var dp = $(this);
				if(dp.val() == ''||dp.val() == '01.02.1970')  {
					if(options && typeof options.fromdate == 'string'){
						dp.val(options.fromdate).datepicker('update');
					}else
						dp.val(today.getDate()+'.'+(today.getMonth() + 1)+'.'+today.getFullYear()).datepicker('update');
					return false;
				}
			}).on('changeDate', function(ev){
				view.change(ev);
				$dateField.trigger('changed');
				
				var dp = $(this);
				dp.datepicker('hide');
				
			}).on('hide', function(e){
				var dp = $(this);
				if(dp.val() == ''||dp.val() == '01.02.1970')
					$dateField.val('');
				view.change(e);
				$dateField.trigger('changed');
			});
		}
	};
    
    var SimpleDatePicker = function(selector, options){
    	this.options = _.extend(SimpleDatePicker.DEFAULT_OPTIONS, options);
    	
    	this.$dateField =$(selector);
    	this.init();
    }

    SimpleDatePicker.DEFAULT_OPTIONS = {
    	format:'dd.mm.yyyy',
    	autoclose:true,
    	calendarWeeks:true,
    	clearBtn:true,
    	todayHighlight:true,
    	todayBtn:"linked"/*,
    	endDate:'0d'*/
    };

    SimpleDatePicker.prototype.init = function(){
    	var self = this;
    	
    	self.createdp();
    }

    /**
     *  Method for creating the date picker 
     *  @method createdp 
     */
    SimpleDatePicker.prototype.createdp= function(){
    	var self = this;
    	
    	self.$datepicker = self.$dateField.datepicker(self.options);
    }

    function RealTimeNotification(options) {
    	this.init(options);
    	
    	return this;
    }

    RealTimeNotification.prototype.options={
    	color:{
    		"default":"#3276B1",
    		"success":"#739E73",
    		"error":"#C46A69",
    		"info":"#C79121"
    	},
    	timeout:{
    		"default":6000,
    		"success":8000,
    		"error":5000,
    		"info":3000
    	}
    };

    RealTimeNotification.prototype.init = function(options){
    	if(options)
    		$.extend(this.options, options);
    };

    RealTimeNotification.prototype.newmessage = function(type, data){
    	self.message(type, data);
    };

    RealTimeNotification.prototype.message = function(type, data){
    	var self = this;
    	type = type||'default';
    	
    	var data = data || {docId:1, title:'Notification', content:'Notification content'};
    	var timeout = data.timeout||self.options.timeout[type] || self.options.timeout['default'];
    	var color = self.options.color[type] || self.options.color['default'];
    	//app.log('Notification color -- ' + color);
    	
    	var _options_ = {
    		title : data.title,
    		content : data.content||'',
    		color : color,
    		icon : "fa fa-bell swing animated",
    		number : data.docId
    	};
    	
    	if(timeout&&timeout != -1)
    		_options_.timeout=timeout;
    		
    	$.smallBox(_options_, function() {
    		if(data&&data.onclose){
    			data.onclose();
    		} else if(data&&data.onClose){
    			data.onClose();
    		}
    	});
    };

    /**
     * AUTOCOMPLETE SOURCE
     */
    function SimpleSelector(options) {
    	return this.init(options);
    }

    SimpleSelector.DEFAULT_OPTIONS = {
    	page_limit : 10, 
    	ajax:true, 
    	change:function(){}, 
    	plugin:'select2', 
    	minimumInputLength:3,
    	title:'Category', 
    	container:'#header-autocomplete-container', 
    	id:'#header-autocomplete',
    	minwidth:'300px'
    };

    SimpleSelector.prototype.init = function(options){
    	var self = this;
    	
    	self.options = $.extend({}, SimpleSelector.DEFAULT_OPTIONS, options);
    	
    	if((this.options.url||this.options.data)&&this.options.datakey&&!this.options.datadisplay){
    		this.options.datadisplay = this.options.datakey
    	}else if((this.options.url||this.options.data) && !this.options.datakey){
    		this.options.datadisplay = 'title';
    		this.options.datakey = '_id';
    	}
    	self.selector = null;
    	
    	if(typeof($.fn.popover) != 'undefined')
			self.options.theme = 'bootstrap';
		
    	return self;
    };

    SimpleSelector.prototype.formatAjaxResult = function(data, page, defaultvalue){
    	var self = this;
    	var total = 0;
    	var dataresults = [];
    	
    	if(data instanceof Array||(typeof data == "object" && typeof data.length == "number")){
    		dataresults = data;
    		
    		if(self.ajaxinfo && self.ajaxinfo.count)
    			total = self.ajaxinfo.count;	
    		else
    			total = data.length;
    	}else{
    		var dataroot =self.options.dataroot||'results';
    		if(!data[dataroot])
    			dataroot ='result';
    		
    		total = (data[dataroot]||[]).length;
    		if(data.info && data.info.count){
    			total = Number(data.info.count);
    			self.ajaxinfo = data.info;
    		}
    		
    		dataresults = (data[dataroot]||[]);			        	
    	}
    	var results = [];
    	for(var i = 0; i < dataresults.length; i++){
        	var model = dataresults[i];
        	
        	var select2model = {text:'', id:'', originalModel:model};
        	var text;
        	if(typeof model === "object"){
        		select2model.text = getDisplayText(self.options, model)
            	select2model.id=getDisplayId(self.options, model)||select2model.text;
        	} else if(typeof model == "string"){
        		select2model.id=select2model.text = model;
        		select2model.originalModel={id:model, options:null}
        	}
        	
        	if(select2model.id)
        		results.push(select2model);
        }	
        
    	var more = ((page * 10) < total); // whether or not there are more results available
    	
    	if(self.options.custom){
    		if(!(self.selector.find("[value=-1]").length > 0 && self.selector.data("custom-loaded") == "true")){
    			self.selector.attr("data-custom-loaded", "true");
    			
    			results.unshift({text:'Custom (new item)', id:'-1'});	
    		}
    	}
    	
        return {text:'title', results: results, more: more};
    }

    SimpleSelector.prototype.formatResult = function(data){
    	var self = this;
    	if(self.options.itemicon)
    		return '<i class="'+self.options.itemicon+'"/>' + data.text;
    	else
    		return data.text;
    };

    SimpleSelector.prototype.toggle = function(hide){
    	var self = this;

    	if(self.selector && hide){
    		if(self.options.plugin == 'select2') {
    			if(self.selector.select2) self.selector.select2('container').hide();
    		}else
    			self.selector.hide();
    	} else if(self.selector){
    		if(self.options.plugin == 'select2'){
    			if(self.selector.select2)
    				self.selector.select2('container').show();
    		}else
    			self.selector.show();
    	}
    };

    SimpleSelector.prototype.next = function(id){
    	var self = this;
    	
    	if(self.selector)
    		$('option:eq(1)', self.selector).attr('selected', 'selected');
    	
    	self.selector.trigger('change');
    };

    SimpleSelector.prototype.updateAjaxUrl=function(url, id){
    	var self = this;
    	self.options.url=url;
    	
    	if(self.selector.select2){
    		var placeholder = "Select a " + self.options.title;
			if(self.options.title && self.options.multiple)
				placeholder="Select " + self.options.title;

			var formatAjaxResult;
			formatAjaxResult = (function(smself, defaultvalue){
				return function(data, page){
					if(smself.options.formatAjaxResult)
    					return smself.formatAjaxResult(smself.options.formatAjaxResult(data, page), page, defaultvalue);
    				else	
    					return smself.formatAjaxResult(data, page, defaultvalue)
				}
			})(self, id);
			
			var formatResult = self.options.formatResult||function(data){return self.formatResult(data)};
			
			self.selector.select2({
				val:id,
			    placeholder: placeholder, multiple:self.options.multiple,
			    minimumInputLength: self.options.minimumInputLength,
			    maximumInputLength: self.options.maximumInputLength,
			    maximumSelectionSize: self.options.maximumSelectionSize,
			    ajax: {
			        url:self.getAjaxUrl(),
			        dataType: self.options.dataType||'jsonp',
			        quietMillis: 100,
			        data: function (term, page) { // page is the one-based page number tracked by Select2
			            return {
			                q: term, //search term
			                page_limit: self.options.page_limit, // page size
			                page: page, // page number
			                minimal:true
			            };
			        },
			        results: formatAjaxResult
			    },
			    formatResult:formatResult,
			    //dropdownCssClass: "bigdrop", // apply css that makes the dropdown taller
			    escapeMarkup: function (m) { return m; },
			    width:'100%', 
			    initSelection:function(element, callback){
			    	callback({id:id, text:id});
			    }
			}).on('change', self.options.change);
			
			if(id)
				self.selector.select2('data', {id:id, text:id});
		}
    }
    
    SimpleSelector.prototype.getAjaxUrl=function(){
    	var self = this;
    	
    	return self.options.url;
    }
    
    SimpleSelector.prototype.initplugin = function(id){
    	var self = this;
    	if(self.selector){
    		if(self.options.plugin == 'select2'){
    			var placeholder = "Select a " + self.options.title;
    			if(self.options.title && self.options.multiple)
    				placeholder="Select " + self.options.title;
    			
    			var formatAjaxResult = (function(smself, defaultvalue){
    				return function(data, page, query){
    					if(smself.options.formatAjaxResult)
        					return smself.formatAjaxResult(smself.options.formatAjaxResult(data, page), page, defaultvalue);
        				else	
        					return smself.formatAjaxResult(data, page, defaultvalue)
    				}
    			})(self, id);
    			
    			var formatResult = self.options.formatResult||function(data){return self.formatResult(data)};
    			
    			if(!self.selector.is('select') && self.options.data){
    				self.selector.select2({
    					placeholder: placeholder,
    					allowClear: true,
    					width : '100%', data:formatAjaxResult(self.options.data)
    				});
    			} else if(self.selector.is('select') && self.options.data){
    				self.selector.select2({
    					placeholder: placeholder,
    					allowClear: true,
    					width : '100%'
    				});
    			} else if(self.options.ajax){
    				if(self.selector.select2){
    					self.selector.select2({
    						val:id,
    					    placeholder: placeholder, multiple:self.options.multiple,
    					    minimumInputLength: self.options.minimumInputLength,
    					    maximumInputLength: self.options.maximumInputLength,
    					    maximumSelectionSize: self.options.maximumSelectionSize,
    					    ajax: {
    					        url:self.getAjaxUrl(),
    					        dataType: self.options.dataType||'jsonp',
    					        quietMillis: 100,
    					        data: function (term, page) { // page is the one-based page number tracked by Select2
    					        	var searchoptions = {
    					                q: term, //search term
    					                page_limit: self.options.page_limit, // page size
    					                page: page, // page number
    					                minimal:true
    					            };
    					            
    					        	if(self.options.datadisplay){
    					        		searchoptions[self.options.datadisplay+'_operator'] = 'startswith';
    					        		searchoptions[self.options.datadisplay]=term;
    					        	}
    					        	return searchoptions;
    					        },
    					        results: formatAjaxResult
    					    },
    					    formatResult:formatResult,
    					    //dropdownCssClass: "bigdrop", // apply css that makes the dropdown taller
    					    escapeMarkup: function (m) { return m; },
    					    width:'100%', 
    					    initSelection:function(element, callback){
    					    	callback({id:id, text:id});
    					    }
    					}).on('change', self.options.change);
    					
    					if(id)
    						self.selector.select2('data', {id:id, text:id});
    				}
    			} else{
    				if(self.options.change){
    					if(self.selector.select2)
    						self.selector.select2({
    							placeholder: placeholder,
    							allowClear: true,
    							width : '100%'
    						}).on('change', self.options.change);
    			  	}else{
    			  		if(self.selector.select2)
    				  		self.selector.select2({
    							placeholder: placeholder,
    							allowClear: true,
    							width : '100%'
    						});
    			  	}
    			}
    		} else if (self.options.plugin == 'multi-tree'){
    			var onchange = (function(simpleselector){
    				return function(selected){
    					simpleselector.selector.trigger('change');
    				};
    			})(self);
    			
    			/**
    			 * Default options for multi tree
    			 */
    			var options = $.extend({
    				startCollapsed:true, 
    				allowBatchSelection:false, 
    				onchange:onchange
				}, self.options);
    			
    			if($.sortable)
    				options.sortable=true;
    			
    			if($.fn.treeMultiselect)
    				self.selector.treeMultiselect(options);
    		}
    	}else{
    		if(app && app.log)
    			app.log(self.selector);
    	}
    }

    SimpleSelector.prototype.createnativeselect = function(id){
    	var self = this;
    	var options = self.options;
    	var inputtype = self.options.plugin||'radio';
    	var container = self.options.container;
    	
    	function getTitle(){
    		return utils.capitaliseFirstLetter(self.options.title||getId());
    	}
    	
    	function getId(){
    		return (self.options.name||self.options.id);
    	}
    	
    	function appendOptionsdata(options){
    		// check bootstrap available
    		if(self.options.theme == 'bootstrap')
    			options.forEach(function(option){
    				var displayid = getDisplayId(self.options, option);
    				container.append("<label class='"+inputtype+"-inline'><input "+(displayid == id ? "checked":"")+" type='"+inputtype+"' name='"+getId()+"' value='"+displayid+"' />&nbsp; "+ getDisplayText(self.options, option)) + "</label>";
        		});
    		else	
	    		options.forEach(function(option){
	    			var displayid = getDisplayId(self.options, option);
	    			container.append("<input "+(displayid == id ? "checked":"")+" type='"+inputtype+"' name='"+getId()+"' value='"+displayid+"' />&nbsp; "+ getDisplayText(self.options, option));
	    		});
    	}
    	
    	if(self.options.showTitle)
			container.append("<label for='"+getId()+"' />"+ getTitle() +"&nbsp;");
		
    	if((self.options.url || self.options.data)){
			if(!self.options.ajax && self.options.data)
				appendOptionsdata(self.options.data);
			if(!self.options.ajax && self.options.url)
				$.ajax({
				  url: self.getAjaxUrl(),
				}).done(function(data){
					appendOptionsdata(data);
					
					self.initplugin(id);
				});
		}else
			self.initplugin(id);
    }
    
    SimpleSelector.prototype.createselect = function(id){
    	var self = this;
    	var $select;
    	
    	if(self.options.plugin == "radio" || self.options.plugin == "checkbox"){
    		self.createnativeselect(id);
    	} else if(self.selector){
    		app.log('Do nothing, selector already available');
    	} else {
    		if(self.options.container && $('#' + this.options.id, self.options.container).length > 0){
    			$select = $('#' + self.options.id, self.options.container);
    		} else if(!self.options.container || $(self.options.container).length <= 0 && $('#' + self.options.id) > 0) {
    			$select = $('#' + self.options.id);
    			var selectoptions = {};
    			
    			if($select.is(':input')){
    				$select_copy = $('<select name="'+(self.options.name||self.options.id)+'" id="'+self.options.id+'" style="min-width:'+self.options.minwidth+';" '+ (self.options.multiple ? "multiple" : "") +'></select>');
    				$select.parent().append($select_copy);
    				$select.hide();
    				$select=$select_copy;
    			}
    		}else{
    			$select = $('<input name="'+(self.options.name||self.options.id)+'" id="'+self.options.id+'" style="min-width:'+self.options.minwidth+';" />');
    			
    			if(self.options.plugin && self.options.ajax){
    				//@TODO ajax based select
    			}else{
    				$select = $('<select name="'+(self.options.name||self.options.id)+'" id="'+self.options.id+'" style="min-width:'+self.options.minwidth+';" '+ (self.options.multiple ? "multiple" : "") +'></select>');
    			}
    			
    			if($(self.options.container).length > 0){
        			if($(self.options.container).is('ol')){
        				var li = $('<li></li>').append($select);
        				
        				$(self.options.container).append(li);
        			}else 
        				$(self.options.container).prepend($select);
        		}
    		}
    		
    		if(self.options.container && $('#' + this.options.id, self.options.container).length <= 0){
    			self.options.container.append($select);
    		}
    		
    		self.selector = $select;
    		
    		self.appendData = getSelectorAppendDataCallback(self, id);
    		
    		if($select.is('select') && (self.options.url || self.options.data)){
    			if(self.options.title && ($select.attr('multiple') != 'multiple') && self.options.plugin !== 'multi-tree')
    				$select.append('<option selected value="">Select ' + utils.capitaliseFirstLetter(self.options.title) + '</option>');
        				
    			if(!self.options.ajax && self.options.data)
    				self.appendData(self.options.data);
    			else if(!self.options.ajax && self.options.url){
    				$.ajax({
    					url: self.getAjaxUrl()
    				}).done(self.appendData);
    			}
    			
    		  	if(self.options.change){
    		  		self.selector.change(self.options.change);
    		  	}
    		}else
    			self.initplugin(id);
    	}
    	
    	return $select;
    }

    SimpleSelector.prototype.initresult = function(data, status){
    	var self = this;
    }

    SimpleSelector.prototype.reload = function(id){
    	var self = this;
    	
    	if(self.selector){
    		//self.selector.select2('destroy'); 
    		self.selector=null;
    		
    		self.createselect(id);
    	}
    }
    
    SimpleSelector.prototype.load = function(id){
    	var self = this;
    	if(!self.selector && (self.options.url || self.options.data)){
    		self.createselect(id);
    	} else{
    		self.toggle();
    	}
    }

    function GlobalLink(options) {
    	this.init(options);
    	
    	return this;
    }

    GlobalLink.prototype.options={
    	crud:false, links:[], modelname:'', 
    	container:'#globallink-container', 
    	id:'#header-globallink',
    	crudlinks:[
    		{url:'', text:'List', icon:'fa fa-list'},
    		{url:'form', text:'New', icon:'fa fa-plus-circle'},
    		{text:'Detail', uri:'view', icon:'fa fa-edit'},
    		{text:'Edit', uri:'edit', icon:'fa fa-edit'},
    		{
    			text:'Delete', url:'delete', icon:'fa fa-archive', 
    			click:function(event){
    				event.preventDefault();
    				
    				if(app&&app.currentview&&app.currentview.remove){
    					if(app.currentview.model.models){
    						var ids = app.getTableSelectedIds(app.currentview);
    						
    						if(ids)
    							app.currentview.remove(event, ids, function(error){
    								if(!error)
    									app.removeTableRaws(app.currentview, ids);
    							});
    					}else
    						app.currentview.remove(event);
    				}
    				return false;
    			}
    		}
    	]
    };

    GlobalLink.prototype.init = function(options){
    	var self = this;
    	
    	self.options = $.extend({}, self.options, options);
    	
    	self.selector = null;
    	
    	return self;
    };

    GlobalLink.prototype.load = function(curid){
    	var self = this;
    	
    	var $link;
    	if($(self.options.container + ' ' + self.options.id).length > 0){
    		$link = $(self.options.id, self.options.container);
    		$link.empty();
    	}else
    		$link = $(self.options.container).append('<ul id="'+self.options.id+'"></ul>');
    	
    	var links = self.options.links;
    	if(self.options.crud)
    		links = $.merge($.merge( [], links ), self.options.crudlinks)
    	
    	var model = self.options.modelname;
    	
    	for(var i = 0; i< links.length; i++){
    		var link = links[i];
    		if(curid){
    			var url = '#' + model;
    			
    			if(links[i].url)
    				url = url + '/' + links[i].url;
    			else if(links[i].uri)	
    				url = url + '/' +links[i].uri + '/' + curid;
    			
    			var anchor = '<a href="' + url +'">'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			
    			if(window.location.hash == url){
    				anchor = '<a>'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			} else if(link.click){
    				anchor = '<a data-id="'+curid+'">'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			}
    				
    			if($link.is('ul'))
    				if(window.location.hash == url){
    					anchor = '<li class="active">'+ anchor +'</li>';
    				}else
    					anchor = '<li>' + anchor + '</li>';
    				
    			$anchor = $(anchor);
    			 
    			$link.append($anchor);
    			
    			if(link.click){
    				$anchor.on('click', link.click);
    			}
    		}else if(links[i].url||links[i].url==''){
    			var url = '#' + model;
    			if(links[i].url != '')
    				url = url +'/' + links[i].url;
    				
    			var anchor = '<a href="' + url +'">'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			
    			if(window.location.hash == url){
    				anchor = '<a>'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			} else if(link.click){
    				anchor = '<a data-id="'+curid+'">'+ (link.icon ? '<i class="'+link.icon+'" />&nbsp;':'') + links[i].text+'</a>';
    			}
    				
    			if($link.is('ul'))
    				if(window.location.hash == url){
    					anchor = '<li class="active">'+ anchor +'</li>';
    				}else
    					anchor = '<li>' + anchor + '</li>';
    			
    			$anchor = $(anchor);
    			 
    			$link.append($anchor);
    			
    			if(link.click){
    				$anchor.on('click', link.click);
    			}
    		}
    	}
    	
    	if(links.length > 0)
    		$(self.options.container).show();
    	//
    };

    /**
     * Field config plugin for storing the fields to show in a list page!!
     *
     */
    function DataModelDisplayConfig(options) {
    	this.init(options);
    }

    DataModelDisplayConfig.prototype.FIELDS = [];
    DataModelDisplayConfig.prototype.MODELNAME='';

    DataModelDisplayConfig.prototype.init = function(options){
    	this.FIELDS=[];
    	this.MODELNAME='';
    	
    	this.MODELNAME = options.modelname;
    	
    	this.load();
    };
    DataModelDisplayConfig.prototype.fields = function(){
    	if(!this.FIELDS)
    		this.FIELDS = []; 
    	return this.FIELDS;
    }
    DataModelDisplayConfig.prototype.setFields = function(fields){
    	this.FIELDS = fields;
    	
    	this.save();
    }

    DataModelDisplayConfig.prototype.load = function(){
    	var globalfields = localStorage.getItem('fields');
    	if(globalfields){
    		 try{
    		 	globalfields = JSON.parse(globalfields);
    		 } catch(error){
    		 	globalfields = {};
    		 }
    		 this.FIELDS = globalfields[this.MODELNAME];
    	}else{
    		globalfields = {};
    	}
    }
     
    DataModelDisplayConfig.prototype.save = function(callback){
    	var globalfields = localStorage.getItem('fields');
    	if(globalfields){
    		 try{
    		 	globalfields = JSON.parse(globalfields);
    	 	 } catch(error){
    	 	 	globalfields = {};
    	 	 }
    	}else{
    		globalfields = {};
    	}
    	globalfields[this.MODELNAME] = this.FIELDS;
    	
    	localStorage.setItem('fields', JSON.stringify(globalfields));
    	if(callback)
    		callback();
    }

    function setDataModelDisplayConfig(fields){
    	var globalfields = localStorage.getItem('fields');
    	if(!globalfields){
    		localStorage.setItem('fields', JSON.stringify(fields));
    	}else{
    		if(globalfields){
    			 try{
    			 	globalfields = JSON.parse(globalfields);
    		 	 } catch(error){
    		 	 	globalfields = {};
    		 	 }
    		}else{
    			globalfields = {};
    		}
    		
    		var change = false;
    		for(var i in fields){
    			if(true||!globalfields[i]){
    				globalfields[i] = fields[i];
    				change = true;
    			}else{
    				app.log('Ignoring this because already setting in localstorage -' + i);
    			}
    		}
    		
    		if(change){
    			localStorage.setItem('fields', JSON.stringify(globalfields));
    		}
    	}
    };
    
    function getDisplayId(simpleseloptions, option){
    	if(typeof option == 'object')
    		return option[simpleseloptions.datakey||'id'];
    	else
    		return option;
    }
    
    function getDisplayText(simpleseloptions, option){
		var text;
		if(typeof option == "string")
			return option;
		else if(simpleseloptions.datadisplay instanceof Array){
	    	for(var index in  simpleseloptions.datadisplay){
    			var displaykey = simpleseloptions.datadisplay[index];
    			
    			if(option[displaykey] && !text)
    				text = option[displaykey];
    			else if(option[displaykey]){
    				if( simpleseloptions.datadisplayseperator && simpleseloptions.datadisplayseperator == "(")
	    				text += " " + (simpleseloptions.datadisplayseperator) + option[displaykey] + ")";
	    			else	
	    				text += " " + (simpleseloptions.datadisplayseperator||" ") + option[displaykey];
    			}
    		}
    	} else
    		text = option[simpleseloptions.datadisplay]||option[simpleseloptions.datakey]||option["_id"];
    	
    	return text;
	}
    
    function getSelectorAppendDataCallback(simpleselector, id){
		return function(data){
			if(data){
				var selids = [];
				var sectionindex = 0;
				
				if(id instanceof Array)
					selids = selids.concat(id);
				else if(id)
					selids=[id];
				
				var formattedresults = data; 
    			if(typeof data == "object" && typeof data.length !== "number" ) {
    				var formatteddata = simpleselector.formatAjaxResult(data);
    				formattedresults = formatteddata.results;
    				
	    			for(var i in formattedresults){
		    			var option = formattedresults[i];
		    			var selected = "";
		    			var dataindex = (sectionindex++);
		    			
		    			if(id && id instanceof Array && _.indexOf(id, option.id) != -1){
		    				selected = 'selected ';
		    				
		    				var idindex = _.indexOf(id, option[simpleselector.options.datakey]);
		    				dataindex=formattedresults.length + idindex;
		    				
		    				delete selids[idindex];
		    			}else if(id == option.id + '' ? 'selected ' : ''){
		    				selected = 'selected ';
		    				
		    				delete selids[0];
		    			}
		    			
		    			var text = option.text;
		    			var displayid = (option.id||'') +'';
		    			
		    			if(displayid && displayid.indexOf("/" + text) != -1)
		    				simpleselector.selector.append('<option data-index="'+(dataindex)+'" data-section="'+(displayid?displayid.replace("/" + text, ""):'') +'" '+ selected +' value="'+displayid+'">'+ text +'</option>');
		    			else
		    				simpleselector.selector.append('<option data-index="'+(dataindex)+'" data-section="'+(displayid) +'" '+ selected +' value="'+displayid+'">'+ text +'</option>');
		    		}
    			}else {
    				for(var i in formattedresults){
		    			var option = formattedresults[i];
		    			var selected = "";

		    			var dataindex = (sectionindex++);
		    			
		    			if(id && id instanceof Array && _.indexOf(id, option[simpleselector.options.datakey]) != -1){
		    				selected = 'selected ';
		    				
		    				var idindex = _.indexOf(id, option[simpleselector.options.datakey]);
		    				dataindex=formattedresults.length + idindex;
		    				
		    				delete selids[idindex];
		    			}else if(id == option[simpleselector.options.datakey]+'' ? 'selected ' : ''){
		    				selected = 'selected ';
		    				
		    				delete selids[0];
		    			}
		    			
		    			var text = getDisplayText(simpleselector.options, option);
		    			var displayid = option[simpleselector.options.datakey]||'';
		    			
		    			simpleselector.selector.show();
		    			simpleselector.selector.append('<option data-index="'+(dataindex)+'" data-section="'+displayid.replace("/" + text, "") +'" '+ selected +' value="'+displayid+'">'+ text +'</option>');
		    		}
//    				console.log(simpleselector.selector.show());
    			}
    			
    			if(selids.length > 0){
    				for(var selindex in selids){
    					var displayid = selids[selindex];
    					if(displayid){
    						var dataindex = (formattedresults.length) + Number(selindex);
    						
    						var text = displayid;
    						if(displayid.indexOf("/") != -1)
    							text = displayid.substring(displayid.lastIndexOf("/")+1, displayid.length);
    						
    						simpleselector.selector.append('<option data-index="'+(dataindex)+'" data-section="'+ displayid.replace("/" + text, "") +'" selected value="'+displayid+'">'+ text +'</option>');
    					}	
    				}
    			}
	    		
	    		if(simpleselector.options.onload){
	    			simpleselector.options.onload(simpleselector.selector);
	    		}
	    	}
	    	
    		simpleselector.initplugin(id);
		};
    }
    
    utils.SimpleDatePicker=SimpleDatePicker;
    utils.SimpleSelector=SimpleSelector;
    utils.DataModelDisplayConfig=DataModelDisplayConfig;
    
    return utils;
    
});
/**
 * Global variable for todays date 
 */