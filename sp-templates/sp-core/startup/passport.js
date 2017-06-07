"use strict";

var StartupService = require('simpleportal/lib/service/startupservice'),
	passport = require('simpleportal/node_modules/passport'),
	connect = require('simpleportal/node_modules/connect'),
	LocalStrategy = require('simpleportal/node_modules/passport-local').Strategy,
	MongoStore = require('simpleportal/node_modules/connect-mongo')(connect),
	util = require("simpleportal/lib/util");

var passportService = module.exports = new StartupService({
	routerid:"passportlogin"
});

/**
 * Overriding start method to activate the profile base don the passport also various 
 * 
 * @method  start
 * @param 
 */
passportService.start = function(appInstance, callback){
	passport.use(new LocalStrategy(
		{
			passReqToCallback:true,
			usernameField: 'username',
			passwordField: 'password'
		},
		function(request, username, password, done) {
			process.nextTick(function () {
				// validating the user name and password across the user database
				passportService.getServiceloader().getService('system_user').login(request, { username: username, password: password}, function(error, user, info){
					return done(error, user, info);
				});
			});
		}
	));

	passport.serializeUser(function(user, done) {
		delete user.password;
		
		done(null, user.username);
	});

	passport.deserializeUser(function(username, done) {
		passportService.getServiceloader().getService('system_userprofile').getUserprofile(username, function (error, user) {
			done(error, user);
		});
	});
	
	/**
	 * already added favicon and static dirs
	 */
	var configuration = passportService.getServerInstance().getConfiguration();
	var options = {
		collection:'connect_sessions', autoReconnect:true
	};
	if(configuration.db.mongodb) {
		options.port = configuration.db.mongodb.port;
		options.host = configuration.db.mongodb.host;
		options.db   = configuration.db.mongodb.dbName;
		
		if(configuration.db.mongodb.user&&configuration.db.mongodb.password){
			options.username = configuration.db.mongodb.user;
			options.password = configuration.db.mongodb.password;
			options.authdb   = configuration.db.mongodb.authdb;
		}
	}	
	
	options.clear_interval=60;
	
	passportService.getServerInstance().server.use(connect.cookieParser('keyboard cat'));
	passportService.getServerInstance().server.use(connect.bodyParser());
	passportService.getServerInstance().server.use(connect.query());
	
	var mongoStore = new MongoStore(options);
	
	var sessionid_key = configuration.host + '.ssid';
	if(!configuration.hidePort)
		sessionid_key = sessionid_key + ':' + configuration.port;
	
	configuration.session_id = util.getHash(sessionid_key);
	
	passportService.getServerInstance().server.use(connect.session({
		name:configuration.session_id,
		store: mongoStore
	}));
	
	passportService.getServerInstance().server.use(passport.initialize());
	passportService.getServerInstance().server.use(passport.session());
	
	/**
	 * Include certain links not accessible if logged in
	 */
	passportService.getServerInstance().getServer().use(passportService.getServerInstance().getConfiguration("loginuri"), profileCheck);
	
	passportService.getServerInstance().getServer().use('/login', profileCheck);
	
	if(passportService.getServerInstance().getRouter("oauthloader"))
		passportService.getServerInstance().getRouter("oauthloader").addUrlHandle('/oauth/:provider/logincallback', function(request, response, next, provider) {
			if(!request.getUserprofile()) {
				passportService.getServerInstance().getRouter("oauthloader").call(provider, "getProfile", request, response, function(error, remoteprofile){
					if(error) {
						passportService.getLogger().error(passportService.routerid,  "error while accessing the remote profile");
						passportService.getLogger().error(passportService.routerid,  error);
						
						util.sendServiceResponse(response, error);
					}else {
						passportService.getServiceloader().getService("system_user").oauthLogin(request, provider, remoteprofile, function(error, loggedinuser, info){
							loginCallback(request, response, error, loggedinuser, info);
						});
					}
				});
			} else
				next();
		});
	/**
	 * login using passport
	 */
	passportService.getServerInstance().post('/login', function(request, response, callback) {
		passport.authenticate('local', function(error, userprofile, info) {
			loginCallback(request, response, error, userprofile, info);
		})(request, response, callback);
	});
	
	passportService.getServerInstance().get('/logout', function(request, response, callback) {
		mongoStore.destroy(request.sessionID, function(){
			request.logout();
			request.session.destroy();
			
			response.header("Cache-Control", "no-cache");
			
			response.redirect(passportService.getServerInstance().getConfiguration('landinguri', '/landing'), 302, request);
		});
	});
	
	if(callback)
		callback();
}

function loginCallback(request, response, error, userprofile, info){
	var referingurl = request.headers.referer;
	
	if (error) {
		util.sendServiceResponse(response, error);
    }else if(!userprofile) {
    	if(info && (info.status == 401 || info.status == 403)){
    		response.redirect(referingurl||"/landing", null, request);
    	} else
			util.sendServiceResponse(response, "Some technical problem, not able to find the logged in user, please try again after some time");
    }else {
		if(!error && userprofile){
			request.logIn(userprofile, function(error) {
		    	if (error) {
		    		util.sendServiceResponse(response, error);
		    	}else{
		    		setSession(request, request.body);
		    		
		    		var referingurl = referingurl || passportService.getServerInstance().getConfiguration('userlandinguri', '/landing');

		    		if(referingurl == '/api/profile'){
		    			util.sendServiceResponse(response, null, userprofile);
		    		}else{
		    			redirectToUserHome(referingurl, request, response);
		    		}
		    	}
		    });
		}else
			util.sendServiceResponse(response, error||"Some technical problem, not able to find the logged in user, please try again after some time");
    }
}

/**
 * Redirect a user to the default user home page.
 * 
 * @param redirecturl
 * @param request
 * @param response
 */
function redirectToUserHome(redirecturl, request, response){
	if(request.isAuthenticated()){
		var userprofile = request.getUserprofile();
		
		redirecturl = passportService.getServiceloader().getService('system_user').getUserHome(userprofile, redirecturl);
	    
		if(userprofile.resetpassword)
			redirecturl = redirecturl + '#changepassword';
	}

	/**
	 * @TODO check the response content type if it is json or xml format please send the profile data 
	 */
	if(redirecturl){
		response.header("Cache-Control", "no-cache");
		
		response.redirect(redirecturl, 302, request);
	}else
		util.sendServiceResponse(response, null, {redirectUrl : '/landing'});
}

/**
 * Copy certain parameter from the current request to the session so that the user session can be able to track the address in which the user is accessing the service 
 * only call this after the login
 * 
 * @param request
 */
function setSession(request, props){
    if(request.isAuthenticated() && request.session){
    	// if props has remember me enabled
    	if ( props && props.remember ) {
	      	request.session.cookie.maxAge = 30*24*60*60*1000;
	    }else
	        request.session.cookie.expires = false;
		
        request.session.remoteAddress = request.connection.remoteAddress;
        request.session.userAgent = request.headers['user-agent'];
    }
}

function profileCheck(request, response, next){
	var userprofile = request.getUserprofile();
	if(request.isAuthenticated()){
		var redirect_url = passportService.getServiceloader().getService('system_user').getUserHome(userprofile, redirect_url);
        
		if(userprofile.resetpassword)
			redirect_url = redirect_url + '#changepassword';
	
		util.sendServiceResponse(response, null, {redirectUrl:redirect_url});
	}else if(next)
		next();
}

passportService.loginCallback = loginCallback;
