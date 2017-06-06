/*
 * Appending field plugins to the Backbone props
 * 
 */ 
define( [
	/*"/uiplugin/dropzone/dropzone-amd-module.js",*/
	"/uiplugin/dropzone/js/fieldplugin.js"
], function(dropzone){
	"use strict";
	
	/**
	 * Disabling certain functions for Dropzone
	 */
	var Fieldplugins = {}; //Backbone.Fieldplugins||{};
	
	var nativeselect = function (fieldsetting, element, view, defaultvalue, inputtype){
		// check for matching plugins
		var inputtype = inputtype || "radio";
		if(!element)
			element = view.$('[name='+fieldsetting.field+']');
		var container;
		
		if(element && element.length == 1 && !element.is(":"+inputtype)){
			//container=element.parent();
			element.replaceWith("<div id='"+fieldsetting.field +"container'></div>");
			//container = element;
			container = view.$('#' + fieldsetting.field +'container');
			element=null;
		}
		
		if(!element || element.length <= 0){
			if(!container){
				if(view)
					container = view.$('#' + fieldsetting.field +'container');
				
				if(element && container.length <= 0)
					container = view.$('#' + fieldsetting.field).parent();
			}
			
			var defaultvalue = defaultvalue || container.attr("data-value") || (element?element.attr('data-value'):null);
			if(view && view.model)
				defaultvalue = view.model.get(fieldsetting.field)||defaultvalue;
			
			if(fieldsetting.options){
				if(fieldsetting.displayoptions && fieldsetting.displayoptions.showTitle)
					container.append("<label for='"+fieldsetting.field+"' />"+ (fieldsetting.title||fieldsetting.field) +"&nbsp;");
				
				fieldsetting.options.forEach(function(option){
					if(typeof option === "object")
						container.append("<input " +(defaultvalue==option ? "checked":"") + " type='"+inputtype+"' name='"+fieldsetting.field+"' />&nbsp;");
					else
						container.append(app.getMessage(option) + " <input "+(defaultvalue==option?"checked":"") +" type='"+inputtype+"' name='"+fieldsetting.field+"' value='"+option+"'/>&nbsp;");
				});
			}
		}else{
			//@TODO nothing to do now
		}
	}
	
	/**
	 * checkbox list for options
	 */
	var checkbox = Fieldplugins.checkbox = function (fieldsetting, element, view, defaultvalue){
		nativeselect(fieldsetting, element, view, defaultvalue, 'checkbox');
	};
	
	/**
	 * radio list for options
	 */
	var radio = Fieldplugins.radio = function (fieldsetting, element, view, defaultvalue){
		nativeselect(fieldsetting, element, view, defaultvalue, 'radio');
	};
	
	/**
	 * Simple select box using options array
	 */
	var select = Fieldplugins.select = function (fieldsetting, element, view, defaultvalue){
		// check for matching plugins
		if(!element)
			element = view.$('[name='+fieldsetting.field+']');
		
		if(!element || element.length <= 0){
			var container;
			if(view)
				container = view.$('#' + fieldsetting.field +'container');
			
			if(element && container.length <= 0)
				container = view.$('#' + fieldsetting.field).parent();
			
			if(container.length > 0)
				container.append("<select class='form-control' name='"+fieldsetting.field+"' id='"+fieldsetting.field+"'/>");
		}
		
		var defaultvalue = defaultvalue || element.attr('data-value');
		if(view && view.model)
			defaultvalue = view.model.get(fieldsetting.field)||defaultvalue;
		
		if(fieldsetting.options){
			if(!element.is('select')){
				element.replaceWith("<select class='form-control' name='"+fieldsetting.field+"' id='"+fieldsetting.field+"'/>");
				element = view.$('[name='+fieldsetting.field+']');
			}
			
			if(element.is('select')){
				element.find('option').remove();
				
				element.append("<option value=''>"+window.getMessage('select')+" "+(fieldsetting.display||fieldsetting.field)+"</option>");
				
				fieldsetting.options.forEach(function(option){
					if(typeof option === "object")
						element.append("<option>"+option+"</option>");
					else
						element.append("<option " +(option === defaultvalue ? "selected":"") + " value='"+option+"'>"+option+"</option>");
				});
			}
		}
	};
	
	/**
	 * Bootstrap Icon picker
	 * requires bootstrap icon picker to be loaded
	 */
	var cronselector = Fieldplugins.cronselector = function (fieldsetting, element, view){
		if(!element)
			element = view.$('[name='+fieldsetting.field+']');
		
		if(element.data("cronselector") == "true"){
			// do nothing
		}else{
			element.attr("data-cronselector", "true");
			element.parent().append($('<div name="'+fieldsetting.field+'_cronselector"></div>'))
			
			var displayoptions = $.extend({
				useGentleSelect:false,
				onChange:function(){
					view.setValue(fieldsetting.field, $(this).cron("value"));
				}
			}, fieldsetting.displayoptions||{});
			
			if(view.$('[name="'+fieldsetting.field+'_cronselector"]').length > 0)
				view.$('[name="'+fieldsetting.field+'_cronselector"]').cron(displayoptions);
		}
	}
	
	/**
	 * Bootstrap Icon picker
	 * requires bootstrap icon picker to be loaded
	 */
	var iconPicker = Fieldplugins.iconPicker = function (fieldsetting, element, view){
		if(!element)
			element = view.$('[name='+fieldsetting.field+']');
		
		$(element).iconPicker(fieldsetting.displayoptions);
	}
	
	var iconpicker = Fieldplugins.iconpicker = function (fieldsetting, element, view){
		// check for matching plugins
		if(!element)
			element = view.$('input[name='+fieldsetting.field+']');
		
//		if($.fn.iconPicker)
//			$(element).iconPicker(fieldsetting.displayoptions);
//		else if($.fn.iconpicker)
//		var newele =element.clone();
//			newele.css('iconpicker-btn');
//			
//		var buttongroup = '<div class="input-group">'
//			+ newele.html()
//			+'<span class="input-group-btn">\
//	        	<button class="btn btn-default" data-icon="" role="iconpicker" name="'+fieldsetting.field+'"></button>\
//	        </span>\
//	    </div>';
//		
//		element.parent().append(buttongroup);
		
		//view.$('.iconpicker-btn').iconpicker();
		
		if(fieldsetting.displayoptions && fieldsetting.displayoptions.iconset == 'flag-icon')
			$(element).iconpicker(fieldsetting.displayoptions);
		else if(fieldsetting.displayoptions && fieldsetting.displayoptions.iconset)
			$(element).iconpicker(fieldsetting.displayoptions);
		else
			self.$('button[role="iconpicker"][name='+fieldsetting.field+']').iconpicker();
		
		$(element).on('change', function(e) { 
			$(element).val(e.icon);
		});
	}
	
	/**
	 * Bootstrap datepicker
	 * requires bootstrap date picker to be loaded
	 */
	var datepicker = Fieldplugins.datepicker = function (fieldsetting, element, view){
		if(!element)
			element = $('[name='+fieldsetting.field+']');
		
		var displayoptions = _.extend(
			{
				title:window.getMessage('select') +' '+ fieldsetting.field
			}, fieldsetting.displayoptions
		);
		
		new Backbone.Utils.SimpleDatePicker(element, displayoptions);
	}
	
	/**
	 * editAreaLoader
	 * software code syntax heighliter
	 */
	var editarea = Fieldplugins.editarea = function (fieldsetting, element, view){
		if(!element)
			element = view.$('[name='+fieldsetting.field+']');

		var idprefix = '';
		if(view && view.cid)
			idprefix = view.cid + '_'; 
			
		var displayoptions = _.extend(
			{
				toolbar: "new_document, save, load, |, search, go_to_line, |, undo, redo, |, select_font, |, syntax_selection, |, change_smooth_selection, highlight, reset_highlight, |, fullscreen, help",
				id : idprefix + fieldsetting.field, 
				syntax: "css", 
				start_highlight: true, 
				allow_toggle:false,
				allow_resize:"both",
				start_highlight:true
			}, fieldsetting.displayoptions
		);
		
		if(!element.is('textarea')){
			element.replaceWith("<textarea height='"+(element.attr('height'))+"' rows='"+(fieldsetting.rows||10)+"' class='"+element.attr('class')+"' name='"+fieldsetting.field+"' id='"+fieldsetting.field+"'>"+element.val()+"</textarea>");
			element = view.$('[name='+fieldsetting.field+']');
		}
		
		if(element.attr('id') == fieldsetting.field)
			element.attr('id', idprefix + fieldsetting.field);
		
		window['backbone_fieldplugins_' + idprefix + fieldsetting.field + '_change_callback'] = (function(view, idprefix){
			return function(fieldid){
				var fieldid_ = fieldid.replace(idprefix, '');
				view.model.set(fieldid_, editAreaLoader.getValue(fieldid));
			}
		})(view, idprefix);
		
		displayoptions.change_callback='backbone_fieldplugins_'+ idprefix + fieldsetting.field +'_change_callback';
		editAreaLoader.init(displayoptions);
	}
	
	function onDependantSelectorChange(_selector, _selectoroptions, _fieldsetting, _view, _defaultvalue){
		return function(){
			var selector = _fieldsetting.field + 'selector';
			_selectoroptions.url = _.template(_fieldsetting.url)(_view.model.toJSON());
			
			// update and create the selector
			if(_view[ selector ]){
				_view[ selector ].options.url = _selectoroptions.url;
				
				_view[ selector ].selector.find("option").remove();
				
				_view[ selector ].reload(_defaultvalue);
			}else{
				var _selector = _view[ selector ] = new Backbone.Utils.SimpleSelector(_selectoroptions);
				_selector.load(_defaultvalue);
			}
		}
	}
	
	/**
	 * Simple seclector
	 * software code syntax heighliter
	 */
	var simpleselector = Fieldplugins.simpleselector = function (fieldsetting, element, view, defaultvalue){
		// uses field + selector for caching  and referring inside the view context
		var selector = fieldsetting.field + 'selector';
		var container;
		if(view)
			container = view.$('#' + fieldsetting.field +'container');
		
		if(element && container.length <= 0)
			container = view.$('#' + fieldsetting.field).parent();
				
		if(!view[selector] && container && !fieldsetting.disabled){
			var defaultvalue = defaultvalue || container.attr('data-value');
			if(view.model)
				defaultvalue = view.model.get(fieldsetting.field)||defaultvalue;
				
			var selectoroptions = _.extend(
				{
					plugin:fieldsetting.plugin,
					title:fieldsetting.field,
					url:fieldsetting.url,
		            container:container,
		            name:fieldsetting.field, 
		            id:fieldsetting.field,
		            minimumInputLength:0, 
		            ajax:fieldsetting.ajax||false, 
		            multiple:fieldsetting.multiple,
		            datadisplay:fieldsetting.display||'display',
		            datadisplayseperator:fieldsetting.displayseperator,
		            datakey:fieldsetting.id||'id',
		            dataroot:fieldsetting.dataroot,
		            onload:function(selector){
		            	if(defaultvalue && fieldsetting.plugin == 'select2'){
		            		selector.select2('val', defaultvalue);
		            		selector.trigger('change');
		            	}
		            }
				}, fieldsetting.displayoptions
			);
			
			if(!selectoroptions.autocomplete && !fieldsetting.multiple && element && !element.is('select')){
				element.replaceWith("<select class='form-control' name='"+fieldsetting.field+"' id='"+fieldsetting.field+"'/>");
				element = view.$('[name='+fieldsetting.field+']');
			}else if(selectoroptions.autocomplete){
				selectoroptions.multiple=true;
				selectoroptions.maximumSelectionSize=1;
//				selectoroptions.maximumInputLength=1;
			}
			
			if(fieldsetting.depends){
				view.model.on("change:" + fieldsetting.depends, onDependantSelectorChange(selector, selectoroptions, fieldsetting, view, defaultvalue));
			}else{
				var selectorPlugin = view[ selector ] = new Backbone.Utils.SimpleSelector(selectoroptions);
				
				selectorPlugin.load(defaultvalue);	
			}
		}
	}
	
	Fieldplugins.dropzone = dropzone;
	
	/**
	 * Simple chart based on various chart libraries
	 * Default implementation with chartjs and canvasjs is included!!
	 * 
	 */
	var simplechart = Fieldplugins.simplechart = function (fieldsetting, element, view){
		// chartserttings must be specified inside the display options
	}
	
	/**
	 * Virtual keyboard for internationalization
	 */
	var virtualkeyboard = Fieldplugins.virtualkeyboard = function (fieldsetting, element, view){
		if(!element)
			element = $('[name='+fieldsetting.field+']');
		
		if(element && element.length > 0)
			VKI_attach(element[0], '/uiplugin/virtual-keyboard/javascript/keyboard.png');
	}
	
	/**
	 * Iframe source for loading the video files
	 */
	var iframe = Fieldplugins.iframe = function (fieldsetting, element, view){
		if(!element)
			element = $('[name='+fieldsetting.field+']');
		
		var container;
		if(view)
			container = view.$('#' + fieldsetting.field +'container');
		
		if(element && container.length <= 0)
			container = view.$('#' + fieldsetting.field).parent();
			
		var defaultvalue = defaultvalue || container.attr('data-value');
		if(view.model)
			defaultvalue = view.model.get(fieldsetting.field)||defaultvalue;
		
		if(container && container.length > 0 && defaultvalue)
			container.append('<iframe src="'+defaultvalue+'" />')
	}	
	
	/**
	 * Default and common configuration for fields in backbone ext app
	 */
	var commonfield = Fieldplugins.register = function (fieldsetting, element, view, defaultvalue){
		// only use for field setting based field in backbone view and form
		if(!fieldsetting)
			return;
		
		if(fieldsetting.hasOwnProperty('editable') && !fieldsetting.editable){
			view.disable(fieldsetting.field);
		}
		
		if(fieldsetting.url && !fieldsetting.options) //@TODO Move to more appropriate configurable location
			fieldsetting.fieldplugin = "simpleselector";
		else if(fieldsetting.options && !fieldsetting.fieldplugin)
			fieldsetting.fieldplugin = "select";
		if(fieldsetting.type == "date") //@TODO Move to more appropriate configurable location
			fieldsetting.fieldplugin = "datepicker";
		
		// check a matching plugin avaliab le and then initialize it
		if( fieldsetting.fieldplugin && Fieldplugins[fieldsetting.fieldplugin]){
			return Fieldplugins[fieldsetting.fieldplugin](fieldsetting, view.$('[name='+fieldsetting.field+']'), view, defaultvalue);
		} else if( window && fieldsetting.fieldplugin && window.Backbone.Fieldplugins[fieldsetting.fieldplugin]){
			return window.Backbone.Fieldplugins[fieldsetting.fieldplugin](fieldsetting, view.$('[name='+fieldsetting.field+']'), view, defaultvalue);
		}
		
		return null;
	}
	
	return Fieldplugins;
});