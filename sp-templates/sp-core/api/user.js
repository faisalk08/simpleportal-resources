"use strict";
/*!
 * Simpleportal default user api
 * 
 * Copyright(c) 2015 Faisal(admin@simpleportaljs.com)
 * MIT Licensed
 */

var simpleportal = require("simpleportal"),
	Base64 = require("simpleportal/lib/util/base64"),
	util = require('simpleportal/lib/util'),
	Encryption = require("simpleportal/lib/util/encryption");

/*
 * Creating the CRUD Service for service user and using user as the 
 * collection name.
 */
var userService = new simpleportal.Service.CRUDService({
	collection:'user', 
	name:'user', modify:true,
	primaryKeyFields:['username'],
	hiddenFields:['password'],
	userrole:['superadmin', 'admin'],
	model:{
		username:'',
		firstname:'', 
		lastname:'', 
		email:'',
		password:'',
		roles:[],
		description:''
	},validation:{
		username:'required',
		email:'required',
		password:'required',
		object:function(object){
			var userkeywords = /^(admin|superadmin|user|userprofile|public|private)$/ig;
			
			if(!object.username||object.username=='')
				return {isValid:false, message:'User name is empty.'};
			else if(object.username && (userkeywords.test(object.username.trim())))
				return {isValid:false, message:'Invalid user name.'};
			else
				return {isValid:true};
		}
	},dataformat:{
		password:function(password){
			if(password) {
				var password_ = Base64.Public.decode(password);
				
				return new Encryption(password_).encryptText();
			}
		},
		object:function(user, request){
			if(!user.fullname) {
				var fullname = user.username;
				if(user.firstname){
					fullname = user.firstname;
					if(user.lastname)
						fullname += ' ' + user.lastname;
				}else if(user.lastname)
					fullname = user.lastname;
				
				user.fullname = fullname;
			}
			return user;
		}
	}, configuration:{
		modelsettings:{
			password:{type:'password'},
			fullname:{alternatenames:["fullName"]},
			firstname:{alternatenames:["firstName"]},
			lastname:{alternatenames:["lastName"]},
			email:{alternatenames:["emailAddress"]},
			username:{alternatenames:["userName", "emailAddress"]},
			roles:{
				url:"/api/system/userrole", fieldplugin:'simpleselector', displayoptions:{datakey:'role', multiple:true}, multiple:true
			}
		}
	}, preferencesetting:{
		encodepassword:false
	}, preference:{
		encodepassword:true
	}
});

/**
 * Getting all roles for the user
 */
userService.get('/role', function(request, response, callback){
	callback(null, userService.getConfiguration('roles'));
});

userService.get('/webapps', function(request, response, callback){
	userService.getUserPlugins(request, 'webapp', callback);
});

userService.on("startup", function(){updateuserRoles();});

/**
 * After details for deleting the password before sending to the browser
 */
userService.afterdetails = function(error, user, callback){
	if(user)delete user.password;
	
	callback(error, user);
}

userService.validPassword = function(user, password, callback){
	try {
//		if(userService.getPreference("encodepassword")){
		var password_ = Base64.Public.decode(password);
		
		valid = (new Encryption(Base64.Public.decode(password)).authenticate(user.password));
		
		if(!valid)
			valid = (new Encryption(Base64.Public.encode(password)).authenticate(user.password));
		
		if(!valid)
			valid = (new Encryption(password).authenticate(user.password));
		
		return valid;
//		} else {
//			return (new Encryption(password).authenticate(user.password));
//		}
	} catch(error){
		userService.getLogger().warn("user:validPassword", "invalid decryption at the client side.");
		
		return (new Encryption(password).authenticate(user.password));
	}
}

/**
 * To get the user based on the user name
 */
userService.findByUsername = function(username, callback){
	userService.getStorageService().findOne({username : username},function (err, user) {
		callback(err, user);
	}, {password:0});
}

/**
 * API to check a particular user is providing valid user password across an http request
 * 
 * @Method("login");
 * @events([{"id":"user.login", "display":"user-loged-in"}]);
 */
