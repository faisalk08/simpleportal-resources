var simpleportal = require("simpleportal"),
	google = require('googleapis'),
	fs = require("fs"),
	GoogleAPI = require('./lib/googleapi');

/**
 * Google api instance for accessing and interacting with google api services.
 */
var googleAPIInstance, 
	applicationFolder;

/**
 * API Service for notification 
 */
var googleapiService = new simpleportal.Service.CRUDService({
	collection:'googleapi', 
	name:'googleapi',
	primaryKeyFields:['title'], scheduler:true,
	preferencesetting:{
		googleoauth2client:{
			clientId:'', clientSecret:'',
			scopes:[], 
			loginscopes:[
               'https://www.googleapis.com/auth/plus.login'
            ]
		}, emailconfig : {
			adminEmail:'',
			fromEmail:'',
			fromName:''
		}, enablebackup:false
	}
});

googleapiService.get("/registercallback", function(request, response, callback){
	if(googleAPIInstance)
		googleAPIInstance.registerAccount(request.query.code, function(error, message){
			response.redirect("/sp-admin", 302, request);
		});
	else
		callback("Not able to find the google api instance to register");
});

/**
 * To revoke the oauth accesstoken from the server.
 */
googleapiService.get("/unregister", function(request, response, callback){
	if(googleAPIInstance)
		googleAPIInstance.unregisterAccount(function(error, url){
			if(!error){
				googleapiService.removeSavedPreference("googleoauth2client.token", function(){
					response.redirect("/sp-config", 302, request);
				});
			}else
				callback(error);
		});
	else
		callback("Not able to find the google api instance to register");
});

/**
 * To register the google account and save it in to applciation preference.
 */
googleapiService.get("/register", function(request, response, callback){
	if(googleAPIInstance)
		googleAPIInstance.registerAccount(null, function(error, url){
			if(error)
				callback(error);
			else
				response.redirect(url, 302, request);
		});
	else
		callback("Not able to find the google api instance to register");
});

/**
 * @Method("saveFileToGoogle");
 * @schedulable(true);
 * @display("Save file to google drive");
 */
googleapiService.saveFileToGoogle=saveFileToGoogle;

var getApplicationFolder = function(foldername){
	if(!applicationFolder)
		return null;
	
	if(foldername)
		return applicationFolder[foldername]
	else	
		return applicationFolder["root"];
};
	
/**
 * {file:zip file,  filefullpath:fullpath}
 */
function saveFileToGoogle(request, response, callback, configuration){
	if(googleAPIInstance && googleAPIInstance.authenticated) {
		if(!response && request)
			configuration = request;
		
		var fileinfo = configuration;
		if(typeof fileinfo == 'object' && fileinfo.pluginmodel && fileinfo.pluginmodel.zip_archive){
			fileinfo = fileinfo.pluginmodel.zip_archive;
			fileinfo.parentfolder = getApplicationFolder("plugin");
		}else if(typeof fileinfo == 'object' && fileinfo.servicemodel && fileinfo.servicemodel.zip_archive){
			fileinfo = fileinfo.servicemodel.zip_archive;
			fileinfo.parentfolder = getApplicationFolder("apiservice");
		}else if(typeof fileinfo == 'object' && fileinfo.servicemodel && fileinfo.servicemodel.file){
			fileinfo = fileinfo.servicemodel;
			fileinfo.parentfolder = getApplicationFolder(request || "apiservice");
		}
		
		if(fileinfo){
			var filetosearch = fileinfo.file;
			if(filetosearch.lastIndexOf("_") != -1)
				filetosearch = filetosearch.substring(0, filetosearch.lastIndexOf("_"));
			
			//search using url query for drive query
			var searchq = {q:'trashed=false and title="'+filetosearch+ '" and mimeType="application/zip"'};
			var fileprops = {
				resource : {
					'description' : 'Simpleportal server database backup',
					'title' : filetosearch,
					'mimeType' : "application/zip"
				}, file:fileinfo.fullpath
			};

			if(filetosearch.indexOf(".csv") != -1) {
				fileprops.resource.mimeType='application/vnd.google-apps.spreadsheet';
				fileprops.mimeType='text/csv';
				
				fileprops.resource.convert=true;
				searchq = {q:'trashed=false and title="'+filetosearch+ '" and mimeType="application/vnd.google-apps.spreadsheet"'};
			}
			
			if(fileinfo.parentfolder){
				fileprops.resource.parents = searchq.parents = [fileinfo.parentfolder];
			}
			var gDrive = googleAPIInstance.getGDrive();
			
			gDrive.fileDetails(searchq, function(error, savedfile){
				if(savedfile){
					console.log("A file in google drive found with - " + filetosearch + ":" +savedfile.id);
					console.log(savedfile);
				}
				
				if(savedfile && savedfile.id){
					fileprops.fileId=savedfile.id;
				}
				
				gDrive.insertFile(fileprops, function(error, data){
					if(error)
						console.log(error);
					else {
//						if(fs.existsSync(fileinfo.fullpath))
//							fs.unlinkSync(fileinfo.fullpath);
					}
				});
			});	
		}else {
			console.log(fileinfo);
			console.log(arguments);
		}
	} else{
		console.log("Google account is not configured to save the file")	
	}
} 

