"use strict";

var ViewService = require('simpleportal/lib/service/viewservice'),
	util = require("simpleportal/lib/util");

var profileView = module.exports = new ViewService({
	routerid:"profile"
});

profileView.start = function(appInstance, callback){
	profileView.getServerInstance().get('/profile/', function(request, response, callback) {
		getUserProfile(request, function(error, profile){
			// if user not logged in
			if(error || !profile){
				if(!error)error={};
				error.loginuri = profileView.getServerInstance().getConfiguration('loginuri', '/signin');
			}	
			
			util.sendServiceResponse(response, error, profile);
		});
	});
	
	profileView.getServerInstance().get('/profile', function(request, response, callback) {
		getUserProfile(request, function(error, profile){
			// if user not logged in
			if(error || !profile){
				if(!error)error={};
				error.loginuri = profileView.getServerInstance().getConfiguration('loginuri', '/signin');
			}
			util.sendServiceResponse(response, error, profile);
		});
	});
	
	profileView.getServerInstance().get('/landing', function(request, response, callback, next) {
		getUserProfile(request, function(error, userprofile){
			var redirect_url;
			// if user not logged in
			if(error)
				redirect_url = profileView.getServerInstance().getConfiguration('loginuri', '/signin');
			else if(userprofile && !userprofile.termsofServiceAccepted)
				redirect_url = profileView.getServerInstance().getConfiguration('termsofserviceuri', '/terms-of-service')
			else
				redirect_url = profileView.getServiceloader().getService("user").getUserHome(userprofile, profileView.getServerInstance().getConfiguration('dashboarduri', '/'));
			
			if(redirect_url){
				response.header("Cache-Control", "no-cache");
				
				response.redirect(redirect_url, 302, request);
			} else if(next)
				next();
		});
	});
	
	
	profileView.getServerInstance().get('/logoutall', function(request, response, callback) {
		if(request.getUserprofile() && request.session.sessionID){
			var username = request.getUserprofile().username;
			var express=new RegExp('(?=.*user)(?=.*'+  request.getUserprofile().username +').*');
			var query = {"session":express};
			
			mongoStore.collection.find(query).toArray(function(error, data){
				var sessioncount = data.length;
				for(var i in data){
					var session = JSON.parse(data[i].session);
					
					mongoStore.destroy(session.sessionID, function(){
						if(sessioncount-- <= 1) {
							request.logout();

							response.header("Cache-Control", "no-cache");
							
							response.redirect('/home/', 302, request);
						}
					});
				}
			});
		}else{
			response.header("Cache-Control", "no-cache");
			
			response.redirect('/home/', 302, request);
		}
	});
	
	appInstance.get('/terms-of-service', function(request, response, callback) {
		// check u have term
		var user = request.getUserprofile();

		response.header("Cache-Control", "no-cache");
		
		if(!user)
			util.sendServiceResponse(response, 'Please login to proceed', null);
		else if(user.termsofServiceAccepted)
			response.redirect(appInstance.getConfiguration('userlandinguri', '/landing'), 302, request);
		
		else response.redirect(appInstance.getConfiguration('userlandinguri', '/view/userprofile/terms-of-service'), 302, request);
	});
	
	profileView.getServerInstance().post('/terms-of-service', function(request, response, callback) {
		var user = request.getUserprofile();
		
		if(user && (request.body.accept == 'on' || request.body.accept=='true')){
			profileView.getServiceloader().getService('system_userprofile').updateTermsOfService(request, function(error, data){
				var redirect_url = profileView.getServiceloader().getService('system_user').getUserHome(user, appInstance.getConfiguration('userlandinguri', '/landing'));
				
				if(user.resetpassword)
					redirect_url = redirect_url + '#changepassword';
			
				response.header("Cache-Control", "no-cache");
				response.redirect(redirect_url, 302, request);
			});
		}else
			util.sendServiceResponse(response, 'Please accept the terms of service to proceed', {});
	});
	
	profileView.getServerInstance().post('/profile/language', function(request, response, callback) {
		var languageId = request.body.languageId || request.query.languageId || 'en';
		
		if(request.getUserprofile()){
			request.getUserprofile().languageId=languageId;
			
			profileView.getServiceloader().getService('system_userprofile').updatePreference(request, {languageId:languageId}, function(error, preference){
				util.sendServiceResponse(response, null, preference);
			});
		}else
			util.sendServiceResponse(response, 'Please login to proceed', null);
	});
	
	profileView.getServerInstance().get('/profile/preference', function(request, response, callback) {
		getUserProfile(request, function(error, userprofile){
			util.sendServiceResponse(response, error, userprofile);
		});
	});
	
	profileView.getServerInstance().post('/profile/preference', function(request, response, callback) {
		var newpreference = request.body.preference||{};
		
		var colorskin = request.body.colorskin || request.query.colorskin;
		var languageId = request.body.languageId || request.query.languageId;
		
		if(colorskin && !newpreference.colorskin)
			newpreference.colorskin = colorskin;
		
		if(languageId && !newpreference.languageId)
			newpreference.languageId = languageId;
			
		if(request.getUserprofile()){
			profileView.getServiceloader().getService('system_userprofile').updatePreference(request, newpreference, function(error, preference){
				util.sendServiceResponse(response, null, preference);
			});
		}else
			util.sendServiceResponse(response, 'Please login to proceed', null);
	});
	
	profileView.getServerInstance().post('/restart', function(request, response, callback) {
		if(request.getUserprofile() && request.getUserprofile().role == 'superadmin')
			profileView.getServerInstance().emit('shutdown');
		else
			util.sendServiceResponse(response, 'You are not allowd do Administrative changes');
	});

	if(callback)callback();
};

/**
 * Getting the user profile
 * 
 * @param request
 * @param callback
 * @returns
 */
function getUserProfile(request, callback){
	callback(null, request.getUserprofile());
}

/**
 * To get the detailed user profile including the webapps, user preference
 * @param request
 * @param callback
 */
function getDetailedUserProfile(request, callback){
	passportService.getServiceloader().getService('system_userprofile').getUserprofile(username, callback);
}