userService.oauthLogin = function(request, providerid, remoteprofile, callback){
	userService.getLogger().info("user:oauthLogin", "oauth login for the user is called - " + providerid);
	
	userService.getUserFromuserprofile(remoteprofile, {}, function(error, generateduser){
		if(error || (generateduser && generateduser.validationmessages && generateduser.validationmessages.length > 0)){
			userService.getLogger().warn("user:oauthLogin", "problem in generting user from remote profile - ");
			
			if(error || generateduser.validationmessages)
				userService.getLogger().error("user:oauthLogin", error || generateduser.validationmessages);
			
			callback(error || generateduser.validationmessages, generateduser);
		}else{
			delete generateduser.validationmessages;

			var userdbquery = {
				email : generateduser.email,
				username  : generateduser.username
			};
			
			// check if there is any user which is directly created using remote login	
			userService.getStorageService().findOne(userdbquery, function(error, dbuser) {
				if(dbuser){
					createuserProfilefromUser(request, dbuser, providerid, remoteprofile, callback);
				}else {
					generateduser.provider = providerid;
					
					userService.getStorageService().add_update(null, generateduser, function(error, dbuser){
						if(dbuser){
							createuserProfilefromUser(request, dbuser, providerid, remoteprofile, function(error, dbuserprofile){
								userService.emit(simpleportal.Constants.CommonAPIEvents.USER_LOGIN, {servicemodel:dbuser});

								callback(error, dbuserprofile);
							});  
						} else {
							// that means you can directly login with that account
							callback(error, false, { user: dbuser, status:401, message: 'Unknown user' });							
						}
					});
				}	
			});
		}	
	});
};

/**
 * API to check a particular user is providing valid user password across an http request
 * 
 * @Method("login");
 * @events([{"id":"user.login", "display":"user-loged-in"}]);
 */
userService.login = function(request, query, callback){
	userService.getStorageService().findOne({username : query.username}, function(error, user){
		if (error) { 
			callback(error, false, { message: error }); 
		}else if (!user) {
			callback(null, false, { status:401, message: 'Unknown user' });
		}else if (!userService.validPassword(user, query.password)) {
			callback(null, false, { status:401, message: 'Invalid password' });
		} else{
			delete user.password;
			/**
			 * Generate or create a user profile as to store the preference and all logged in data specific to the user
			 * also should store the oath token
			 */ 
			userService.emit(simpleportal.Constants.CommonAPIEvents.USER_LOGIN, {servicemodel:user});

			userService.getServiceloader().getService("userprofile").getStoredUserprofile(request, user, callback, true);
		}	
	});
};

/**
 * To update hasPermission
 * 
 */