/**
 * To backup the configuration
 * 
 * @param request http request 
 * @param response http response 
 * @param callback if needed
 * @param callback to callback 
 * @param configuration Configuration of the field being backed up {file, fullpath}
 */
function backupConfiguration(request, response, callback, configuration) {
	var systemfiles = request;
	
	if(googleAPIInstance && googleAPIInstance.authenticated){	
		if(typeof configuration == 'object' && configuration.file && configuration.fullpath){
			var folder = request;
			if(typeof request == "string")
				folder = request;
			
			if(fs.existsSync(configuration.fullpath)){
				saveFileToGoogle({file:configuration.file, fullpath:configuration.fullpath, parentfolder:getApplicationFolder(folder||"npm")}, callback);
			}
		} else if(typeof systemfiles == 'object' && systemfiles.file && systemfiles.fullpath){
			var backuppath = simpleportal.util.getServerPath('./dump/');
			for(var i in systemfiles){
				var backupfilepath = backuppath + '/' + systemfiles[i] + '.tar.gz';
				
				if(fs.existsSync(backupfilepath)){
					saveFileToGoogle({file:systemfiles[i]+ '.tar.gz', fullpath:backupfilepath, parentfolder:getApplicationFolder(folder||"npm")}, callback);
				}
			}	
		}
	}else
		console.log("Google api not configured.");
}

var sendLoginEmail = function(){
	if(arguments && arguments.length >= 3){
		var loginuser = arguments[3];
		
		sendEmail({to:'me', subject:'A user logged in to - ' + getApplicationName(), text:'A user {'+ loginuser.username +'} logged in to - ' + getApplicationName()});
	}
};

var sendEmail = function(emailprops){
	if(googleAPIInstance && googleAPIInstance.authenticated){
		var gmailOptions = simpleportal.util.extendJSON({fromName:getApplicationName()}, googleapiService.getServiceloader().getPreference({name:"googleapi"}, "emailconfig"));
		var gMail = googleAPIInstance.getGMail(gmailOptions);
		
		gMail.sendEmail(emailprops);
	}else
		console.log("gmail not configured.")
};

googleapiService.sendLoginEmail = sendLoginEmail;
googleapiService.sendEmail = sendEmail;

googleapiService.backupConfiguration = backupConfiguration;

