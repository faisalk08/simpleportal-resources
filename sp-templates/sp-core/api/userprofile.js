"use strict";
/*!
 * Simpleportal userprofile server
 * 
 * Copyright(c) 2015 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */
var simpleportal = require("simpleportal/lib/simpleportal");

/*
 * Creating the CRUD Service for service profile and using userprofile as the
 * collection name.
 * user profile is only available to access by the user which is logged in to the system, 
 * not even the administrator should be able to manipulate the data 
 */
var userprofileService = new simpleportal.Service.CRUDService({
	collection:'userprofile', 
	modify:true, restservice:false,
	viewservice:true,
	name:'userprofile', 
	primaryKeyFields:['profileId'],
	model:{
		profileId:'',
		username:'',
		fullname:'',
		termsofServiceAccepted:false,
		roles:[],
		oauth:{},
		preference:{},
		dashboards:[]
	},
	dataformat:{
		object:function(userprofile, request){
			if(userprofile && !userprofile.fullname){
				if(request.body.fullName && request.body.fullName.trim() != '')
					userprofile.fullname = request.body.fullName;
				else {
					if(request.body.lastName)
						userprofile.lastName = request.body.lastName;
					
					if(request.body.firstName)
						userprofile.fullname += " " +request.body.firstName;
				}	
			}
			
			if(!userprofile.profileId && request.body.username)
				userprofile.profileId = userprofile.username;
			
			if(!userprofile.roles)
				userprofile.roles = [];
			
			var userroles = userprofileService.getServiceloader().getService("userrole").getConfiguration('userroles');
			
			for(var roleIndex in userroles){
				if(userroles[roleIndex].email){
					var emailexpression = new RegExp(userroles[roleIndex].email);
					
					if(emailexpression && emailexpression.test(userprofile.emailAddress)){
						if(!simpleportal.util.arraycontains(userprofile.roles, roleIndex))
							userprofile.roles.push(roleIndex);
					}
				}
			}
			
			if(!simpleportal.util.arraycontains(userprofile.roles, "user"))
				userprofile.roles.push("user");
			
			return userprofile;
		}
	},
	"configuration":{
		modelsettings:{
			roles:{alternatenames:["role"]}
		}
	},servicetemplates:{
		"help":"help",
		"dashboard":"dashboard",
		"settings":"settings",
		"phonegapsettings":"phonegapsettings",
		"phonegapdashboard":"phonegapdashboard",
		"terms-of-service":"terms-of-service",
		"session-locked":"session-locked.html"
	}
});

/**
 * Exposed to request user profile rest api
 */
userprofileService.get("/", function(request, response, callback){
	callback(null, request.getUserprofile());
});

/**
 * @method updateTermsOfService
 * 
 * To update the Terms of Service for the logged in user
 * @callback callback with updated user profile
 */
userprofileService.updateTermsOfService = function(request, callback) {
	var userprofile = request.getUserprofile();
	
	userprofileService.getLogger().info("userprofile:updateTermsOfService", "Updating user profile - " + userprofile.id);
	
	userprofileService.getStorageService().add_update({id:userprofile.id}, {id:userprofile.id, termsofServiceAccepted:true}, function(error, savedprofile){
		if(error)
			userprofileService.getLogger().error("userprofile:updateTermsOfService", error);
		
		request.user.termsofServiceAccepted = true;
		
		callback(error, savedprofile);
	});
}

/**
 * To update the preference for a logged in user
 * 
 * @method updatePrefernece
 * @param request http request
 * @param preference preference to udpate to the user account 
 * @param callback callback function return saved userprofile
 */
userprofileService.updatePreference = function(request, preference, callback){
	if(preference){
		var userprofile = request.getUserprofile();

		userprofileService.getLogger().info("userprofile:updatePreference", "Updating the user preference - " + userprofile.id);
		
		userprofileService.getStorageService().findOne({id:userprofile.id},function (error, saveduserprofile) {
			if(saveduserprofile){
				var oldpreference = saveduserprofile.preference||{};
				
				simpleportal.util.extendJSON(oldpreference, preference);
				
				if(request.user)
					request.user.preference = oldpreference;
				
				userprofileService.getStorageService().update({id:userprofile.id}, {preference:oldpreference}, callback);
			}else
				callback(error);
		});
	}
}

