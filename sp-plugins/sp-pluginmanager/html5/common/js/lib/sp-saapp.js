window.pageItemCount = 10;
//window.realtimenotification = true;

$.sound_path = "/theme/sp-default/sound/";

window.SPAppRouter = window.SPAppRouter.extend({
	showTime:function(){
		var self =this;
		$('#curtime .time').html((new Date()).toUTCString());
		
		setTimeout(function(){
			self.showTime();
		},500);
	},setPreference:function(key, value){
		if(key && value){
			var pref ={};
			pref[key]=value;
			window.userprofile.updatePreference(pref, {
				success:function(){
					//location.reload();
				},
				error:function(){}
			});
		}
	},
	setColorSkin:function(skinclass, trigger){
   		var curscheme = $('body').attr('data-color-scheme');
		
		if(curscheme&&curscheme!='')
			$('body').removeClass(curscheme);
		
		if(skinclass&&skinclass!=''){
			$('body').attr('data-color-scheme', skinclass);
			$('body').addClass(skinclass);
			
			if(trigger)
				window.userprofile.updatePreference({colorskin:skinclass}, {
					success:function(){
						//location.reload();
					},
					error:function(){}
				});
		}else if(trigger){
			window.userprofile.updatePreference({colorskin:'default'}, {
				success:function(){
					location.reload();
				},
				error:function(){}
			});
		}
   	},uriviewmapping:{
    	/** Override this specific to your app.**/
   	},getUriViewMapping:function(model, sub, id){
   		var self = this;
   		var modelclass;
   		if(self.uriviewmapping[model])
        	modelclass = self.uriviewmapping[model];
        else
        	modelclass = utils.capitaliseFirstLetter(model);
        
        var viewclass = null;
        var listPage = false;
        var detailsPage = false;
        var addPage = false;
        
        var actionsubs = ['edit', 'details', 'form', 'view', 'overview', 'wizard'];
        
        if(sub && sub != '' && $.inArray(sub, actionsubs) != -1) {
			var subview = utils.capitaliseFirstLetter(sub);
			
			if(window[modelclass + subview]){ // does this model has collection
	        	viewclass = modelclass + subview;
	        } else if(window[modelclass + subview + 'View']){ // does this model has collection
	        	viewclass = modelclass + subview + 'View';
	        } else if(sub == 'edit' && window[modelclass + 'FormView']){
	        	viewclass = modelclass + 'FormView';
		    } else if(sub == 'form' && window[modelclass + 'EditView']){
	        	viewclass = modelclass + 'EditView';
		    }
        }else if(sub && sub != '' && $.inArray(actionsubs, sub) == -1){
        	var subview = utils.capitaliseFirstLetter('view');
			
        	if(window[modelclass]){ // does this model has collection
	        	viewclass = modelclass + subview;
	        	id = sub;
	        } else if(window[modelclass + 'View']){ // does this model has collection
	        	viewclass = modelclass + subview + 'View';
	        	id = sub;
	        }
        }else{
        	if(window[modelclass + 'ListView'] && window[modelclass + 'Collection']){ // does this model has collection
	        	viewclass = modelclass + 'ListView';
	        	modelclass = modelclass + 'Collection';
	        } else if(window[modelclass + 'List'] && window[modelclass + 'Collection']){ // does this model has collection
	        	viewclass = modelclass + 'List';
	        	modelclass = modelclass + 'Collection';
	        } else if(window[modelclass] && window[modelclass + 'Collection']){ // does this model has collection
	        	viewclass = modelclass;
	        	modelclass = modelclass + 'Collection';
	        } else if(window[modelclass + 'View']){
        		viewclass = modelclass +'View';
      		} else if(window[modelclass] && window[modelclass]){ // does this model has collection
	        	viewclass = modelclass;
	        }     
        }
        
        var result = {view:viewclass, model:modelclass, id:id};
     	if(!window[modelclass]){
    		result.model = null;
  		} else{
  			result.idAttribute = new window[modelclass]().idAttribute;
  		}     
  		
        return result;
   	},
    initialize: function (options) {
        var self = this;
		
        self.options = _.extend({
        	sidepanel:'#sidepanel',
        	header:'#header',
        	main:'#main'
        }, options);

		window.getMessage=function(text){
			return self.getMessage(text);
		}
		
		self.headerView = new window.HeaderView({ el : self.options.header});
		self.headerView.loadTemplate("header", "templates/header.html", function(data){
			self.headerView.template = _.template(data);
			self.headerView.render();
		});
		
		self.updateSidePanel();
		
//		if(window.realtimenotification)
//			$('#start_interval').attr('checked', true);
			
//		$('#start_interval').change(function(){
//			window.realtimenotification =this.checked;
//		});
		
		self.showTime();
    },
    updateSidePanel:function(){
    	var self = this;
    	
		self.sidePanelView = new window.SidePanelView({el:self.options.sidepanel||'#left-panel'});
		
		self.sidePanelView.loadTemplate("sidepanel", "templates/sidepanel.html", function(data){
			self.sidePanelView.template = _.template(data);
			self.sidePanelView.render();
			
			self.updateNavigation();
		});
    },
   	inittools:function(){
   		/** Override this specific to your app.**/
   	},updateNavigation:function(){
    	var self = this;
    	
    	//Update the side menu selection
        $('nav ul a').parent('li').removeClass('active');
        
        if (Backbone.history&&Backbone.history.fragment&&Backbone.history.fragment.length > 0)
        	$('nav ul a[href="#'+Backbone.history.fragment+'"]').parent('li').addClass('active');
       	
       	if (Backbone.history&&Backbone.history.fragment){
       		if($('nav ul a[href="#'+Backbone.history.fragment+'"]').length <= 0 && Backbone.history.fragment.indexOf('/') != -1){
	        	var link = Backbone.history.fragment;
	        	link = link.substring(0, link.indexOf('/'));
	        	
	        	$('nav ul a[href="#'+link+'"]').parent('li').addClass('active');
	        }
       	}
        
        $('nav ul').find("li.active").each(function() {
			$(this).parents("ul").slideDown($.menu_speed);
			$(this).parents("ul").parent("li").find("b:first").html('<em class="fa fa-collapse-o"></em>');
			$(this).parents("ul").parent("li").addClass("open")
		});
    },loadModalView:function(view, options){
    	
		var options_ = $.extend(options||{}, {
			autoOpen : false,
			width : 600,
			resizable : false,
			modal : true,
			title : self.title,
			open: function() {
		    	$(this).html($("#modal").html(''));
		    }
		});
		
		if(options_.maxwidth){
			var width = $(window).width()-150;
			if(width > 600)
				options_.width =width; 
		}
		$('#modal').dialog(options_).dialog("open");
		
    	if(view.load){
			view.load('#modal');
		}else{
			view.loadTemplate(function(data){
				view.template = _.template(data);
				view.render();
				 
				$("#modal").html('').html(view.el);
			});
		}
    },loadMainView:function(view){
    	var self = this;
   		try{
   			var title = view.getTitle();
   			if(!title)
   				title = '<!-- -->'
   		}catch(error){
   			title = '<!-- -->'
   		}
   		
   		if($('#ribbon .breadcrumb .title').length > 0)
			$('#ribbon .breadcrumb .title').html(title);
		else
			$('#ribbon .breadcrumb').prepend('<li class="title">'+title+'</li>');
		
		self.updateNavigation();
		
		if(self.importid){
        	view.model.importid = self.importid;
        }
        
		$(self.options.main).block();
		
		// load the view to the main content
		if(view.load){
			view.load(self.options.main, function(error){
				if(error){
					if(error.status == 401){
						try{
							var statustext=error.responseText;
							window.location=$('a', $(statustext)).attr('href');
						}catch(error){
							app.log(error);	
						}
					}
					
					if(error.responseJSON)
						app.showMessage('error', {title:error.status, content:error.responseJSON.exception});
					else if(error.responseText)
						app.showMessage('error', {title:error.status, content:error.responseText});
					else
						app.showMessage('error', {title:error.status, content:error});
				}else{
					if(view.loadGlobalLink){
						view.loadGlobalLink();	
					}
					app.createTickboxTable(view);
				}
			});	
		}else{
			view.loadTemplate(function(data){
				view.template = _.template(data);
				view.render();
				 
				$(self.options.main).html('').html(view.el);
			});
		}
			
		self.currentview = view;
   	},createTickboxTable:function(view){
    	$('.has-tickbox thead tr :checkbox', $(view.el)).click(function(event){
    		var $table = $(event.target).closest('table');
    		var checkbox = event.target;
    		
    		if(checkbox.checked){
    			$('tbody tr :checkbox:checked', $table).removeAttr('checked');
    			
    			$('tbody tr :checkbox', $table).attr('checked', true);
    		}else{
    			$('tbody tr :checkbox:checked', $table).removeAttr('checked');
    		}
    	});
    	
    	$('.has-tickbox>tbody>tr :checkbox', $(view.el)).click(function(event){
    		var $table = $(event.target).closest('table');
    		
    		var checkedcount = $('tbody tr :checkbox:checked', $table).length;
			var totalcount = $('tbody tr :checkbox', $table).length;
			
			if(checkedcount == totalcount)
				$('thead>tr :checkbox', $table).attr('checked', true);
			else
				$('thead>tr :checkbox', $table).removeAttr('checked');
    	});
    },getTableSelectedIds:function(view){
    	var ids = [];
    	
    	$('.has-tickbox :checkbox:checked', $(view.el)).each(function(){
    		ids.push($(this).parents('tr:first').attr('data-id'));
    	});
    	if(ids&&ids.length > 0)
    		return ids.join(',');
    	else 
    		return null;
    },removeTableRaws:function(view, ids){
    	var ids_ =ids.split(',');
    	for(var i = 0; i < ids_.length; i++){
    		var id = ids_[i];
    		$(".has-tickbox tr[data-id='"+id+"']", $(view.el)).remove();
    	}
    	
    	app.showMessage('success', {
    		title:app.currentview.getTitle() + ' Deleted successfully',
    		content:app.currentview.getTitle() + ' - Deleted successfully'
    	});
    },
   	before:function(){
   		var self = this;
   		var newurl = Backbone.history.fragment;
    	if(self.formchanged&&self.currenthash){
    		$('#dialog').dialog({
				autoOpen : false,
				width : 600,
				resizable : false,
				modal : true,
				title : 'Unsaved content in your form!',
				open: function() {
			          var markup = 'Are you sure you want to discard your changes in the form';
			          $(this).html(markup);
			    },
				buttons : [{
					html : "<i class='fa fa-trash-o'></i>&nbsp; Continue",
					"class" : "btn btn-danger",
					click : function() {
						self.navigate(self.currenthash);
						self.formchanged = false;
						$(this).dialog("close");
						self.navigate('#' + newurl, true);
					}
				}, {
					html : "<i class='fa fa-times'></i>&nbsp; Cancel",
					"class" : "btn btn-default",
					click : function() {
						self.navigate(self.currenthash);
						$(this).dialog("close");
						return false;
					}
				}]
			}).dialog("open");
    		return false;
    	}else
    		self.inittools();
    },after:function(){
    	var self = this;
    	
    	self.loadglobalbreadcrumb();
    	
        self.importid = null;
        
        $.unblockUI();
    },
    search:function(params){
    	var self = this;
    	
    	var model = new window.ESPASearch({id:'general'});
		model.set('searchquery', location.search);
		
		var view = new window.StaticView({el:self.options.main, templateName:'Search', model:model});
		view.load();
    },
    loadglobalbreadcrumb:function(){
    	/** Override specifc to your app **/
    },
    modalDynamicPage:function(model, sub, page){
    	this.dynamicPage(model, sub, page, true);
    },
    dbDynamicPage:function(modelName, id, page){
    	var self = this;
    	
    	if(!modelName||modelName == 'info')
    		modelName = 'collection/all';
    	else if(modelName)
    		modelName = 'collection/' + modelName;
    	
    	//Update the side menu selection
        $('nav ul a').parent('li').removeClass('active');
        
        if (Backbone.history.fragment.length > 0)
        	$('nav ul a[href="#'+Backbone.history.fragment+'"]').parent('li').addClass('active');
        
        $('nav ul').find("li.active").each(function() {
			$(this).parents("ul").slideDown($.menu_speed);
			$(this).parents("ul").parent("li").find("b:first").html('<em class="fa fa-collapse-o"></em>');
			$(this).parents("ul").parent("li").addClass("open")
		});
		
    	if(id){
    		modelclass = 'DBModel';
	        var config = {datatable:true, jarviswidget:true, fieldconfig:true};
	        var page = p = 1;
	        
	        var model = new window[modelclass]({modelName:modelName, id:id});
	    	var viewobject = new window[modelclass + 'View']({config:config, model: model, page: p});
	    	//viewobject.load('#content');
	    	
	    	self.loadMainView(viewobject);
    	}else{
    		modelclass = 'DBModelSearch';
	        var config = {datatable:true, jarviswidget:true, fieldconfig:true};
	        var page = p = 1;
	        
	        var modelsearch = new window[modelclass]({modelName:modelName, id:modelName});
	    	var viewobject = new window[modelclass + 'View']({config:config, model: modelsearch, page: p});
	    	     
	     	//viewobject.load('#content');
	     	self.loadMainView(viewobject);
    	}
    },
    dynamicPage: function(model, sub, page, modalView, query) {
    	var self = this;
    	var config = {accordion:false, datatable:true, jarviswidget:true, fieldconfig:true};
    	
    	if(typeof page == 'object' && !query){
			query=page;page=null;
		}
    	
    	var uriviewmapping = self.getUriViewMapping(model, sub, page);
    	if(uriviewmapping.view && uriviewmapping.model){
    		var p = page ? parseInt(page, 10) : 1;
    		
    		//var query = {};
    		var modelquery = {};
    		if(uriviewmapping.idAttribute)
    			modelquery[uriviewmapping.idAttribute] = uriviewmapping.id;
    		else
    			modelquery['id'] = uriviewmapping.id;
    			
    		var modelobject = new window[uriviewmapping.model](modelquery);
    		var viewobject = new window[uriviewmapping.view]({config:config, model: modelobject, page: p});
    		if(query)
    			viewobject.query = query;
    		
    		if(modalView)
    			self.loadModalView(viewobject);
    		else
    			self.loadMainView(viewobject);
    	}else if(uriviewmapping.view){
    		var viewobject = new window[uriviewmapping.view]({config:config});
    		
    		self.loadMainView(viewobject);
    	}else{
    		self.navigate('dashboard', {trigger:true});
    	}
    	self.currentnavigation = {model:model, sub:sub, page:page, importid:self.importid};
    },
    showMessage:function(type, data){
    	if(app.rtn)
	    	try{
	    		app.rtn.message(type, data);
	    	} catch(error){
	    		console.log(error);
	    	}
    	else if(data&& data.message)
    		alert(data.message);
    },
    showErrorMessage:function(error, title){		
		var self = this;
		
		if (error) {
			var errorMessage;
			var errorMessages=[];
			var errorText="";
			
			if(error.responseJSON){
				errorMessage = error.responseJSON;
			}else
				try{
					if(error.responseText.indexOf('{') == 0 || error.responseText.indexOf('[') == 0)
						errorMessage = JSON.parse(error.responseText);
					else if(typeof error.responseText == 'string')
						errorText = error.responseText;
				}catch(error){}
			
			if(errorMessage&&errorMessage.exception&&errorMessage.exception.length > 0){
				if(typeof errorMessage.exception == 'string')
					errorMessages.push(errorMessage.exception);
				else {
					for(var i in errorMessage.exception){
						for(var j in errorMessage.exception[i]){
							errorMessages.push("<i class='fa fa-warning'></i><i>"+ j+' : ' +errorMessage.exception[i][j]+ '</i>');	
						}
					}			
				}	
				
				if(errorMessages&&errorMessages.length > 0){
					errorText='<li>' + errorMessages.join('</li><li>');
				}
			}else if (errorMessage&&errorMessage.exception){
				errorText = errorMessage.exception;
			}
			
			if(errorText&&errorText.length > 0){
				app.showMessage('error', {
					title: title||"Error! Server has rejected your form , please fix issues mentioned",
					message:errorText, content: errorText
				});
			}			
		}
		
		return false;
    },
    showFormMessage:function(el, modelName, error, id){		
		var self = this;
		id = id || 'form';		
		modelName = modelName || 'The form';
		
		$('.alert', el).remove();
		
		if (error) {
			var errorMessage;
			var errorMessages=[];
			var errorText="";
			
			if(typeof error.responseText == 'string')
				errorText = error.responseText;
			else 
				errorMessage = JSON.parse(error.responseText);
			
			if(errorMessage&&errorMessage.exception&&errorMessage.exception.length > 0){
				for(var i in errorMessage.exception){
					for(var j in errorMessage.exception[i]){
						errorMessages.push(j+' : ' +errorMessage.exception[i][j]);	
					}
				}
				if(errorMessages&&errorMessages.length > 0){
					errorText=errorMessages.join('</li><li>');
				}
			}
			if(errorText&&errorText.length > 0){
				$(id, el).prepend('<div class="alert alert-danger" style="margin:10px;"><i class="fa-fw fa fa-warning"></i><strong>Error !!</strong> <ul><li>'+errorText+'</li></ul></div>');
			}else
				$(id, el).prepend('<div class="alert alert-danger" style="margin:10px;"><i class="fa-fw fa fa-warning"></i><strong>Error</strong> '+JSON.stringify(errorMessage.exception)+' !!</div>');			
		} else {
			$(id, el).prepend('<div class="alert alert-success" style="margin:10px;"><i class="fa-fw fa fa-check"></i><strong>Success</strong> '+modelName+' is saved successfully !!</div>').scrollTop('100');
		}
		window.scrollTo(0, 10);
		
		return false;
    }, showNotification:function(data){
    	if(!app.rtn)
    		return false;
    		
    	if(data&&data.taskcode){
    		if(data.status == 'finished'){
	    		app.rtn.message('success', {
	    			title:data.taskcode, content:data.message? data.message:(data.taskcode + ' for #' + data.taskid + ' is ' + data.status)
	    		});
    		}else if(data.status == 'exception'){
    			app.rtn.message('error', {
	    			title:data.taskcode, content:data.message? data.message:(data.taskcode + ' for #' + data.taskid + ' is ' + data.status + '<br/>' + (data.exception?data.exception:''))
	    		});
    		} else if(data.status == 'running'){
    			app.rtn.message('info', {
	    			title:data.taskcode, content:data.message? data.message:(data.taskcode + ' for #' + data.taskid + ' is ' + data.status + '<br/>' + (data.exception?data.exception:''))
	    		});
    		} else if(data.message){
    			app.rtn.message('info', {
	    			title:data.message + '<br/>'
	    		});
    		} else{
    			$.smallBox({
					title : data.taskcode,
					content : data.taskcode + ' for #' + data.taskid + ' is ' + data.status,
					color : "#3276B1",
					timeout: 1000,
					icon : "fa fa-bell swing animated",
					number : data.docId
				});
    		}
    	} else if(data&&data.message){
			app.rtn.message('info', {
    			title:data.message + '<br/>'
    		});
		} else{
    		$.smallBox({
				title : "Notification!",
				content : "This message will dissapear in 6 seconds!",
				color : "#739E73",
				icon : "fa fa-check",
				number : "1",
				timeout : 6000
			});
    	}
    },// LOCAL VARIABLES
    importid:null,
    importselector:null,
    feasibilityselector:null,
    feasibilityresultselector:null,
    trialselector:null
});


