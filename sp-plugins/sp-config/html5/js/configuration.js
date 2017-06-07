/**
 * To load the w2UI Form using json editor configuration
 * @method loadConfigurationForm
 * 
 * @param editorsettings
 */
function loadConfigurationForm(editorsettings){
	/* Default configuration for the json editor */
	var defaults={
		name:'jsoneditor',
		title:(window.serverTitle||'')+ ' Settings',
		formURL:'template/tabbedconfiguration',
		url:'configuration',
		tabs:[],
		fields:[],
		record:{}, isGenerated:true,
		onChange:function(event, onemore, index){
			var obj = this;
			
			if(event.target.indexOf('db__mongodb') != -1){
				obj.databasechanged=true;
				$('#tabs_configuration_tabs_tab_database div').addClass('alert-danger');
			}
			
			if(Object.keys(obj.getChanges()).length > 0)
				$('.w2ui-buttons [name=save]').addClass('btn-success');
			/*
			if(/__new/.test(event.target)){
				console.log(onemore);
				window.open('/configuration/subeditor/?ajax=true&category=services&categoryid='+event.value_new.id, "details", "titlebar=no&toolbar=no&location=no");
			}
			*/
			return true;
		}
	};
	
	/* Extending editor options from the remote server */
	var editoroptions = $.extend(defaults, editorsettings);
	editoroptions.formURL=editoroptions.formURL+ location.search;
	editoroptions.url =editoroptions.url+ location.search;
	
	editoroptions.actions = {
		"reset": function () {
			this.clear();
		},
		"save": function (event) {
			event.preventDefault();
			var obj = this;
			
			var validationerros = obj.validate()
			
			var changes = obj.getChanges();
			for( var i in changes){
				if(changes[i] != '') {
					var result = $.grep(editoroptions.fields, function(e){ return e.field == i; });
					if(result && result.length > 0 && result[0].dataType =="object")
						changes[i] = JSON.parse(changes[i]);
				}
			}
			
			var remoteoptions = {
				url:obj.url, 
				data:changes, 
				success:function(){
					location.reload();
				}
			};
	   		
			callRemoteServer(remoteoptions);
			return true;
		}
	};
	
	function callRemoteServer(options){
		var defaults = {
			type: "POST",
			url: options.url||editoroptions.url,
			data: [],
			success: function(data){
				try{
					var responseJSON = JSON.parse(data.responseText);
					
					if(options.success)
						options.success(responseJSON);
				}catch(error){
					if(options.success)
						options.success(error);
				}
			},
			error: function(data){
				if(data&&data.responseText){
					try{
						var responseJSON = JSON.parse(data.responseText);
						
						if(responseJSON.status == 'success'){
							if(options.success)
								options.success(responseJSON);
							
							alert('Successfull message from server');
						}else{
							if(options.error)
								options.error(responseJSON);
							
							if(responseJSON.message.message)
								alert('Error from Server - ERROR:-' + responseJSON.message.message);
							else if(responseJSON.message)
								alert('Error from Server - ' + responseJSON.message);
							else
								alert('Error from Server');
						}
					}catch(error){
						if(options.error)
							options.error(error);
					}
				}
			},
		  	dataType: 'text/json'
		};
			
		var ajaxoptions = $.extend(defaults, options);
		var goahhead = confirm('Do you want to send | call the remote server ?');
		
		if(goahhead)
			$.ajax(ajaxoptions);
		else
			return false;
	}
	
	$(editoroptions.tabs).each(function(index, tab){
		if(tab.buttons){
			$(tab.buttons).each(function(bindex, button){
				editoroptions.actions[button.field]=function(){
					event.preventDefault();
			   		var obj = this;
					var changes = obj.getChanges();
					
					var option = button.action || button.action;
					var remoteoptions = {url:option, data:changes};
			   		
					callRemoteServer(remoteoptions);
				}
			});
		}
	});
	
	if(editoroptions.rootfield && editoroptions.rootfield.indexOf("__new") >= -1 ) {
		if(!editoroptions.record[editoroptions.rootfield])
			editoroptions.record[editoroptions.rootfield]='new';
		if(editoroptions.tabs&&editoroptions.tabs.length > 0)
			editoroptions.tabs[0].fields.push({html:{caption:'Name / Title - '}, field:editoroptions.rootfield});
		
		editoroptions.fields.push({html:{caption:'Name / Title - '}, field:editoroptions.rootfield});
	}
	
	/* Creating the w2Ui form using the configuration from server */
	var w2uieditor = $('#'+ editoroptions.name).w2form(editoroptions);
	
	w2uieditor.on("action", function(event, element){
		if($(element.originalEvent.target).hasClass('subcategory')){
			var category = $(element.originalEvent.target).data("category") ||element.target;
			$.get('serverconfig/configuration?category='+category, function(formconfiguration){
				console.log(formconfiguration.config.fields);
				if (!w2ui[category]) {
					
					formconfiguration.config.fields.unshift({html:{caption:'Name / Title - '}, field:formconfiguration.config.name});
					
					$().w2form({ 
			            name   : category, isGenerated:true,
			            formHTML: formconfiguration.html,
			            fields: formconfiguration.config.fields,
//			            record: formconfiguration.config.record,
			            url:'serverconfig/'+category+'/configuration',
			            actions: {
			                reset: function () {
			                    this.clear();
			                },
			                save: function () {
			                	console.log("Hello saved")
			                	var changes = this.getChanges();
			                	console.log(this.get(category).$el.val());
			                	changes[category] = this.get(category).$el.val();
			                	this.save(changes);
			                }
			            }
			        });
				}
				
				$().w2popup('open', {
			        title   : category + ' Form',
			        body    : '<div id="form" style="width: 100%; height: 100%;"></div>',
			        style   : 'padding: 15px 0px 0px 0px',
			        width   : 500,
			        height  : 300, 
			        showMax : true,
			        onToggle: function (event) {
			            $(w2ui[category].box).hide();
			            event.onComplete = function () {
			                $(w2ui[category].box).show();
//			                
			                w2ui[category].resize();
			            }
			        },
			        onOpen: function (event) {
			            event.onComplete = function () {
			                // specifying an onOpen handler instead is equivalent to specifying an onBeforeOpen handler, which would make this code execute too early and hence not deliver.
			                $('#w2ui-popup #form').w2render(category);
			            }
			        }
			    });
			});
		}
	});
}