/**
 * To update the oauth token for a particular user
 * 
 * @method updateOauthToken 
 * 
 * @param request http request to identify the user
 * @param oauth token to save in to the db
 * @param callback callback function return saved user profile
 */
userprofileService.updateOauthToken = function(request, tokendata, callback, remoteprofile){
	if(tokendata && tokendata.oauthproviderkey){
		var userprofile = request.getUserprofile();
		
		if(userprofile) {
			userprofileService.getLogger().info("userprofile:updateOauthToken", "Updating the oauth token - " + userprofile.id);
			
			userprofileService.getStorageService().findOne({id : userprofile.id}, function(error, saveduserprofile){
				if(saveduserprofile){
					var oauth = saveduserprofile.oauth || {};
					
					oauth[tokendata.oauthproviderkey] = tokendata;
					
					userprofileService.getStorageService().update({id : saveduserprofile.id}, {oauth:oauth}, callback);
				} else {
					callback(error);
				}
			});
		} else callback("No user profile found to update, make sure you properly logged in to the system.");
	} else
		callback('No oauth token data provided or defined');
}

userprofileService.removeOauthToken = function(request, oauthprovider, callback){
	if(oauthprovider){
		var userprofile = request.getUserprofile();

		userprofileService.getLogger().info("userprofile:removeOauthToken", "Removing the oauth token - " + oauthprovider + ">> " + userprofile.id);
		
		if(userprofile){
			userprofileService.getServiceloader().getService("system_user").getStorageService().findOne({username : userprofile.username}, function(error, dbuser){
				if(dbuser && dbuser.provider != oauthprovider){
					userprofileService.getStorageService().findOne({id : userprofile.id}, function(error, saveduserprofile){
						var oauth = saveduserprofile.oauth || {};
						
						if(oauth[oauthprovider]){
							delete oauth[oauthprovider];
	
							if(request.user)
								request.user.oauth = oauth;
							
							var upprofile = {oauth:oauth};
							
							upprofile[oauthprovider + "profile"] = null;
							
							userprofileService.getStorageService().update({id : saveduserprofile.id}, upprofile, callback);
						}else
							callback(error, saveduserprofile)
					});
				}else if(dbuser && dbuser.provider == oauthprovider){
					callback("Oauth token for this account can not be deleted.");
				} else
					callback(error)
			});
		} else
			callback("No valid user found")
	} else
		callback('No oauth token data provided or defined');
}

userprofileService.updateOauthProfile = function(request, oauthproviderkey, oauthprofile, callback){
	var userprofile = request.getUserprofile();
	
	userprofileService.getLogger().info("userprofile:updateOauthProfile", "updatinf oauth profile -" + oauthproviderkey + ">> " + userprofile.id);
	
	if(userprofile && oauthproviderkey && oauthprofile){
		var oauthprofile_ = {id : userprofile.id};

		oauthprofile_[oauthproviderkey + "profile"] = oauthprofile;
		if(request.user)
			request.user[oauthproviderkey + "profile"] = oauthprofile;
		
		userprofileService.getStorageService().add_update({id : userprofile.id}, oauthprofile_, callback);
	} else callback("No user profile, oauthproivder key or oauthprofile");
}

userprofileService.findByUsername = function(username, callback){
	userprofileService.getStorageService().findOne({username : username}, callback);
}

userprofileService.getUserprofile = function(username, callback){
	userprofileService.findByUsername(username, function(error, userprofile){
		if(error || !userprofile)
			callback(error||"No user profile found for the logged in user, please log out and login again!");
		else{
			_getUserProfile(null, userprofile, callback);
		}
	});
}

/**
 * To get the stored user profile if not available create new one
 * 
 * @method getStoredeuserprofile
 * 
 * @param request http request to identify the user
 * @param callback callback function return saved userprofile
 * 
 */