/**
 * Need to create functions specific to the them smart admin	
 *
 */
/*
 * VARIABLES
 * Description: All Global Vars
 */
// Impacts the responce rate of some of the responsive elements (lower value affects CPU but improves speed)
$.throttle_delay = 350;

// The rate at which the menu expands revealing child elements on click
$.menu_speed = 235;

// Note: You will also need to change this variable in the "variable.less" file.
$.navbar_height = 49; 

/*
 * APP DOM REFERENCES
 * Description: Obj DOM reference, please try to avoid changing these
 */	
$.root_ = $('body');
$.left_panel = $('#left-panel');
$.shortcut_dropdown = $('#shortcut');
$.bread_crumb = $('#ribbon ol.breadcrumb');

// desktop or mobile
$.device = null;

/*
 * APP CONFIGURATION
 * Description: Enable / disable certain theme features here
 */		
$.navAsAjax = false; // Your left nav in your app will no longer fire ajax calls

// Please make sure you have included "jarvis.widget.js" for this below feature to work
$.enableJarvisWidgets = true;

// Warning: Enabling mobile widgets could potentially crash your webApp if you have too many 
// 			widgets running at once (must have $.enableJarvisWidgets = true)
$.enableMobileWidgets = false;


/*
 * DETECT MOBILE DEVICES
 * Description: Detects mobile device - if any of the listed device is detected
 * a class is inserted to $.root_ and the variable $.device is decleard. 
 */	

