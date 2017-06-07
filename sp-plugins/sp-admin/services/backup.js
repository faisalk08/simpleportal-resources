"use strict";

var simpleportal = require("simpleportal"),
	fs = require("fs");

var backupService = new simpleportal.Service.CRUDService({
	collection:'backup', 
	name:'backup',
	primaryKeyFields:['title'], 
	modify:false, 
	scheduler:true,
	model:{
		title:''
	}
});

/**
 * @Method("servicebackup");
 * @schedulable(true);
 * @cron("0-5-31-2-S");
 * @display("API-Service-backup");
 */
backupService.servicebackup = function(servicename, disableNotification) {
	var backupath = backupService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backupath = simpleportal.util.getServerPath(backupath + "/apiservice");

	// creating backup of the application db
	// it is specific to the installation __ we need to pass the mongodump path it works for unix based OS
	var dboptions = {
		backupath : backupath,
		disableNotification : disableNotification, 
		dumptool : '/usr/local/server/mongodb/bin/mongodump'
	};
	
	var _service = backupService.getServiceloader().getService(servicename);
	
	if(_service)
		_service.backup(dboptions, function(error, backupinfo){});
	else
		console.log("No service defined - " + servicename);
}

/**
 * @Method("serviceexport");
 * @schedulable(true);
 * @cron("0-5-31-2-S");
 * @display("API Service-data-export");
 */
backupService.serviceexport = function(servicename, disableNotification) {
	var serviceInstance = backupService.getServiceloader().getService(servicename);
	
	if(serviceInstance){
		serviceInstance.exportToFile({datatype:'csv'});
	} else
		console.log("No service defined - " + servicename);
}

/**
 * @Method("pluginbackup");
 * @schedulable(true);
 * @cron("0-5-31-2-S");
 * @display("Plugin-backup");
 */
backupService.pluginbackup = function(pluginid, disableNotification) {
	var backupath = backupService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backupath = simpleportal.util.getServerPath(backupath + "/plugin");

	var dboptions = {
		backupath : backupath,
		pluginid  : pluginid, 
		disableNotification : disableNotification,
		dumptool	: '/usr/local/server/mongodb/bin/mongodump'
	};
	
	backupService.getPluginloader().backup(dboptions, function(error, backupinfo){});
}

/**
 * @Method("bulkservicebackup");
 * @schedulable(true);
 * @cron("1-0-S-S-S");
 * @display("Bulk-API-Service-backup");
 */
backupService.bulkservicebackup = function(servicename) {
	console.log(new Date() + " - Running bulkservicebackup funciton and storing it in to google drive");

//	backupService.servicebackup('system_user', false);
	var services = backupService.getServiceloader().getRouters();
	
	for(var serviceName in services){
		backupService.servicebackup(serviceName, false);
	}
}

/**
 * @Method("bulkpluginbackup");
 * @schedulable(true);
 * @cron("1-0-S-S-S");
 * @display("Bulk-API-Plugin-backup");
 */
backupService.bulkpluginbackup = function(pluginid) {
	console.log(new Date() + " - Running bulkpluginbackup funciton and storing it in to google drive");

	var webapps = backupService.getPluginloader().getPlugins("webapp");
	
	for(var pindex in webapps){
		backupService.pluginbackup(webapps[pindex].id, false);
	}
}

///**
// * @Method("plugininstaller");
// * @schedulable(true);
// * @cron("1-0-S-S-S");
// * @display("Plugin-installer");
// */
//backupService.plugininstaller = function() {
//	console.log(new Date() + " - Running bulkpluginbackup funciton and storing it in to google drive");
//
//	var downloaddrir = backupService.getServerInstance().getConfiguration("resources").downloaddir;
//	if(fs.existsSync(downloaddrir)){
//		simpleportal.util.getResources(
//			[downloaddrir + '/plugin/'],
//			{
//				root:(downloaddrir + '/plugin/'),
//				extensoin:'tar.gz',
//				excludeDir:true
//			}
//			, function(error, plugindownloads){
//				backupService.getPluginloader().install(plugindownloads)
//			},[]
//		);
//	}
//}