userService.hasPermission = function(request, webappurl, callback){
	var user = request.getUserprofile();
	
	var webappid = webappurl.replace(/\//g, '');
	if(request.webappsetting)
		webappid = request.webappsetting.id;
	
	//@TODO make sure request is updated with the webapp
	if(request.webappsetting 
		&& request.webappsetting.permission 
		&& !request.isAuthenticated()
	) {
		if(request.webappsetting.permission.length == 1 
			&& request.webappsetting.permission[0].roles 
			&& simpleportal.util.arraycontains(request.webappsetting.permission[0].roles, "guest"))
			callback();
		else	
			callback({loginRequired:true, exception:'Permission denied - please login to proceed', webappurl:webappurl, webappid:webappid});
	} else {
		var userwebapp;
		if(user && user.webapps)
			userwebapp = util.getJSONObject(user.webapps, "webappuri", "/" + webappurl);
		/*
		if (user && user.roles && simpleportal.util.arraycontains(user.roles, 'superadmin')){
			callback();
		} else */
		if(user && user.webapps && userwebapp){
			var wpoauth;
			
			if(userwebapp.permission && typeof userwebapp.permission.length == "number")
				userwebapp.permission.forEach(function(wp){
					if(util.arraycontains(Object.keys(wp), "oauth"))
						wpoauth=wp;
				});
			else if(userwebapp.permission && typeof userwebapp.permission == "object")
				if(util.arraycontains(Object.keys(userwebapp.permission), "oauth"))
					wpoauth=userwebapp.permission;
			
			var useroauth = wpoauth && user.oauth ? user.oauth[wpoauth.oauth[0]] : null;
			
			if(wpoauth && wpoauth.oauth && !(useroauth && useroauth.access_token)) { 
				var errormessage = {webappurl:webappurl, webappid:webappid, redirectUrl:'/oauth/'+wpoauth.oauth[0]+'/login'/*?action='+webappurl*/, exception: "You dont have any user credentials attached to the oauth provider - "+ wpoauth.oauth[0]};
				
				callback(errormessage);
			}else
				callback();
		} else if(user && user.webapps)
			callback('Permission denied');
		else if(user && user.role && user.role == 'superadmin')
			callback();
		else if(user 
			&& user.role
			&& userService.getServiceloader().getService("userrole").getConfigration('userroles')[user.role]
			&& userService.getConfigration('userroles')[user.role].webapps
		){
			var webapps = userService.getServiceloader().getService("userrole").getConfigration('userroles')[user.role].webapps;
			
			if(webapps && simpleportal.util.arraycontains(webapps, webappid))
				callback();
			else if(user.roles && simpleportal.util.arraycontains(user.roles, 'admin')){
				callback();
			} else
				callback('Permission denied');
		} else if(user && (user.role == 'superadmin' || (user.roles && simpleportal.util.arraycontains(user.roles, 'superadmin')))){
			callback();
		} else
			callback('Permission denied');
	}
	
}

/**
 * getUserHome 
 * 
 * @param user 
 * @param defaulthome
 */
userService.getUserHome = function(user, defaulthome){
	if(user 
		&& user.role
		&& userService.getConfiguration('userroles') 
		&& userService.getConfiguration('userroles')[user.role]
		&& userService.getConfiguration('userroles')[user.role].homeurl 
	){
        return userService.getConfiguration('userroles')[user.role].homeurl;
    } else if(user 
		&& user.roles
		&& userService.getConfiguration('userroles') 
		&& userService.getConfiguration('userroles')[user.role]
		&& userService.getConfiguration('userroles')[user.role].homeurl 
	){
        return userService.getConfiguration('userroles')[user.role].homeurl;
    }
		
    return defaulthome;
}

var updateuserRoles = function(){
	userService.getStorageService().clear(function(){});
	var default_user = {
		username:'superadmin', id:'superadmin', profileId:'superadmin',
		email:'superadmin@simpleportaljs.com',
		roles:['admin', 'superadmin'], firstname:'Super', lastname:'administrator', fullname:'Super admin'
	};
	
	userService.getStorageService().count({username:default_user.id}, function(error, count){
		if(count <= 0){
			var passwordtext = (default_user.username + (new Date()).getFullYear());
			if(userService.getPreference("encodepassword")){
				default_user.password = new Encryption(Base64.Public.encode(passwordtext)).encryptText();
			}else
				default_user.password = new Encryption(passwordtext).encryptText();
				
			userService.getStorageService().add_update({id:default_user.id}, default_user, function(error, usersaved){
				if(error)
					userService.getLogger().error("user:updateuserRoles", error);
			})
		}
	});
}

userService.getUserFromuserprofile = function(userprofile, saveduser, callback){
	var dummyrequest = {body:simpleportal.util.extendJSON({ password: 'nologin' }, userprofile)};
	
	var userfromrequest = userService.getObject(dummyrequest);
	
	saveduser = simpleportal.util.extendJSON({}, userfromrequest, saveduser);
	saveduser.id = userService.getObjectId(saveduser);
	
	if(callback)
		callback(null, saveduser);
	else
		return saveduser;
};

/**
 * To create a user profile from user.
 * 
 * @param request
 * @param dbuser
 * @param providerid
 * @param remoteprofile
 * @param callback
 */
var createuserProfilefromUser = function(request, dbuser, providerid, remoteprofile, callback) {
	var userprofiledbquery = {
		emailAddress : dbuser.email,
		username  : dbuser.username
	};
	userprofiledbquery[providerid + "profile.emailAddress"] = remoteprofile.emailAddress;
	
	userService.getLogger().info("user:createuserProfilefromUser", "createuserProfilefromUser - " + providerid);
	
	userService.getServiceloader().getService("system_userprofile").getStorageService().findOne(userprofiledbquery, function(error, dbuserprofile){
		if(dbuserprofile) {
			if(dbuserprofile.oauth && dbuserprofile.oauth[providerid] && dbuserprofile.oauth[providerid].access_token){
				userService.getLogger().warn("user:createuserProfilefromUser", "a userprofile exisits with oauth tokens in db -" + providerid);
				
				callback(error, dbuserprofile);
			} else if(request.session && request.session.oauth && request.session.oauth[providerid] ){
				userService.getLogger().info("user:createuserProfilefromUser", "updating oath details from the session to userprofile  -" + providerid);
				
				var oauth = dbuserprofile.oauth || {};
				
				oauth[providerid] = request.session.oauth[providerid];
				var upobject = {oauth : oauth}
				upobject[providerid + "profile"] = remoteprofile;
				
				userService.getServiceloader().getService("system_userprofile").getStorageService().update({id : dbuserprofile.id}, upobject, callback);
			}	
		} else {
			userService.getLogger().warn("user:createuserProfilefromUser", "user profile has no data with oauth provider emailAddress -" + providerid);
			
			userService.getServiceloader().getService("system_userprofile").getStoredUserprofile(request, dbuser, function(error, saveduserprofile){
				// now update the oauth profile 
				
				var oauth = saveduserprofile.oauth || {};
				
				oauth[providerid] = request.session.oauth[providerid];
				var upobject = {oauth : oauth}
				upobject[providerid + "profile"] = remoteprofile;
				
				userService.getServiceloader().getService("system_userprofile").getStorageService().update({id : saveduserprofile.id}, upobject, callback);
				
//				callback(error, saveduserprofile);
			}, false);
		}	
	});
}

/*
 * Exporting the Sponsor service.
 */
module.exports = userService;