/* so far this is covering most hand held devices */
var ismobile = (/iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(navigator.userAgent.toLowerCase()));

if (!ismobile) {
	// Desktop
	$.root_.addClass("desktop-detected");
	$.device = "desktop";
} else {
	// Mobile
	$.root_.addClass("mobile-detected");
	$.device = "mobile";
	
	// Removes the tap delay in idevices
	// dependency: js/plugin/fastclick/fastclick.js 
	//FastClick.attach(document.body);
}


/*
 * FULL SCREEN FUNCTION
 */

// Find the right method, call on correct element
function launchFullscreen(element) {

	if (!$.root_.hasClass("full-screen")) {

		$.root_.addClass("full-screen");

		if (element.requestFullscreen) {
			element.requestFullscreen();
		} else if (element.mozRequestFullScreen) {
			element.mozRequestFullScreen();
		} else if (element.webkitRequestFullscreen) {
			element.webkitRequestFullscreen();
		} else if (element.msRequestFullscreen) {
			element.msRequestFullscreen();
		}

	} else {
		
		$.root_.removeClass("full-screen");
		
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}

	}

}

/*
 * RESIZER WITH THROTTLE
 * Source: http://benalman.com/code/projects/jquery-resize/examples/resize/
 */

(function($, window, undefined) {

	var elems = $([]), jq_resize = $.resize = $.extend($.resize, {}), timeout_id, str_setTimeout = 'setTimeout', str_resize = 'resize', str_data = str_resize + '-special-event', str_delay = 'delay', str_throttle = 'throttleWindow';

	jq_resize[str_delay] = $.throttle_delay;

	jq_resize[str_throttle] = true;

	$.event.special[str_resize] = {

		setup : function() {
			if (!jq_resize[str_throttle] && this[str_setTimeout]) {
				return false;
			}

			var elem = $(this);
			elems = elems.add(elem);
			$.data(this, str_data, {
				w : elem.width(),
				h : elem.height()
			});
			if (elems.length === 1) {
				loopy();
			}
		},
		teardown : function() {
			if (!jq_resize[str_throttle] && this[str_setTimeout]) {
				return false;
			}

			var elem = $(this);
			elems = elems.not(elem);
			elem.removeData(str_data);
			if (!elems.length) {
				clearTimeout(timeout_id);
			}
		},

		add : function(handleObj) {
			if (!jq_resize[str_throttle] && this[str_setTimeout]) {
				return false;
			}
			var old_handler;

			function new_handler(e, w, h) {
				var elem = $(this), data = $.data(this, str_data);
				data.w = w !== undefined ? w : elem.width();
				data.h = h !== undefined ? h : elem.height();

				old_handler.apply(this, arguments);
			};
			if ($.isFunction(handleObj)) {
				old_handler = handleObj;
				return new_handler;
			} else {
				old_handler = handleObj.handler;
				handleObj.handler = new_handler;
			}
		}
	};

	function loopy() {
		timeout_id = window[str_setTimeout](function() {
			elems.each(function() {
				var elem = $(this), width = elem.width(), height = elem.height(), data = $.data(this, str_data);
				if (width !== data.w || height !== data.h) {
					elem.trigger(str_resize, [data.w = width, data.h = height]);
				}

			});
			loopy();

		}, jq_resize[str_delay]);

	};

})(jQuery, this);

