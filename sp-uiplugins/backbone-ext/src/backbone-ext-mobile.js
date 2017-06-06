// Extends Backbone.Router
define([ "jquery", "backbone"], function( $, Backbone ) {
	var _PAGE_TMPL_ = '<div data-role="page" id="<%= pageid %>">\
		<%if(appendTemplate){%>\
			<div data-role="header" data-add-back-btn="<%= false||backButton %>" >\
				<a id="nav-panellink" data-inline="true" href="#nav-panel" data-icon="bars" data-iconpos="notext">Menu</a>\
				<a data-iconpos="notext" data-inline="true" data-direction="reverse" href="#back" data-rel="back" data-iconpos="notext" data-icon="back">Back</a>\
				<h1 class="logo"></h1>\
				<a data-iconpos="notext" data-iconpos="notext" ui-btn-corner-all" data-direction="reverse" href="#" data-icon="home">Home</a>\
			</div>\
			<div data-role="content" class="content ui-content">\
		<%}%>\
		<%= pagedata %>\
		<%if(appendTemplate){%>\
			</div>\
		</div>\
		<%}%>';
	
	var _PANEL_TMPL_="<div data-swipe-close='false' data-theme='<%= themeskin %>' data-role='panel' id='nav-panel' data-position='left' data-display='push'>\
			<div data-role='header'></div><%= pagedata %></div>";
	
	var _POPUP_TMPL_='';
	var PAGE_OPTIONS = {
		pagetemplateid:'page_template',
		backButton:true,
		pageid:"text", 
		appendTemplate:true,
		pagedata:'<p> Page template <p>',
		themeskin:'b',
		append:true, searchform:true,
		pageBody:true, appendcontent:true
	};
	
	function getPaginationUrl(url, options){
		var queryparams = [];
		if(options && options.queryparams){
    		for(var i in options.queryparams){
    			if(options.queryparams[i].indexOf("pagination=false") != -1){
    				options.pagination = false;
    			}else if($.inArray(options.queryparams[i], queryparams) == -1)
    				queryparams.push(options.queryparams[i]);
			}
		}
		
		if(options && options.model && options.nextPage && !options.pagination){
			var pagination = _.extend({start:0, end:options.paginationDelta||10, count: 0}, window[options.model + 'pagination']);//window[options.model + 'pagination']||{start:0, end:options.paginationDelta||10, count: 0};

	    	window[options.model + 'pagination'] = pagination;
	    	
	    	pagination.start = Number(pagination.start||0) + Number(options.paginationDelta||10);
        	pagination.end = Number(pagination.start||0) + Number(options.paginationDelta||10);
        	
	    	queryparams.push('start=' + pagination.start);
	    	queryparams.push('end=' + pagination.end||0);
	    	queryparams.push('pagination=false');
	    	
	    	window[options.model + 'pagination'] = pagination;
		}
		
		if(options && options.pagination && options.model){
			options.urlParams = options.urlParams||{};
		    
			var paginationUrl = options.url||options.paginationUrl;
			
			var pagination = {start:0, end:options.paginationDelta||10, count: 0};
			//var pagination = _.extend({start:0, end:options.paginationDelta||10, count: 0}, window[options.model + 'pagination']);

	    	window[options.model + 'pagination'] = pagination;
	    	
	    	queryparams.push('start=' + pagination.start);
	    	queryparams.push('end=' + pagination.end||10);
	    	queryparams.push('pagination=true');
	    	
			for(param in options.urlParams){
				if(options.urlParams[param] != ''){
					queryparams.push(param + '=' + encodeURIComponent(options.urlParams[param]));
				}
			}

			//@TODO disabled for temp let us check the cintetn and append to the main page
	    	//if(paginationUrl.indexOf("callback=") == -1)
	    	//	queryparams.push('callback=?');
	    	
	    	var query = queryparams.join('&');

	    	//if(paginationUrl.indexOf('?') == -1){
	    	//	paginationUrl = paginationUrl + '?';
	    	//}

	    	if(options.mainurl){
	    		url = paginationUrl;
	    		
	    		if(url.indexOf("/") == 0 && options.mainurl.indexOf("/") == 0){}
	    		else if(options.mainurl != "/" && ('/' + url ).indexOf(options.mainurl) != 0 && url.indexOf("/") != 0)
	    			url = options.mainurl + paginationUrl;
				
	    	} else 
	    		url = paginationUrl;

	    	if(url.indexOf("?") == -1)
	    		url = url + '?'  + query;
	    	else if(url.indexOf('?') != -1)
	    		url = url + '&' + query;
	    	else
	    		url = url + query;
	    }else{
	    	//@TODO disabled for temp let us check the cintetn and append to the main page
	    	//if(url.indexOf("callback=") == -1)
	    	//	queryparams.push('callback=?');
	    	
	    	var query = queryparams.join('&');

			if(url.indexOf('?') == -1 && query)
				url = url + '?' + query;
			else if(url.indexOf('?') != -1)
				url = url + '&' + query;
			else if(query)
				url = url + query;
	    }
		
//		if(url.indexOf("http") != 0 && options && options.mainurl){
//			options.mainurl + url;
//		}
		
		options.nextPage = false;
		
		return url;
	}
	
	/**
	 * Get page content
	 */
	function getRemoteContent(url, callback, options, mystorage) {
		var contentcontainer = options.container||'.content';
	    var searchurl = getPaginationUrl(url, options);

	    var dataType;
	    if(searchurl.indexOf("/") < 0) {
	    	dataType = "jsonp";
	    } else if(searchurl.indexOf(".html" > -1)){
	    	dataType = 'html';
	    } else
	    	dataType = 'json';
	    
	    $.ajax({
	        url: searchurl, dataType:dataType,
	        type: 'GET', success: function(data, status, XMLHttpRequest){
	        	if(callback)
	            	callback(data+'');
	        },
	        error: function(error, data, xhr){
	        	var offlineData = mystorage ? mystorage.getItem(searchurl) : null;
	            if(offlineData === null) return ;
	            
	            var data = response.responseText;
	            
	            if(callback)
	            	callback(offlineData);
	        }
	    });
	}
	
	/**
	 * To get the page content based on the page id inside the document body
	 */
	function getLocalContent(url, callback, options, mystorage) {
		if($("#" + options.pageid + '_template').length > 0 ){
			callback($('#' + options.pageid + '_template').html() + '');
    	}else if($("#" + options.pageid).length > 0 ){
			callback($('#' + options.pageid).html() + '');
    	}else if(mystorage && 'network' in navigator && navigator.network.connection.type === Connection.NONE) {
    		getLocalStorageContent(url, callback, options, mystorage);
    	}else
    		callback(null);
	}
	
	/**
	 * To get the content from the local storage
	 */
	function getLocalStorageContent(url, callback, options, mystorage) {
		var contentcontainer = options.container||'.content';
	    //var searchurl = getPaginationUrl(url, options);
	    
        var offlineData = mystorage ? mystorage.getItem(url) : null;
        
        callback(offlineData);
	}
	
	function getPageContent(url, callback, options, mystorage) {
	    options = _.extend({}, options);
	    
	    var contentcontainer = options.container||'.content';
	    //var searchurl = getPaginationUrl(url, options);

	    var _pccallback=(function(url, callback, options, mystorage){
	    	return function(pageContent){
	    		if(options.container){
		        	if(options.appendcontent)
		        		$(contentcontainer).append(pageContent).trigger('create');
		        	else
		        		$(contentcontainer).html(pageContent).trigger('create');
		        }
	    		
	    		if(callback)
	    			callback(pageContent);
	    	}
	    })(url, callback, options, mystorage);
	    
	    // check content is inside the page
	    if(!options.cache){
	    	getLocalContent(url, function(data){
	    		if(data)
	    			_pccallback(data);
	    		else{
	    			getRemoteContent(url, _pccallback, options, mystorage);
	    		}
	    	}, options, mystorage);
	    }else{
	    	getRemoteContent(url, _pccallback, options, mystorage);
	    }
	};

	function loadAjaxContent(location, options, callback) {
		return $(options.mainpage + ' [data-role=content]').load(location, function() {
			if(options.backButton)
				$(options.mainpage + ' [data-role=header] [data-rel=back]').removeClass("disabled").removeClass("ui-disabled");

			//$(options.mainpage + ' [data-role=header] .logo').html("Change the title");

			$(this).trigger('create');
			$.mobile.loading("hide");

			if(callback)
				callback();
		});
	}

	var MobileApp = Backbone.Router.extend({
		routes: {
	        ""									: "home",
	        "home"								: "home",
	        "refresh"							: "refresh",
	        "back" 								: "back",
	        "close" 							: "close",
	        "searchform"						: "searchform",
	        "settings" 							: "settings",
	        "login" 							: "login",
	        "logout" 							: "logout",
	        "appsettings"						: "appsettings",

	        "panel/:model/:submodel"			: "panelSubPage",
	        "panel/:model"						: "panelPage",
	        "popup/iframe/:model/:submodel"		: "popupIframeSubPage",
	        "popup/:model/:submodel/:submodelid": "popup2SubPage",
	        "popup/:model/:submodel"			: "popupSubPage",
	        "popup/:model"						: "popupPage",
	        
	        ":view/:model/details/:id?:modelquery"	: "search2Submodels",
	        ":view/:model/details/:id"				: "search2Submodels",
	        
//	        ":view/:model/:submodel/:id?:modelquery": "search3Submodels",
//	        ":view/:model/:submodel/:id"			: "search3Submodels",
	        	
	        ":model/details/:id?:modelquery"	: "searchSubmodels",
	        ":model/details/:id"				: "searchSubmodels",
//	        ":model/:submodel/:id?:modelquery"	: "search2Submodels",
//	        ":model/:submodel/:id"				: "search2Submodels",
//	        ":model/:submodel?:id"				: "searchSubmodels",
//	        ":model/:submodel"					: "searchSubmodels",
//	        ":model?:id"						: "searchmodels",
//	        ":model"							: "searchmodels",
	        "popup/*notFound"					: "dynamicPopupPage",
//	        "/*notFound"						: "dynamicAbsolutePage",
	        "*notFound?:query"					: "dynamicPage",
	        "*notFound"							: "dynamicPage"
	    },
	    dynamicPopupPage:function(uri, query){
	    	this.popupPage(uri, query);	
	    },
	    dynamicAbsolutePage:function(uri, query){
	    	var self = this;
	    	console.log(uri)
	    	self.searchmodels(uri, query);	
	    },
	    dynamicPage:function(uri, query){
	    	var self = this;
	    	self.searchmodels(uri, query);	
	    },
	    execute: function(callback, args, name) {
	    	var self = this;
	    	
	    	$.mobile.loading('show');
			var systempaths = this.systemroutes||["appsettings", "settings", "back", "refresh", "login", "logout"];
			
			if(args.length > 0 && args[0] != name && self[args[0]]){
				name = args[0];
				args.shift();
			}
			
			if(self[name] && $.inArray(name, systempaths) != -1) {
				args = args||{replace:false};

				self[name].apply(this, args);
				
				$.mobile.loading("hide");

				return false;
			}else{
				if (callback) callback.apply(this, args);
			}
		},
	    settings:function(){
	    	if(this.options.settingsuri)
	    		this.panelPage(this.options.settingsuri, null, {title:"Settings", append:true});
	    },logout:function(){},close:function(){
	    	if(confirm("Do you want to close?"))
	    		close();
	    	else
	    		history.go(-2);
	    },close:function(){},
	    refresh:function(){},login:function(){
	    	if(!this.loggedIn && this.options.loginuri)
	    		window.location=this.options.loginuri;
	    },
	    back:function(){
	   		history.go(-2);
	    },
	    pageTemplate:_.template(_PAGE_TMPL_),
	    panelTemplate:_.template(_PANEL_TMPL_),
	    getLocalContent:function(pageid){
	    	if($("#" + pageid).length > 0 ){
	    		return $('#' + pageid).html() + '';
	    	}else
	    		return null;
	    },
		initialize: function(options) {
			var self = this;
			
	    	if(options && options.mainurl)
	        	self.setMainUrl(options.mainurl);
	        
	        this.options = options;
	        
	        this.urlParams = {}//this.loadUrlParams();
	        this._urimapping = {};
	        var pagetemplateid = options.pagetemplateid||"page_template";
	        if(self.getLocalContent(pagetemplateid) != null)
	        	this.pageTemplate = _.template(self.getLocalContent(pagetemplateid));
	        
	        var paneltemplateid = options.paneltemplateid||"panel_template";
	        if(self.getLocalContent(paneltemplateid) != null)
	        	this.panelTemplate = _.template(self.getLocalContent(paneltemplateid));
	        
	        var popuptemplateid = options.popuptemplateid||"popup_template";
	        if(self.getLocalContent(popuptemplateid) != null)
	        	this.popupTemplate = _.template(self.getLocalContent(popuptemplateid));
	        
	        self.updatePanel("#nav-panel", "<!-- Empty panel -->", {open:false});
	        
	        self.settings();
	        
	        self.registerSearchCallback('[data-role="content"]');
	        self.registerAutocomplete();
	    }, setMainUrl:function(mainurl){
	    	this.mainurl = mainurl;
	    },home:function(){
			if(this.options.defaulturi)
				this.searchmodels(this.options.defaulturi);
	    },panelSubPage:function(model, submodel, query){
			this.panelPage(model + '/' + submodel, query);
		},panelPage:function(modeluri, query, options){
			var self = this;
			var searchurl = modeluri;
			if(self.mainurl != "/" && ('/' + searchurl).indexOf(self.mainurl) != 0 && (searchurl).indexOf('/') != 0)
				searchurl = self.mainurl + searchurl;
			
			var options = _.extend({
				mainpage:"#mainpage",
				queryparams:[], url: modeluri, pageBody:false,
				appendpage:false, changePage:false
			}, self.options, {pagination:true, mainurl:self.mainurl}, options);

			delete options.pageid;
			delete options.model;

			if(query)
				options.queryparams.push(query);

			getRemoteContent(searchurl, function(data){
				if(data){
					var $data = $(data);

					options.panelid = (searchurl).replace(/(https|http|\/|:|\&|\?|,|\=|%|\.|#)/g, "");
					
					self.updatePanel("#nav-panel", data, options);
				}
			}, options);
		}, updatePanel:function(panelid, panelContent, options){
			var self = this;
			
			if($(panelid).length > 0){
				var $navigationcontent = $(panelid + " [data-role=content]");
				
				if(options && options.append){
					var $collpasibleset = $("[data-role=collapsibleset]:first", $navigationcontent);
					var $collpasible = $("#" + options.panelid + "_panel", $navigationcontent);
					
					if($collpasible.length > 0){
						// do nothing
					}else{
						if($collpasibleset.length <= 0){
							$navigationcontent.prepend('<div data-inset="false" data-role="collapsibleset"></div>');
							$collpasibleset = $("[data-role=collapsibleset]", $navigationcontent);
							
//							$collpasibleset.trigger("create")
							//$collpasibleset.collapsibleset();
						}
						
						var $collpasible = $("<div data-role='collapsible' id='"+options.panelid+"_panel' ><h2>"+(options.title||"Form")+"</h2><div></div></div>");
						
						$collpasibleset.prepend($collpasible);
						$collpasible = $("#" + options.panelid+"_panel", $collpasibleset);
						
						$("div:first", $collpasible).html(panelContent);
						
						if($("[data-role=collapsible]", $collpasibleset).length > 1) {
							$collpasibleset.collapsibleset();
							
							$collpasibleset.collapsibleset("refresh"); //update the collapsible content in the collpasible set
							$("[data-role=collapsible]", $collpasibleset).collapsible("collapse"); // hide all collapsible nvigation
						}else
							$collpasible.collapsible();
						
						if(options && options.hasOwnProperty("trigger") && !options.trigger){
							$("div", $collpasible).trigger("refresh");	
						}else{
							$collpasible.trigger("create");
						}	
					}
					
					$collpasible.collapsible( "expand" );
				}else {
					$navigationcontent.html(panelContent);
					
					if(options && !options.trigger){
						$navigationcontent.trigger("refresh");	
					}else
						$navigationcontent.trigger("create");
				}
			}else {
				var panelBody = self.panelTemplate({themeskin:self.options.themeskin, pagedata:panelContent, pageid:panelid.replace('#', '')});
				
				$("body").append(panelBody);
				
				$(panelid).trigger("create").panel();
				$(panelid).panel("close");
			}
		}, search3Submodels: function(view, model, submodel, submodel2, query){
			console.log(view)
			this.searchmodels(view + '/' + model + '/' + submodel + '/' + submodel2, query);
		}, search2Submodels: function(model, submodel, submodel2, query){
			this.searchmodels(model + '/' + submodel + '/' + submodel2, query);
		}, searchSubmodels:function(model, submodel, query){
			this.searchmodels(model + '/' + submodel, query);
	    },popupIframeSubPage:function(model, submodel, query){
			this.popupPage(model + '/' + submodel, query, true);
		},popup2SubPage:function(model, submodel, submodel2, query){
			this.popupPage(model + '/' + submodel + '/' + submodel2, query);
		},popupSubPage:function(model, submodel, query){
			this.popupPage(model + '/' + submodel, query);
		},popupPage:function(modeluri, query, iframe){
	    	var self = this;
			var searchurl = self.mainurl + modeluri;

			var options = _.extend({
				mainpage:"#mainpage",
				queryparams:[], url: modeluri, pageBody:false,
				appendpage:false, changePage:false
			}, self.options, {pagination:true, mainurl:self.mainurl});

			delete options.pageid;
			delete options.model;

			if(query)
				options.queryparams.push(query);

			if(iframe){
				var template_ = '<div data-role="popup" id="iframecontent" style="width:90%;height:95%;" data-overlay-theme="b" data-theme="a" class="ui-content">\
					<div data-role="header"><h2><%= title %></h2>\
					<a href="#" data-rel="back" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right">Close</a>\
					</div>\
					<div class="ui-content" data-role="content">\
					<iframe style="border:0px;" src="<%= iframesrc %>" seamless></iframe>\
					</div>\
				</div>'
				var template = _.template(template_)({title:'Popup window', iframesrc:searchurl});
				
				if($('#iframecontent').length > 0)
					$('#iframecontent').remove();
				
				$('body').append(template);
				$('#iframecontent').trigger("create");
				$('#iframecontent').popup({
					dismissible: true,
					beforeposition: setPopupSize,
			        x: 0,
			        y: 0
				});
				
				$('#iframecontent').popup("open");
				$.mobile.loading("hide");
	    	}else{
	    		getRemoteContent(searchurl, function(data){
					var template_ = '<div class="ui-contentyys" data-role="popup" id="pagepopup" style="width:90%;height:95%;" data-overlay-theme="b" data-theme="a">\
						<div data-role="header"><h2><%= title %></h2>\
						<a href="#" data-rel="back" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right">Close</a>\
						</div>\
						<div class="ui-content" data-role="content"><%= pageContent %></div>\
					</div>';
					
					var template = _.template(template_)({themeskin:self.options.themeskin, title:"", pageContent:data});
					
					if($('#pagepopup').length > 0)
						$('#pagepopup').remove();
					
					$('body').append(template);
					
					$('#pagepopup').trigger("create");
					$('#pagepopup').popup({
						positionTo:"window",
						dismissible: true,
						beforeposition: setPopupSize
					});
					$('#pagepopup').popup("open");
					$.mobile.loading("hide");
				}, options);
	    	}
	    }, searchmodels:function(modeluri, query){
	    	var self = this;
	    	
	    	// let us check if there is urimapping
	    	if(modeluri.indexOf("http") == 0){
				var template_ = '<div data-role="popup" id="iframecontent" style="width:90%;height:95%;" data-overlay-theme="a" data-theme="d" data-tolerance="10,10" class="ui-content">\
					<iframe src="<%= iframesrc %>" width="497" height="298" seamless></iframe>\
				</div>'
				var template = _.template(template_)({iframesrc:modeluri});
				
				if($('#iframecontent').length > 0)
					$('#iframecontent').remove();
				
				$('body').append(template);
				$('#iframecontent').trigger("create");
				$('#iframecontent').popup({
					positionTo:"window",
					dismissible: true/*,
					transition: "pop"*/
				});
				$('#iframecontent').popup("open");
				$.mobile.loading("hide");
	    	}else{
	    		var searchurl = modeluri;
	    		var urimapping_;
	    		if(self._urimapping)
	    			urimapping_ = self._urimapping[modeluri];
    			
	    		if(urimapping_
		    		&& urimapping_.templatedir
		    		&& urimapping_.templatename
		    	){
	    			modeluri = searchurl = urimapping_.templatedir + '' + urimapping_.templatename;
		    	} else if(self.mainurl != "/" && ('/' +searchurl).indexOf(self.mainurl) != 0 && (modeluri).indexOf('/') != 0)
					searchurl = self.mainurl + modeluri;
				
				var options = _.extend({
					queryparams:[], url: modeluri, pageBody:true,
					appendpage:true, changePage:true
				}, self.options, {pagination:true, mainurl:self.mainurl});
				
				if(history.length == 2) //@TODO find the real implementation of root hash
					options.backButton=false;
				else
					options.backButton=true;

				delete options.pageid;
				delete options.model;

				if(query)
					options.queryparams.push(encodeURI(query));

//		    	$(options.mainpage + ' [data-role=header] #nav-panellink').hide();
		    	
				self.loadPage(searchurl, options, function(){
					console.log("After load --- : " + searchurl);

					console.log(JSON.stringify(options));
				});
	    	}
	    },
	    registerAutocomplete:function(){
	    	var self = this;
	    	
	    	$( "[data-autocomplete=true]" ).on( "filterablebeforefilter", function ( e, data ) {
	    		var $ul = $( e.target ),
		            $input = $( data.input ),
		            value = $input.val(),
		            html = "";
	    		
		        $ul.html( "" );
		
				var dataUrl = $ul.data("url"),
					displayField = $ul.data("display"),
					template = "<%= "+displayField+" %>"||"<%= shortName %> (<%= name %>)",
					detailsurl = $ul.data("detailsurl"),
					idField = 	$ul.data("id");

				if(detailsurl && idField)
					template = "<a href='"+detailsurl+"<%= "+idField+" %>'>"+template+"</a>";
				
				var datatemplate = _.template("<li>" + template + "</li>");
				
		        if ( dataUrl && value && value.length > 2 ) {
		            $ul.html( "<li><span class='ui-icon ui-icon-loading'></span></li>" );
		            $ul.listview( "refresh" );
		
		            $.ajax({
		                url: dataUrl,
		                dataType: "jsonp",
		                crossDomain: true,
		                data: {
		                    search: $input.val() + '%'
		                }
		            })
		            .then( function ( response ) {
						var result = [];
						if(response && response.result && typeof response.result == "object" && typeof response.result.length == "number")
							result = response.result;
						
		                $.each( result, function ( i, val ) {
							html += datatemplate(val);
		                });
		
		                $ul.html( html );
		
		                $ul.listview( "refresh" );
		                $ul.trigger( "updatelayout");
		            });
		        }
		    });
	    },
		registerSearchCallback:function(container, searchformurl){
			var self = this;
			
			var SEARCH_OPTIONS = {
				container:'#ajaxlist', 
				model:'ajaxmodel', 
				pagination:true, 
				urlParams:{}, queryparams:[],
				mainurl:self.mainurl,
				appendcontent:false, cache:false
    		};
//			console.log($(container).each(function(i, containerdivs){
//				$(containerdivs).find('form[data-ajaxcontent="true"]')
//			}));
//			console.log($('[data-ajaxcontent="true"]', $(container)));
//    		console.log($(container + ' form[data-ajaxcontent="true"]'));
//			$(container + ' form[data-ajaxcontent="true"]').on('submit', function(){
			console.log($(container + ' [data-ajaxcontent=true]'));
			
			$('[data-ajaxcontent=true]').on("submit", function(){
				console.log("hello");
				event.preventDefault();
			});
			
			$(container + ' [data-ajaxcontent=true]').each(function(){
    			var $form = $(this);
    			
    			console.log($form);
    			$form.on('submit', function(event) {
        			event.preventDefault();
        			
        			var queryparams=[];
        			var formarray = $form.serializeArray();
        			
        			for(var i in formarray){
        				var obj = formarray[i];
        				if(obj.value){
        					if($( "[name='"+obj.name+"']", $form).data("wildcard")){
        						queryparams.push(obj.name + "=" + escape(obj.value)+ "%");
        					}else
        						queryparams.push(obj.name+"=" + escape(obj.value));
        				}
        			}
        			
        			var searchoptions = _.extend({}, SEARCH_OPTIONS, $form.data(), {nextPage:false, queryparams:queryparams}); 
        			
        			var searchurl = searchoptions.url;
        			if(searchoptions.url.indexOf("http") != 0 && (searchoptions.url).indexOf('/') != 0){
        				searchurl = self.mainurl + searchoptions.url;
        			}
        			
        			$.mobile.loading("show", {textVisible:true, text:searchoptions.text||"Loading"});
        			
        			if(searchoptions.container == 'mainpage'){
        				searchoptions.container = self.options.mainpage;
        				$(':mobile-pagecontainer').pagecontainer('change', self.options.mainpage, {showLoadMsg:true });
        			}

        			if($(searchoptions.container).data("role") == "page"){
        				searchoptions.container = searchoptions.container + ' [data-role=content]';
        			}

    				if(searchoptions.panel && searchurl){
    					$form.attr("data-panel", "false");
    					var paenlid = (searchurl+'form').replace(/(https|http|\/|:|\&|\?|,|\=|%|\.)/g, "");
    					
    					self.updatePanel("#nav-panel", $(container).html(), {title:searchoptions.paneltext||'Search', append:true, panelid:paenlid, trigger:false});
    				}
    				
        			self.loadPageContent( searchurl, searchoptions, function(){
        				$.mobile.loading("hide");
        				// ceck whether u have the searchoptions
        			});
    			});
        			
//        			return false;
    		});
		},
		registerMoreClick:function(searchurl, options, callback){
	    	// set the more click area and register
	    	var self = this;
	    	
	    	var contentcontainer = options.container||'#'+options.pageid;
	    	if(options.singlepage)
	    		contentcontainer = options.mainpage + " [data-role=content]" ;

	    	var $morebutton = $(contentcontainer + " .more");
    		
			// now check the page containes more or not!
			if(options.pagination && $morebutton && $morebutton.length > 0){
				var count = $morebutton.data("count");

				if(count && count <= window[ options.model + 'pagination' ].end){
					$morebutton.attr('disabled', 'disabled').addClass('disabled').addClass("ui-disabled");
				}else{
					$morebutton.click(function(){
						event.preventDefault();
						var nextoptions = _.extend({}, options);
						
						$.mobile.loading("show", {text:"Loading more data", textVisible:true});
						
						self.loadNextPage(searchurl, nextoptions, function(){
							if(count <= window[options.model + 'pagination'].end){
								$morebutton.attr('disabled', 'disabled').addClass('disabled').addClass("ui-disabled");
							}
							$.mobile.loading("hide");
						});
					});
				}
			}else if(options.pageid && !options.pagination && $("#" + options.pageid + " .more").length > 0){
				$morebutton = $("#" + options.pageid + " .more");

				var count = $morebutton.data("count");

				if(count <= window[ options.model + 'pagination' ].end){
					$morebutton.attr('disabled', 'disabled').addClass('disabled').addClass("ui-disabled");
				}
			}
			
			var pagelinks = "";
			
			$("a[data-template=true]", $(contentcontainer)).each(function(){
				if(!self._urimapping[$(this).attr("href").replace("#", "")])
					self._urimapping[$(this).attr("href").replace("#/", "").replace("#", "")] = $(this).data();
			});
			
			$("a[data-panellink=true]", $(contentcontainer)).each(function(){
				var dynamicdata = $(this).data();
				
				var link = $(this).attr("href");
				var panelid = ('panellink'+ link).replace(/(https|http|\/|:|\&|\?|,|\=|%|\.|#)/g, "");
				
				if($('#' + panelid).length <= 0) {
					if($('.glyphicon, .fa', $(this)).length > 0){
						var icontext = $('.glyphicon, .fa', $(this))[0].outerHTML + '';
							icontext = icontext.replace("fa-4x", "").replace("fa-3x", "").replace("fa-2x", "");
						pagelinks += "<li><a href='"+link+"'>" + icontext + ' ' + $(this).text().trim() + "</a></li>";
					}else
						pagelinks += "<li><a href='"+link+"'>" + $(this).text().trim() + "</a></li>";
				}
			});
			
			$("[data-role=listview][data-panellink=true]", $(contentcontainer)).each(function(){
				var dynamicdata = $(this).data();
				
				if(dynamicdata.panelid){
					var panelid = ('panellink'+ dynamicdata.panelid).replace(/(https|http|\/|:|\&|\?|,|\=|%|\.|#)/g, "");
					var panelcontent = $("<div />").append($(this).clone()).html();
					
					if($('#' + panelid).length <= 0){
						self.updatePanel("#nav-panel", panelcontent, {trigger:false, append:true, title:dynamicdata.paneltitle || "Navigation", panelid:panelid});
					}
				}
			});
			
			if(pagelinks != '')
				self.updatePanel("#nav-panel", "<ul data-role='listview'>"+pagelinks+"</ul>", {append:true, title:"Navigation", panelid:'panellink'});
			
			if(callback)
				callback();
	    },
	    loadNextPage(searchurl, options, callback){
	    	var self = this;
	    	
	    	var contentcontainer = options.container||'#'+options.pageid;
	    	if(options.singlepage)
				contentcontainer = options.mainpage + " [data-role=content]";

	    	var nextoptions = _.extend({}, PAGE_OPTIONS, options, {appendcontent:true, pagination:false, pageBody:false, nextPage:true, container:contentcontainer + ' .pagination'});
	    	
			self.loadPageContent(searchurl, nextoptions, callback);
	    },
		loadPage:function(searchurl, options, callback){
			var self = this;
	    	var options = _.extend({}, PAGE_OPTIONS, {backButton:true, appendTemplate:true, append:true, pageBody:true}, options, {appendcontent:false});

	    	// take main url out of the context and try fetching it
	    	//var mainurlid = self.mainurl.replace(/(https|http|\/|:|\&|\?|,|\=|%|\.)/g, "");

	    	if(options.pageid ){
	    		var queryurl = "";
	    		if(options.queryparams && options.queryparams.length > 0 )
	    			queryurl = options.queryparams.join("&");

	    		options.pageid = (searchurl + queryurl).replace(/(https|http|\/|:|\&|\?|,|\=|%|\.)/g, "");
	    	}

	    	if(!options.model && options.pagination)
	    		options.model = options.pageid;
	    	
			if(options.singlepage) {
				loadAjaxContent(getPaginationUrl(searchurl, options), options, function(){
					if(options.pagination)
						self.registerMoreClick(searchurl, options, function(){});

					self.registerSearchCallback(options.mainpage + " [data-role=content]", searchurl);
				});
			}else if(options.pageid && $('#' + options.pageid).length > 0/* && ($('#' + options.pageid).data("cache") == "true" && $('#' + options.pageid).data("url"))*/){
//    			$('#' + options.pageid).remove();

				//if(!options.appendcontent)
    	    	/*
    	    	$("#" + options.pageid).trigger("create");

				setTimeout(function(){
        	    	console.log("after time out - 500")
        	    	$(':mobile-pagecontainer').pagecontainer('change', $('#' + options.pageid), {transition: "slidedown", showLoadMsg:true });
        	    }, 500);
        	    */

	    		$(':mobile-pagecontainer').pagecontainer('change', "#" + options.pageid);
				//@TODO disabled for temp let us check the content and append to the main page

	    		if(callback)
	    			callback();
    		} else {
    	    	// append and set the page data
    	    	self.getPageContent(searchurl, function(data) {
    	    		// now append the content inside the content container
    	    		// append a more click
        			options.pagedata = data+'';
        			
    	    		var pagecontent = self.pageTemplate(options);
    	    		//now let us attach the content insid eth pageid
    	    		if(options.pageid && $('#' + options.pageid).length > 0){
    	    			$('#' + options.pageid).remove();
    	    		}
    	    		
//    	    		$( ":mobile-pagecontainer" ).on( "pagecontainercreate", function( event, ui ) {
//	    				alert( "This page was just shown: " + ui.nextPage );
//    				});
    	    		
    	    		if(!options.appendcontent)
    	    			$(document.body).append(pagecontent).trigger("create");
    	    		//@TODO disabled for temp let us check the cintetn and append to the main page

    	    		if(options.changePage && options.pageid){
//    	    			$.mobile.changePage( $('#' + options.pageid), { transition: "slideup", showLoadMsg:true} );
						//$(':mobile-pagecontainer').pagecontainer('change', $('#' + options.pageid), {transition: "slidedown", showLoadMsg:true });
        	    		setTimeout(function(){
        	    			$(':mobile-pagecontainer').pagecontainer('change', $('#' + options.pageid), {/*transition: "slidedown", */showLoadMsg:true });
        	    			//@TODO disabled for temp let us check the cintetn and append to the main page
        	    			
        	    		}, 500);
    	    		}
    	    		
    	    		if(options.pagination){
        				self.registerMoreClick(searchurl, options, callback);
        				
        				self.registerSearchCallback(options.mainpage + " [data-role=content]", searchurl);
    	    		}	
    	    		else if(callback)
    	    			callback();
    	    	}, options);   			
    		}
		}, 
		loadPageContent:function(searchurl, options, callback){
	    	var self = this;
	    	// need to have a container and append it
	    	var options = _.extend({}, PAGE_OPTIONS, options, {backButton:true, appendTemplate:false, pageBody:false});
	    	
	    	if(options.container){
	    		self.getPageContent(searchurl, function(data) {
		    		self.registerMoreClick(searchurl, options);
		    		
		    		if(callback)
		    			callback(data);
		    	}, options, self.options.mystorage);
	    	}else if(callback)
	    		callback("Please provide the container to load the content!");
	    }, openPopup : function(options){
	    	var self = this;
	    	var popupoptions = _.extend({pageid:"mainpopup", themeskin:self.options.themeskin, pagedata:"<p>Popup</p>", title:"Popup !"}, options);
	    	
	    	if(self.options.popuppage) {
	    		if( $(self.options.popuppage).length <= 0 ) {
	    			var popupBody = self.popupTemplate(popupoptions);
	    			
	    			$("body").append(popupBody);
	    			$(self.options.popuppage).trigger("create").popup({
	    				transition: "pop",
    					beforeposition: setPopupSize
	    			});
	    			
	    			setTimeout(function(){
	    				$(self.options.popuppage).popup("open");	
	    			}, 200);
	    		}else if(popupoptions.pagedata){
	    			$(self.options.popuppage + " [data-role=content]").html(popupoptions.pagedata);
	    			$(self.options.popuppage).popup("open");
	    		}	
	    	}
	    }
	});
	
	MobileApp.prototype.getPageContent = getPageContent;
	MobileApp.prototype.getRemoteContent = getRemoteContent;
	MobileApp.prototype.getPaginationUrl=getPaginationUrl;
//	MobileApp.prototype.getLocalContent = getLocalContent;
	
	function setPopupSize(event, ui) {
	    var horizSpacing = 20;
	    var vertSpacing = 10;
	    
	    var horizPaddingBorderSize = horizSpacing + $(this).outerWidth() - $(this).width() ;
	    var vertPaddingBorderSize = $(this).outerHeight() - $(this).height()-10;

	    var width = $(this).innerWidth() - (horizSpacing * 2) - horizPaddingBorderSize;
	    var height = $(this).innerHeight() - (vertSpacing * 2) - vertPaddingBorderSize;
	    
	    $(this).css({
	    	right:horizSpacing,
	        left: horizSpacing,
	        top: vertSpacing,
	        bottom:horizSpacing,
	        width: width,
	        height: height
	    });
	    
	    $('iframe', $(this)).css({
        	width: width - 30,
            height: height - 10
        });
	}
	
	return MobileApp;
});