googleapiService.on("startup", function(configuration, callback){
	setupGoogleAPI();
	
	/**
	 * @Method("simpleportal.npm.backup");
	 * @apiservice("backup");
	 * @events("simpleportal.npm.backup");
	 * @action({"apiservice":"googleapi","action":"backupConfiguration", "servicemodel":"npm"});
	 * @listener(true);
	 * @display("Google Drive - Simpleportal npm backup listener");
	 */
	//backupConfiguration(['simpleportal-npm'], callback, "npm");
	
	/**
	 * @Method("simpleportal.resources.backup");
	 * @apiservice("backup");
	 * @events("simpleportal.resources.backup");
	 * @action({"apiservice":"googleapi","action":"backupConfiguration", "servicemodel":"resources"});
	 * @listener(true);
	 * @display("Google Drive - Simpleportal resources backup listener");
	 */
	//backupConfiguration(['simpleportal-resources'], callback, "resources");
		
	/**
	 * @Method("simpleportal.server.backup");
	 * @apiservice("backup");
	 * @events("simpleportal.server.backup");
	 * @action({"apiservice":"googleapi","action":"backupConfiguration", "servicemodel":"server"});
	 * @listener(true);
	 * @display("Google Drive - Simpleportal server backup listener");
	 */
	//backupConfiguration(['server'], callback, "server");
	
	/**
	 * @Method("plugin.backup.listener");
	 * @apiservice("pluginloader");
	 * @events("plugin.backup");
	 * @action({"apiservice":"googleapi","action":"saveFileToGoogle"});
	 * @listener(true);
	 * @display("Google Drive - Plugin backup listener");
	 */
//	simpleportal.pluginloader.on("plugin.backup", function(plugindata){
//		if(plugindata && plugindata.pluginmodel ){
//			var dbbackupinfo = plugindata.pluginmodel;
//			
//			saveFileToGoogle({file:dbbackupinfo.zip_archive.file, fullpath:dbbackupinfo.zip_archive.fullpath, parentfolder:googleapiutil.getApplicationFolder("plugin")}, callback);
//		}
//	});
	
	/**
	 * @Method("service.backup.listener");
	 * @apiservice("serviceloader");
	 * @events("service.backup");
	 * @action({"apiservice":"googleapi","action":"saveFileToGoogle"});
	 * @listener(true);
	 * @display("Google Drive - Service backup listener");
	 */
//	simpleportal.serviceloader.on("service.backup", function(servicedata){
//		if(servicedata && servicedata.servicemodel ){
//			var dbbackupinfo = servicedata.servicemodel;
//			
//			saveFileToGoogle({file:dbbackupinfo.zip_archive.file, fullpath:dbbackupinfo.zip_archive.fullpath, parentfolder:googleapiutil.getApplicationFolder("apiservice")}, callback);
//		}
//	});
	
	/**
	 * @Method("service.export.listener");
	 * @apiservice("serviceloader");
	 * @events("service.export.csv");
	 * @action({"apiservice":"googleapi","action":"saveFileToGoogle", "servicemodel":"apiservice-sync"});
	 * @listener(true);
	 * @display("Google api - API export service csv sync");
	 */
	
	/**
	 * @Method("user.login");
	 * @apiservice("user");
	 * @events("user.login");
	 * @action({"apiservice":"googleapi","action":"sendLoginEmail"});
	 * @listener(true);
	 * @display("Google Email Notification - Service backup listener");
	 */
	registerLogin(callback);
});

function getApplicationName(){
	return 'SP-WS-' + googleapiService.getServerInstance().getConfiguration("host") ;
}

/**
 * Create backup and configuration directory for google drive
 */
function setupGDrive(callback){
	if(googleAPIInstance && googleapiService.getPreference("enablebackup")){
		var gDrive = googleAPIInstance.getGDrive();
		
		googleapiService.getServiceloader().getSavedPreference({name:"googleapi"}, "gdrive.backup", function(error, savedpreference){
			if(savedpreference && savedpreference.preference){
				applicationFolder = savedpreference.preference;
			}else {
				gDrive.createFolder({
					resource:{
						description:'Application folder for simpleportal webapp',
						title:getApplicationName()
					}
				}, function(error, data){
					if(error) {
						console.log(error);
					} else {
						applicationFolder={root:{id:data.id}};
						
						gDrive.createFolders({
							resource:[
							    {
									description:'API service',
									title:'apiservice'
								},{
									description:'Plugin',
									title:'plugin'
								},{
									description:'npm modules',
									title:'npm'
								},{
									description:'Server',
									title:'server'
								},{
									description:'API Service sync',
									title:'apiservice-sync'
								}, {
									description:'sp resources',
									title:'resources'
								}
							],
							parents:[applicationFolder.root]
						}, function(error, gfolderdata){
							
							if(gfolderdata)
								simpleportal.util.extendJSON(applicationFolder, gfolderdata);
							
							// now set this up to the saved preference
							googleapiService.savePreference({title:'Google drive backup configuration.', key:"gdrive.backup", preference:applicationFolder}, callback)
						});
					}
					
					if(callback)
						callback();
				});
			}
		});
	}
}