/*
* NAV OR #LEFT-BAR RESIZE DETECT
* Description: changes the page min-width of #CONTENT and NAV when navigation is resized.
* This is to counter bugs for min page width on many desktop and mobile devices.
* Note: This script uses JSthrottle technique so don't worry about memory/CPU usage
*/

// Fix page and nav height
function nav_page_height() {
	var setHeight = $('#main').height();
	//menuHeight = $.left_panel.height();
	
	var windowHeight = $(window).height() - $.navbar_height;
	//set height

	if (setHeight > windowHeight) {// if content height exceedes actual window height and menuHeight
		$.left_panel.css('min-height', setHeight + 'px');
		$.root_.css('min-height', setHeight + $.navbar_height + 'px');

	} else {
		$.left_panel.css('min-height', windowHeight + 'px');
		$.root_.css('min-height', windowHeight + 'px');
	}
}

//$('#main').resize(function() {
//	nav_page_height();
//	check_if_mobile_width();
//})
//
//$('nav').resize(function() {
//	nav_page_height();
//})
//
//function check_if_mobile_width() {
//	if ($(window).width() < 979) {
//		$.root_.addClass('mobile-view-activated')
//	} else if ($.root_.hasClass('mobile-view-activated')) {
//		$.root_.removeClass('mobile-view-activated');
//	}
//}

