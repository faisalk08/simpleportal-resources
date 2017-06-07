"use strict";
var simpleportal = require("simpleportal");

/**
 * API for template snippets
 * @class 
 */
var templatesnippetService = new simpleportal.Service.CRUDService({
	name:'templatesnippet',
	modify:true, 
	collection:'templatesnippet', 
	userrole:['superadmin', 'admin'],
	defaultsort:{sort:[['title', -1]]}, primaryKeyFields:['title', 'plugin'],
	model:{
		plugin:'',
		title:'',
		codesnippet:'',
		snippetType:'',
		status:'default'
	},
	validation:{
		title:'required',
		codesnippet:'required'
	}, 
	configuration:{
		modelsettings:{
			codesnippet:{
				fieldplugin:'editarea', displayoptions:{
					syntax_selection_allow: 'html, css, js'
				}
			}, snippetType:{
				options:['html', 'css', 'js']
			}, plugin: {
				url:'/api/plugin/search', display:'title', id:'id'
			},
			status:{
				url:'status', display:'display', id:'id', multiple:false
			}
		}
	}
});

templatesnippetService.get('/:id/codesnippet', function(request, response, callback){
	templatesnippetService.details(request.pathGroup, function(error, templatesnippet){
		if(error || !templatesnippet)
			callback(error);
		else{
			response.contentType(simpleportal.util.getMimeType(templatesnippet.snippetType));
			response.send(200, request.headers, templatesnippet.codesnippet);
		}
	});
	
});

/**
 * Export template snippets
 */
module.exports = templatesnippetService;