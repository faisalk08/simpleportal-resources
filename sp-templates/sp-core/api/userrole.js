"use strict";
/*!
 * Simpleportal default user api
 * 
 * Copyright(c) 2015 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */

var simpleportal = require("simpleportal/lib/simpleportal");

/*
 * Creating the CRUD Service for service user and using user as the 
 * collection name.
 */
var userroleService = new simpleportal.Service.CRUDService({
	collection:'userrole', 
	name:'userrole', modify:true,
	primaryKeyFields:['role'],
	hiddenFields:['hidden'],
	userrole:['superadmin', "user"],
	model:{
		role : '',
		display : '',
		description : '', 
		roletype : '',
		homeurl:'',
		dashboarduri:'',
		email:'',
		webapps : [""],
		hidden : false
	}, configuration: {
		modelsettings: {
			roletype: {
				fieldplugin:'radio', options:["system", "server", "plugin"],
			}, webapps: {
				url:'/api/system/plugin/search?plugintype=webapp', display:'title', id:'id'
			}
		}
	}
});

userroleService.get("/all", function(request, response, callback){
	userroleService.search({}, function(error, result){
		// now search for plugin defined user roles
		
		callback(error, result.results);
	});
});

userroleService.get("/array", function(request, response, callback){
	userroleService.search({}, function(error, result){
		callback(error, result.results);
	});
});

var updateuserRoles = function(){
	var userroles = userroleService.getConfiguration();
	
	var userroles = {},
		customroles={};
	
	var defaultroles = userroleService.getConfiguration("roles");
    for(var i in defaultroles){
        var role = simpleportal.util.extendJSON({}, defaultroles[i]);
        
        // let us save this to user role service
        role.id = userroleService.getObjectId(role);
        
        if(userroles[role.role])
        	userroles[role.role] = simpleportal.util.extendJSON(userroles[role.role], role);
        else
        	userroles[role.role] = role;
    }
    
    // set the webapps in to the role db
    var webapps = userroleService.getPluginloader().getPlugins('webapp');
	for(var pluginIndex in webapps){
		var webapp = webapps[pluginIndex];
		
		if(webapp.permission && webapp.permission.length > 0){
			for(var roleIndex in webapp.permission){
				var permission = webapp.permission[roleIndex];
				
				if(permission.roles){
					for(var roleIndex_ in permission.roles){
						var role = permission.roles[roleIndex_];
						
						if(role && userroles[role]){
							var rolesettings = userroles[role];
							
							if(!rolesettings.webapps)
								rolesettings.webapps=[webapp.id];
							
							else if(!simpleportal.util.arraycontains(rolesettings.webapps, webapp.id))
								rolesettings.webapps.push(webapp.id);
						} else if(role && role.indexOf("@") != -1){
							var rolesettings = customroles[role];
							if(!rolesettings)
								customroles[role] = rolesettings = {id:role.replace("@", "_at_"), homeuri:webapp.webappuri, roletype:"plugin", role:role, dislay:role.replace("@", " @ ")};
							
							if(!rolesettings.webapps)
								rolesettings.webapps=[webapp.id];
							else if(!simpleportal.util.arraycontains(rolesettings.webapps, webapp.id))
								rolesettings.webapps.push(webapp.id);
						}		
					}
				}
			}
		} else if(webapp.permission && webapp.permission.roles){
			for(var roleIndex in webapp.permission.roles){
				var role = webapp.permission.roles[roleIndex];
				
				if(role && userroles[role]){
					var rolesettings = userroles[role];
					
					if(!rolesettings.webapps)
						rolesettings.webapps = [webapp.id];
					
					else if(!simpleportal.util.arraycontains(rolesettings.webapps, webapp.id))
						rolesettings.webapps.push(webapp.id);
				}else if(role && role.indexOf("@") != -1){
					var rolesettings = customroles[role];
					if(!rolesettings)
						customroles[role] = rolesettings = {homeuri:webapp.webappuri, roletype:"plugin", role:role, dislay:role.replace("@", " @ ")};
					
					if(!rolesettings.webapps)
						rolesettings.webapps=[webapp.id];
					else if(!simpleportal.util.arraycontains(rolesettings.webapps, webapp.id))
						rolesettings.webapps.push(webapp.id);
				}
			}
		}
	}
	
	for(var rolename in userroles){
        var role = userroles[rolename];
        
        userroleService.getStorageService().add_update({id : role.id}, role, function(error, userrolesaved){
        	// user role is saved in to the service
        	if(error)
        		userroleService.getLogger().warn("Service.userrole", "Some problem while saving the roles in to db - " + error);
        });
	 }
	 
	 if(customroles && Object.keys(customroles).length > 0)
		 for(var rolename in customroles){
	        var role = customroles[rolename];
	        
	        userroleService.getStorageService().add_update({id : role.id}, role, function(error, customrolesaved){
	        	// user role is saved in to the service
	        	if(error)
	        		userroleService.getLogger().warn("Service.userrole", "Some problem while saving the roles in to db - " + error);
	        });
		 }
}

/**
 * Init event for storing the roles from the configuration file in to the db.
 */
userroleService.on("init", function(){
	userroleService.getServiceloader().on("server.ready", updateuserRoles);
});

/**
 * Exporting the Sponsor service.
 */
module.exports = userroleService;