/* ~ END: NAV OR #LEFT-BAR RESIZE DETECT */

/*
 * DETECT IE VERSION
 * Description: A short snippet for detecting versions of IE in JavaScript
 * without resorting to user-agent sniffing
 * RETURNS:
 * If you're not in IE (or IE version is less than 5) then:
 * //ie === undefined
 *
 * If you're in IE (>=5) then you can determine which version:
 * // ie === 7; // IE7
 *
 * Thus, to detect IE:
 * // if (ie) {}
 *
 * And to detect the version:
 * ie === 6 // IE6
 * ie > 7 // IE8, IE9 ...
 * ie < 9 // Anything less than IE9
 */

// TODO: delete this function later on - no longer needed (?)
var ie = ( function() {

		var undef, v = 3, div = document.createElement('div'), all = div.getElementsByTagName('i');

		while (div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->', all[0]);

		return v > 4 ? v : undef;

	}()); // do we need this? 

/* ~ END: DETECT IE VERSION */

/*
 * CUSTOM MENU PLUGIN
 */

$.fn.extend({

	//pass the options variable to the function
	jarvismenu : function(options) {

		var defaults = {
			accordion : 'true',
			speed : 200,
			closedSign : '[+]',
			openedSign : '[-]'
		};

		// Extend our default options with those provided.
		var opts = $.extend(defaults, options);
		//Assign current element to variable, in this case is UL element
		var $this = $(this);

		//add a mark [+] to a multilevel menu
		$this.find("li").each(function() {
			if ($(this).find("ul").size() != 0) {
				//add the multilevel sign next to the link
				$(this).find("a:first").append("<b class='collapse-sign'>" + opts.closedSign + "</b>");

				//avoid jumping to the top of the page when the href is an #
				if ($(this).find("a:first").attr('href') == "#") {
					$(this).find("a:first").click(function() {
						return false;
					});
				}
			}
		});

		//open active level
		$this.find("li.active").each(function() {
			$(this).parents("ul").slideDown(opts.speed);
			$(this).parents("ul").parent("li").find("b:first").html(opts.openedSign);
			$(this).parents("ul").parent("li").addClass("open")
		});

		$this.find("li a").click(function() {

			if ($(this).parent().find("ul").size() != 0) {

				if (opts.accordion) {
					//Do nothing when the list is open
					if (!$(this).parent().find("ul").is(':visible')) {
						parents = $(this).parent().parents("ul");
						visible = $this.find("ul:visible");
						visible.each(function(visibleIndex) {
							var close = true;
							parents.each(function(parentIndex) {
								if (parents[parentIndex] == visible[visibleIndex]) {
									close = false;
									return false;
								}
							});
							if (close) {
								if ($(this).parent().find("ul") != visible[visibleIndex]) {
									$(visible[visibleIndex]).slideUp(opts.speed, function() {
										$(this).parent("li").find("b:first").html(opts.closedSign);
										$(this).parent("li").removeClass("open");
									});

								}
							}
						});
					}
				}// end if
				if ($(this).parent().find("ul:first").is(":visible") && !$(this).parent().find("ul:first").hasClass("active")) {
					$(this).parent().find("ul:first").slideUp(opts.speed, function() {
						$(this).parent("li").removeClass("open");
						$(this).parent("li").find("b:first").delay(opts.speed).html(opts.closedSign);
					});

				} else {
					$(this).parent().find("ul:first").slideDown(opts.speed, function() {
						/*$(this).effect("highlight", {color : '#616161'}, 500); - disabled due to CPU clocking on phones*/
						$(this).parent("li").addClass("open");
						$(this).parent("li").find("b:first").delay(opts.speed).html(opts.openedSign);
					});
				} // end else
			} // end if
		});
	} // end function
});


//function RealTimeNotification(options) {
//	this.init(options);
//	
//	return this;
//}
//
//RealTimeNotification.prototype.options={
//	color:{
//		"default":"#3276B1",
//		"success":"#739E73",
//		"error":"#C46A69",
//		"info":"#C79121"
//	},
//	timeout:{
//		"default":6000,
//		"success":8000,
//		"error":5000,
//		"info":3000
//	}
//};
//
//RealTimeNotification.prototype.init = function(options){
//	if(options)
//		$.extend(this.options, options);
//};
//
//RealTimeNotification.prototype.newmessage = function(type, data){
//	self.message(type, data);
//};
//
//RealTimeNotification.prototype.message = function(type, data){
//	var self = this;
//	type = type||'default';
//	
//	var data = data || {docId:1, title:'Notification', content:'Notification content'};
//	var timeout = data.timeout||self.options.timeout[type] || self.options.timeout['default'];
//	var color = self.options.color[type] || self.options.color['default'];
//	//app.log('Notification color -- ' + color);
//	
//	var _options_ = {
//		title : data.title,
//		content : data.content||'',
//		color : color,
//		icon : "fa fa-bell swing animated",
//		number : data.docId
//	};
//	
//	if(timeout&&timeout != -1)
//		_options_.timeout=timeout;
//		
//	$.smallBox(_options_, function() {
//		if(data&&data.onclose){
//			data.onclose();
//		} else if(data&&data.onClose){
//			data.onClose();
//		}
//	});
//};

/**
 * AUTOCOMPLETE SOURCE
 */
function ESPAGlobalSelector(options) {
	return this.init(options);
}

ESPAGlobalSelector.prototype.init = function(options){
	var self = this;
	self.options = $.extend({}, this.options, options);
	
	if(this.options.url&&this.options.datakey&&!this.options.datadisplay){
		this.options.datadisplay = this.options.datakey
	}else if(this.options.url && !this.options.datakey){
		this.options.datadisplay = 'title';
		this.options.datakey = '_id';
	}
	self.selector = null;
	
	return self;
};

ESPAGlobalSelector.prototype.formatAjaxResult = function(data, page){
	var self = this;
	var total = 0;
	var dataresults = [];
	
	if(data instanceof Array){
		dataresults = data;
		total = data.length;
	}else{
		total = Number(data.info.count);
		dataresults = data.results;			        	
	}
	
	var results = [];
	for(var i = 0; i < dataresults.length; i++){
    	var model = dataresults[i];
    	results.push({id:model[self.options.datakey], text:model[self.options.datadisplay]});
    }	
    
	var more = (page * 10) < total; // whether or not there are more results available
	
    return {text:'title', results: results, more: more};
}

ESPAGlobalSelector.prototype.formatResult = function(data){
	var self = this;
	if(self.options.itemicon)
		return '<i class="'+self.options.itemicon+'"/>' + data.text;
	else
		return data.text;
};

ESPAGlobalSelector.prototype.options = {
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

ESPAGlobalSelector.prototype.toggle = function(hide){
	var self = this;

	if(self.selector&&hide){
		if(self.options.plugin == 'select2')
			self.selector.select2('container').hide();
		else
			self.selector.hide();
	}else if(self.selector){
		if(self.options.plugin == 'select2')
			self.selector.select2('container').show();
		else
			self.selector.show();
	}
};

ESPAGlobalSelector.prototype.next = function(id){
	var self = this;
	
	if(self.selector)
		$('option:eq(1)', self.selector).attr('selected', 'selected');
	
	self.selector.trigger('change');
};

ESPAGlobalSelector.prototype.initplugin = function(id){
	var self = this;
	
	if(self.selector){
		if(self.options.plugin == 'select2'){
			var placeholder = "Select a " + self.options.title;
			if(self.options.title && self.options.multiple)
				placeholder="Select " + self.options.title;
				
			if(self.options.ajax){
				var formatAjaxResult = self.options.formatAjaxResult||function(data, page){return self.formatAjaxResult(data, page)};
				var formatResult = self.options.formatResult||function(data){return self.formatResult(data)};
				self.selector.select2({
				    placeholder: placeholder,
				    minimumInputLength: self.options.minimumInputLength,
				    ajax: {
				        url:self.options.url,
				        dataType: 'jsonp',
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
				    dropdownCssClass: "bigdrop", // apply css that makes the dropdown taller
				    escapeMarkup: function (m) { return m; },
				    width:'100%'
				}).on('change', self.options.change);
			}else{
				if(self.options.change){
					self.selector.select2({
						placeholder: placeholder,
						allowClear: true,
						width : '100%'
					}).on('change', self.options.change);
			  	}else{
			  		self.selector.select2({
						placeholder: placeholder,
						allowClear: true,
						width : '100%'
					});
			  	}
			}
		}
	}else{
		app.log(self.selector);
	}
}

ESPAGlobalSelector.prototype.createselect = function(id){
	var self = this;
	if(self.selector){
		app.log('Do nothing, selector already available');
	}else{
		if($(this.options.id, this.options.container).length > 0){
			$select = $(this.options.id, this.options.container);
		}else{
			$select = $('<input id="'+this.options.id+'" style="min-width:'+self.options.minwidth+';" />');
			if(self.options.plugin&&self.options.ajax){
			}else{
				$select = $('<select id="'+this.options.id+'" style="min-width:'+self.options.minwidth+';"></select>');
			}
		}	
		
		if($(this.options.container).is('ol')){
			var li = $('<li></li>').append($select);
			$(this.options.container).append(li);
		}else
			$(this.options.container).prepend($select);
		
		self.selector = $select;
		
		if($select.is('select') && this.options.url){
			if(this.options.title&&($select.attr('multiple')!='multiple'))
				$select.append('<option selected value="">' + this.options.title + '</option>');
				
			$.get(this.options.url,function(data, status){
		    	if(data){
		    		for(var i in data){
		    			var option = data[i];
		    			
		    			self.selector.append('<option '+(id == option[self.options.datakey]+'' ? 'selected ' : '')+'value="'+option[self.options.datakey]+'">'+option[self.options.datadisplay]+'</option>');
		    		}
		    		
		    		if(self.options.onload){
		    			self.options.onload($select);
		    		}
		    	}
		  	});
		  	
		  	if(self.options.change){
		  		self.selector.change(self.options.change);
		  	}
		}
		
		self.initplugin(id);
	}
	
	return $select;
}

ESPAGlobalSelector.prototype.load = function(id){
	var self = this;
	
	if(!self.selector&&self.options.url){
		self.createselect(id);
	}else{
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
	
	this.options = $.extend({}, this.options, options);
	
	self.selector = null;
	
	return self;
};

GlobalLink.prototype.load = function(curid){
	var self = this;
	
	var $link;
	if($(this.options.container + ' ' + this.options.id).length > 0){
		$link = $(this.options.id, this.options.container);
		$link.empty();
	}else
		$link = $(this.options.container).append('<ul id="'+this.options.id+'"></ul>');
	
	var links = this.options.links;
	if(this.options.crud)
		links = $.merge($.merge( [], links ), this.options.crudlinks)
	
	var model = this.options.modelname;
	
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
		$(this.options.container).show();
	//
}

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
}

/**
 * Configure the Jarvis widget for form and list view
 * @param id
 * @param el
 */
//function ConfigureJarvisWidget(id, el, config, backboneview) {
//	id = id || '#'+$('section', el).attr('id');
//	if(!config){
//		config = {};
//	}
//	
//	config = $.extend({loadingLabel:'Loading...'}, window.DEFAULT_JARWIS_CONFIG, config);
//	
//	if($(id, el).length > 0){
//		var widget = $(id, el).jarvisWidgets(config);
//		
//		if(config.refreshButton){
//			var refreshBtn =
//			    '<a href="#" class="button-icon jarviswidget-refresh-btn" data-loading-text="&nbsp;&nbsp;Loading...&nbsp;" rel="tooltip" title="Refresh" data-placement="bottom"><i class="' +
//			    config.refreshButtonClass + '"></i></a>';
//			    
//		    $('.jarviswidget-ctrls', $(id, el)).prepend(refreshBtn);	
//		   	$('.jarviswidget-ctrls .jarviswidget-refresh-btn', $(id, el)).click(function(event){
//		    	event.preventDefault();
//		    	
//		    	if(backboneview)
//		    		backboneview.refresh(this);
//	            
//	            return false;
//		    });
//		}
//		
//		$('.jarviswidget-ctrls .jarviswidget-edit-btn', $(id, el)).click(function(event){
//	    	if(backboneview)
//	    		backboneview.configedit(this);
//	    });
//	}
//}

//window.DEFAULT_DATATABLE_CONFIG = {
//	 "iDisplayLength": 25,
//	 "sPaginationType" : "bootstrap_full"
//};

//window.DEFAULT_JARWIS_CONFIG = {
//	grid : 'article',
//	widgets : '.jarviswidget',
//	localStorage : false,/**If needed to store locally enable it */
//	deleteSettingsKey : '#deletesettingskey-options',
//	settingsKeyLabel : 'Reset settings?',
//	deletePositionKey : '#deletepositionkey-options',
//	positionKeyLabel : 'Reset position?',
//	sortable : true,
//	buttonsHidden : false,
//	toggleButton : true,
//	toggleClass : 'fa fa-minus | fa fa-plus',
//	toggleSpeed : 200,
//	onToggle : function() {},
//	deleteButton : false,
//	deleteClass : 'fa fa-times',
//	deleteSpeed : 200,
//	onDelete : function() {},
//	editButton : false,
//	editPlaceholder : '.jarviswidget-editbox',
//	editClass : 'fa fa-cog | fa fa-save',
//	editSpeed : 200,
//	onEdit : function() {},
//	colorButton : false,
//	fullscreenButton : true,
//	fullscreenClass : 'fa fa-resize-full | fa fa-resize-small',
//	fullscreenDiff : 3,
//	onFullscreen : function() {},
//	customButton : false,
//	customClass : 'folder-10 | next-10',
//	customStart : function() {},
//	customEnd : function() {},
//	buttonOrder : '%refresh% %custom% %edit% %toggle% %fullscreen% %delete%',
//	opacity : 1.0,
//	dragHandle : '> header',
//	placeholderClass : 'jarviswidget-placeholder',
//	indicator : true,
//	indicatorTime : 600,
//	ajax : true,
//	timestampPlaceholder : '.jarviswidget-timestamp',
//	timestampFormat : 'Last update: %m%/%d%/%y% %h%:%i%:%s%',
//	refreshButton : true,
//	refreshButtonClass : 'fa fa-refresh',
//	labelError : 'Sorry but there was a error:',
//	labelUpdated : 'Last Update:',
//	labelRefresh : 'Refresh',
//	labelDelete : 'Delete widget:',
//	afterLoad : function() {},
//	rtl : false, // best not to toggle this!
//	onChange : function() {},
//	onSave : function() {},
//	ajaxnav : $.navAsAjax, // declears how the localstorage should be saved
//	loadingLabel:'Loading...',
//	style:'jarviswidget-color-blueLight'
//};

function normalizeFilename(str) {
    var a = ['À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'ß', 'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'ÿ', 'Ā', 'ā', 'Ă', 'ă', 'Ą', 'ą', 'Ć', 'ć', 'Ĉ', 'ĉ', 'Ċ', 'ċ', 'Č', 'č', 'Ď', 'ď', 'Đ', 'đ', 'Ē', 'ē', 'Ĕ', 'ĕ', 'Ė', 'ė', 'Ę', 'ę', 'Ě', 'ě', 'Ĝ', 'ĝ', 'Ğ', 'ğ', 'Ġ', 'ġ', 'Ģ', 'ģ', 'Ĥ', 'ĥ', 'Ħ', 'ħ', 'Ĩ', 'ĩ', 'Ī', 'ī', 'Ĭ', 'ĭ', 'Į', 'į', 'İ', 'ı', 'Ĳ', 'ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'Ĺ', 'ĺ', 'Ļ', 'ļ', 'Ľ', 'ľ', 'Ŀ', 'ŀ', 'Ł', 'ł', 'Ń', 'ń', 'Ņ', 'ņ', 'Ň', 'ň', 'ŉ', 'Ō', 'ō', 'Ŏ', 'ŏ', 'Ő', 'ő', 'Œ', 'œ', 'Ŕ', 'ŕ', 'Ŗ', 'ŗ', 'Ř', 'ř', 'Ś', 'ś', 'Ŝ', 'ŝ', 'Ş', 'ş', 'Š', 'š', 'Ţ', 'ţ', 'Ť', 'ť', 'Ŧ', 'ŧ', 'Ũ', 'ũ', 'Ū', 'ū', 'Ŭ', 'ŭ', 'Ů', 'ů', 'Ű', 'ű', 'Ų', 'ų', 'Ŵ', 'ŵ', 'Ŷ', 'ŷ', 'Ÿ', 'Ź', 'ź', 'Ż', 'ż', 'Ž', 'ž', 'ſ', 'ƒ', 'Ơ', 'ơ', 'Ư', 'ư', 'Ǎ', 'ǎ', 'Ǐ', 'ǐ', 'Ǒ', 'ǒ', 'Ǔ', 'ǔ', 'Ǖ', 'ǖ', 'Ǘ', 'ǘ', 'Ǚ', 'ǚ', 'Ǜ', 'ǜ', 'Ǻ', 'ǻ', 'Ǽ', 'ǽ', 'Ǿ', 'ǿ'];
    var b = ['A', 'A', 'A', 'A', 'A', 'A', 'AE', 'C', 'E', 'E', 'E', 'E', 'I', 'I', 'I', 'I', 'D', 'N', 'O', 'O', 'O', 'O', 'O', 'O', 'U', 'U', 'U', 'U', 'Y', 's', 'a', 'a', 'a', 'a', 'a', 'a', 'ae', 'c', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', 'n', 'o', 'o', 'o', 'o', 'o', 'o', 'u', 'u', 'u', 'u', 'y', 'y', 'A', 'a', 'A', 'a', 'A', 'a', 'C', 'c', 'C', 'c', 'C', 'c', 'C', 'c', 'D', 'd', 'D', 'd', 'E', 'e', 'E', 'e', 'E', 'e', 'E', 'e', 'E', 'e', 'G', 'g', 'G', 'g', 'G', 'g', 'G', 'g', 'H', 'h', 'H', 'h', 'I', 'i', 'I', 'i', 'I', 'i', 'I', 'i', 'I', 'i', 'IJ', 'ij', 'J', 'j', 'K', 'k', 'L', 'l', 'L', 'l', 'L', 'l', 'L', 'l', 'l', 'l', 'N', 'n', 'N', 'n', 'N', 'n', 'n', 'O', 'o', 'O', 'o', 'O', 'o', 'OE', 'oe', 'R', 'r', 'R', 'r', 'R', 'r', 'S', 's', 'S', 's', 'S', 's', 'S', 's', 'T', 't', 'T', 't', 'T', 't', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'W', 'w', 'Y', 'y', 'Y', 'Z', 'z', 'Z', 'z', 'Z', 'z', 's', 'f', 'O', 'o', 'U', 'u', 'A', 'a', 'I', 'i', 'O', 'o', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'U', 'u', 'A', 'a', 'AE', 'ae', 'O', 'o'];

    var i = a.length;
    while (i--) str = str.replace(a[i], b[i]);
    
    var regex = /[^\w\s]/gi;
   	
   	str = str.replace('.csv', '_PCSVNMSAHGFSAHVSHAVSHAVJSHSKACSV');
   	str=str.replace(regex, '_');
   	str = str.replace('_PCSVNMSAHGFSAHVSHAVSHAVJSHSKACSV', '.csv');
   	
    return str;
}

if($.fn.dataTableExt)
	$.extend($.fn.dataTableExt.oSort, {
	    "date-eu-pre": function (date) {
	        var date = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date),
	            dd   = date ? (date[1] || 0) : 0,
	            mm   = date ? (date[2] || 0) : 0,
	            yyyy = date ? (date[3] || 0) : 0;
	
	        return { yyyy: yyyy * 1, mm: mm * 1, dd: dd * 1 };
	    },
	    "date-eu-asc": function (a, b) {
	        return (a.yyyy < b.yyyy) ? -1 :
	               (a.yyyy > b.yyyy) ?  1 :
	               (a.mm   < b.mm)   ? -1 :
	               (a.mm   > b.mm)   ?  1 : a.dd - b.dd;
	    },
	    "date-eu-desc": function (a, b) {
	        return (a.yyyy > b.yyyy) ? -1 :
	               (a.yyyy < b.yyyy) ?  1 :
	               (a.mm   > b.mm)   ? -1 :
	               (a.mm   < b.mm)   ?  1 : b.dd - a.dd;
	    }
	});

if($.fn.dataTableExt)
	$.fn.dataTableExt.aTypes.unshift(
	   function (data) {
	       if (data === null)  {
	           return null;
	       }
	       if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(data) === true) {
	           return 'date-eu';
	       }
	       return null;
	   }
	);