/**
 * @Method("simpleportalbackup");
 * @schedulable(true);
 * @cron("1-0-S-S-S");
 * @display("Simpleportal-module-backup");
 */
backupService.simpleportalbackup = function(pluginid) {
	var backuppath = backupService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backuppath = simpleportal.util.getServerPath(backuppath + "/npm");
	
	simpleportal.util.checkDirSync(backuppath);
	
	console.log("INFO:>> registring the npm module - " + simpleportal.rootdir);
	
	simpleportal.util.archiveFolder({
		rootdir : simpleportal.rootdir, 
		archive : backuppath + '/simpleportal-npm.tar.gz', 
		exclude : ['archives/*', 'node_modules/*', 'test/*', 'doc/*', 'default_/*', ".git/*", "example/*", "*/._temp/*", "apidoc/*"]
	}, function(error, data, data1){
		if(!error){
			backupService.emit("simpleportal.npm.backup", {
				file:'simpleportal-npm.tar.gz', 
				fullpath:backuppath + '/simpleportal-npm.tar.gz'
	//			zip_archive:{fullpath:backuppath+'/simpleportal-npm.tar.gz', file:'simpleportal-npm.tar.gz'}
			});
		} else
			console.log(error);
	});
}

/**
 * @Method("simpleportalresourcebackup");
 * @schedulable(true);
 * @cron("1-0-S-S-S");
 * @display("Simpleportal-resource-backup");
 */
backupService.simpleportalresourcebackup = function(pluginid) {
	var backuppath = backupService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backuppath = simpleportal.util.getServerPath(backuppath + "/npm");
	
	simpleportal.util.checkDirSync(backuppath);
	
	console.log("INFO:>> Backing up - " + simpleportal.rootdir);
	
	var serverresourcefdir = simpleportal.util.appendFilePath(simpleportal.rootdir, "server/resources");
	
	simpleportal.util.archiveFolder({
		rootdir : serverresourcefdir, 
		archive : backuppath + '/simpleportal-resources.tar.gz', 
		exclude : ['archives/*', 'node_modules/*', 'test/*', 'doc/*', 'default_/*', ".git/*", "example/*", "*/._temp/*", "apidoc/*"]
	}, function(error, data, data1){
		if(!error){
			backupService.emit("simpleportal.resources.backup", {
				file:'simpleportal-resources.tar.gz', 
				fullpath:backuppath + '/simpleportal-resources.tar.gz'
			});
		} else
			console.log(error);
	});
}

/**
 * @Method("serverbackup");
 * @schedulable(true);
 * @cron("1-0-S-S-S");
 * @display("Server-backup");
 */
backupService.serverbackup = function(pluginid) {
//	var backuppath = simpleportal.util.getServerPath('./dump/server');
//	simpleportal.util.checkDirSync(backuppath);
	var backuppath = backupService.getServerInstance().getConfiguration("resources").backupdir || "./._dump";
		backuppath = simpleportal.util.getServerPath(backuppath + "/server");
	
	simpleportal.util.checkDirSync(backuppath);
	
	console.log("backuppath >> " + backuppath);
	
	simpleportal.util.archiveFolder({
		rootdir : simpleportal.util.getServerPath(""), 
		archive : backuppath + "/server.tar.gz", 
		exclude : ["serverlog/*", "dump/*", "data/*", "license/*", "node_modules/*", "*.zip", "*.tar.gz"]
	}, function(error, data){
		console.log(data);
		if(!error){
			backupService.emit("simpleportal.server.backup", {
				file:'server.tar.gz', fullpath:backuppath + '/server.tar.gz'
//				zip_archive:{fullpath:backuppath+'/simpleportal-npm.tar.gz', file:'simpleportal-npm.tar.gz'}
			});
		}else
			console.log(error);
	});
}

backupService.run = function(){};

//backupService.onStartup = function(config, callback){
//	// register the google drive backup
//	callback();
//}
module.exports = backupService;