userprofileService.getStoredUserprofile = function(request, userprofile, callback, updatesession) {
	// get the user profile from the request and then store in to user profile db
	if(userprofile && typeof userprofile == 'function'){
		callback = userprofile;
		
		userprofile = null;
	}
	
	if(!userprofile)
		userprofile = request.getUserprofile();

	if(userprofile)
		userprofileService.getStorageService().findOne({username : userprofile.username}, function(error, saveduserprofile){
			if(error || !saveduserprofile) {
				saveduserprofile = getUserprofileFromUser(userprofile, saveduserprofile);
				
				userprofileService.getStorageService().add_update({id:saveduserprofile.id}, saveduserprofile, function(error, dbuserprofile){
					if((request.user || updatesession) && dbuserprofile)
						request.user = dbuserprofile;
					
					_getUserProfile(request, dbuserprofile, callback);
				});
			} else {
				if(request.user || updatesession)
					request.user = saveduserprofile;
				
				_getUserProfile(request, saveduserprofile, function(error, updateduserprofile){
					if((request.user || updatesession) && updateduserprofile)
						request.user = updateduserprofile;
					
					callback(error, updateduserprofile);
				});
			}
		});
	else
		callback("No profile found to update")
}

userprofileService.on("startup", function(){
	userprofileService.getServiceloader().getService("user").on("afterupdate", function(data){
		if(data.servicemodel){
			userprofileService.getStorageService().findOne({username : data.servicemodel.username}, function(error, saveduserprofile){
				if(saveduserprofile){
					userprofileService.getStorageService().add_update({id:saveduserprofile.id}, {id:saveduserprofile.id, roles:data.servicemodel.roles}, function(error, saveduserprofile){});
				}
			});
		}
	})
});

var getUserprofileFromUser = function(userprofile, saveduserprofile, callback){
	var dummyrequest = {body : userprofile};
	
	var userprofilefromrequest = userprofileService.getObject(dummyrequest);
	
	saveduserprofile = simpleportal.util.extendJSON({}, userprofilefromrequest, saveduserprofile);
	saveduserprofile.id = userprofileService.getObjectId(saveduserprofile);
	
	delete saveduserprofile._id;
	
	if(callback)
		callback(null, saveduserprofile);
	else
		return saveduserprofile;
}

var _getUserPlugins = function(request, plugintype, userprofile, callback){
	if(!userprofile && request)
		userprofile = request.getUserprofile();
	
	if(userprofile){
		var roles = [];

		if(userprofile && userprofile.roles)
			roles = userprofile.roles;
		
		var puginsearchquery;
		
		if(userprofileService.getServiceloader().getService("plugin") && roles){
			puginsearchquery = {$or:[{'permission.roles':{$in:roles}}, {'permission.roles':''}], disabled:{$ne:true}, 'installed':true, plugintype:plugintype, "public":{$ne:true}}
		} else if(userprofileService.getServiceloader().getService("plugin")){
			puginsearchquery = {'permission.roles':'', disabled:{$ne:true}, 'installed':true, plugintype:plugintype, "public":{$ne:true}}
		}
		
		if(puginsearchquery){
			userprofileService.getServiceloader().getService("plugin").getStorageService().find(puginsearchquery, function(error, data){
				if(data && data.results)
					callback(error, data.results);
				else
					callback(error, data)
			}, {sort:{priority:-1}, fields:{priority:1, installed:true, id:1, webappurl:1, title:1, iconclass:1, description:1, icon:1, webappsetting:1, webappuri:1, categories:1, permission:1}});
		} else
			callback(null, []);
	}else
		callback('Please login to proceed', null)
}

var _getUserProfile = function(request, userprofile, callback){
	if(!userprofile && request)
		userprofile = request.getUserprofile();
	
	if(userprofile){
		if(!userprofile.preference || Object.keys(userprofile.preference).length == 0)
			userprofile.preference = {
				languageId:'en'
			};
	
		_getUserPlugins(request, 'webapp', userprofile, function(error, webapps){
			userprofile.webapps = webapps;
			
			// check whether dashboadservice is available
			if(userprofileService.getServiceloader().getService('dashboardservice')){
				userprofileService.getServiceloader().getService('dashboardservice').getUserData({status:'active'}, request, userprofile, function(error, data){
					if(data && data.results){
						userprofile.dashboards = data.results;
						
						callback(null, userprofile);
					}else
						callback(null, userprofile);
				})
			}else
				callback(null, userprofile);
		});//callback(null, userprofile);
	}else
		callback('Please login to proceed', null);
}

module.exports = userprofileService;