/**
 * To set up google api
 * 
 * @param callback
 */
function setupGoogleAPI(callback){
	var googleOauthPreference = googleapiService.getPreference("googleoauth2client", {});
	googleOauthPreference.apicallback = googleapiService.getServerInstance().getServerUrl('/api/googleapi/registercallback')
	
	if(!googleAPIInstance) {
		googleapiService.getServerInstance().registerServerAction({action:'setupgoogleapi', url:googleapiService.getApiUrl('/register')});
		googleapiService.getServerInstance().registerServerAction({action:'removegoogleapi', url:googleapiService.getApiUrl('/unregister')});
		
		googleapiService.getSavedPreference("googleoauth2client.token", function(error, savedpreference){
			googleAPIInstance = googleapiService.googleAPIInstance = new GoogleAPI({
				configuration:googleOauthPreference,
				preference: (savedpreference&&savedpreference.preference ? savedpreference.preference:{}),
				onAuthenticated:function() {
					googleapiService.googleAPIInstance = googleAPIInstance = this;
					
					setupGDrive();
					
					sendEmail({to:'me', subject:'Simpleportal- server - ' + getApplicationName(), text:'An application name - ' + getApplicationName() + "is using your google account for notification and backup."});
					
					googleapiService.emit('googleapi.ready', googleAPIInstance);
					
					googleapiService.getServerInstance().removeServerAction('setupgoogleapi');
				}, onPreferenceChange:function(tokens){
					if(tokens.token)
						googleapiService.savePreference({
							title:'Google api permission for email and google drive.', 
							key:"googleoauth2client.token", 
							preference:tokens.token
						}, callback);
				}
			});
		});
	}	
}

function registerLogin(){
	var provider = "google";
	var gpreference = googleapiService.getPreference("googleoauth2client");
	
	if(gpreference && gpreference.loginscopes) {
		var oauthloader = googleapiService.getPluginloader().getContext("oauthloader");
		var gprovider = oauthloader.getOauthProvider(provider);
		
		var consumerprops = {
			oauth2 : true,
			accessUrl : "o/oauth2/auth", 
			authorizeUrl:"o/oauth2/token",
			oauthHost : 'https://accounts.google.com/', 
			secure:true,
			profileUrl:'https://www.googleapis.com/plus/v1/people/me',
			consumerKey:gpreference.clientId, consumerSecret:gpreference.clientSecret,
			params:{
				scope:gpreference.loginscopes.filter(function(scope){return scope&&scope!=''}), 
				response_type:'code', 
				redirect_uri:gprovider.getAuthorizeCallbackUrl()
			}
		};
		gprovider.setConfiguration(consumerprops, null, true);
		
		delete oauthloader.oauthproviders[provider];
		oauthloader.registerProvider(provider, gprovider.getConfiguration());
		
		oauthloader.addUrlHandle('/oauth/google/logincallback', function(request, response, next, _provider) {
			if(!request.getUserprofile()) {
				oauthloader.call(provider, "getProfile", request, response, function(error, remoteprofile){
					if(error) {
						simpleportal.util.sendServiceResponse(response, error);
					}else {
						if(remoteprofile.name && remoteprofile.name.givenName)
							remoteprofile.firstname = remoteprofile.name.givenName;
						
						if(remoteprofile.name && remoteprofile.name.familyName)
							remoteprofile.lastname = remoteprofile.name.familyName;
						
						remoteprofile.username = remoteprofile.email = remoteprofile.id + "@"+provider+".com";
						
						googleapiService.getServiceloader().getService("system_user").oauthLogin(request, provider, remoteprofile, function(error, loggedinuser, info){
							var startuploader = googleapiService.getServerInstance().getRouter("startuploader");
							var passportService = startuploader.getRouter("passport");
							
							passportService.loginCallback(request, response, error, loggedinuser, info);
						});
					}
				});
			} else
				next();
		});
	}
}

//var drivelink = "https://drive.google.com/open?id=0B298XucM0iRBT2dsbHBYUGV0Q1k";
module.exports = googleapiService;