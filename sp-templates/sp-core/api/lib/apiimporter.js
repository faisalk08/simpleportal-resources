"use strict";
var simpleportal = require("simpleportal"),
	events = require('events'),	
	fs = require("fs"),
	ImporterUtil=require('./util'),
	DataImporter=require('./dataimporter'),	
	TemplateUtil=require('simpleportal/lib/template/util');
	
/**
 * Class for importing the api service from a data dump containing csv or xml data
 * @class ApiImporter
 */
var ApiImporter = function(options, serviceloader){
	this.options = simpleportal.util.extendJSON({}, ApiImporter.DEFAULTS, options);
	
	// data type is must
	if(!options.datatype)
		this.options.datatype = simpleportal.util.getExtension(options.file).substring(1);
	
	if(!options.servicename)
		throw new Error("Not a valid Service");
	
	this.serviceprops = {
		servicetype:'plugin', //@TODO when implemented for system or server service, need to enable
		name:options.servicename,
		modify:true, // @can also be asked from the user interface
		remoteservice:false, // @can also be asked from the user interface
		collection:options.servicename,
		plugin:options.plugin,
		modelfields:[], 
		configuration:{},
		primaryKey:'_id', //@can be confirmed with user
		searchqueryparams:[]
	};
	
	this.getServiceloader=function(){
		return serviceloader;
	};
	
    events.EventEmitter.call(this);
    
    var importerInstance=this;
    
//    importerInstance.on("import_data", function(importerInstance){
//    	console.log("API Importer : event : import_data");
//    	importerInstance.import_data(function(){
//    		console.log("Finished importing data - " + importerInstance.options.servicename);
//    	});
//    });
//    
//    simpleportal.serviceloader.on("service."+importerInstance.options.servicename+'.init', function(){
//    	console.log("Service loader service init is called : event : init");
//    	
//    	importerInstance.emit("import_data", importerInstance);
//	});
    
	return this;
}

require("util").inherits(ApiImporter, events.EventEmitter);

ApiImporter.DEFAULTS = {};

/**
 * @Deprocated
 * @method update_service
 * @static
 */
ApiImporter.update_service = function(instance, callback){
	serviceprops.id = instance.getServiceloader().getService("system_apiservice").getObjectId(serviceprops);
	
	instance.getServiceloader().getService("system_apiservice").getStorageService().add_update({id:serviceprops.id}, serviceprops, callback);
}

ApiImporter.update_model = function(instance, callback){
	var serviceprops = instance.serviceprops;
	
	var serviceInstance = instance.getServiceloader().getService(serviceprops.name);
	if(serviceInstance){
		serviceprops.model = serviceInstance.model;
		ImporterUtil.createServiceFile(serviceInstance, function(error, installpath){
			if(!error)
				ImporterUtil.storeService(serviceInstance, {modelfields:serviceprops.modelfields, servicetype:serviceprops.servicetype, name:serviceprops.name}, callback);
			else if(callback)
				callback(error, serviceInstance);
		});
	}else
		callback();
}

ApiImporter.import_data = function(instance, callback){
	var serviceprops = instance.serviceprops;
	var importeroptions = instance.options;
	
	console.log("Importing data - " + serviceprops.name);
	console.log(importeroptions);
	
	var spservice = instance.getServiceloader().getService(serviceprops.name);
	
	if(spservice && spservice.get){
		var dataimporter = new DataImporter(spservice, importeroptions);
		
		dataimporter.import(callback);
		
		dataimporter.on("modelready", function(servicemodel){
			// model 
			console.log("Model ready for import:" + spservice.name);
			console.log(servicemodel);

			spservice.exportConfig(function(error, apiservicedata){
				console.log(apiservicedata);
//				ImporterUtil.updateModel(data, data.name, function(errorm, datam){
//					console.log("callback from model udpate to the db and the file");
//					
//					console.log(error);
//				});
			});
		});

		// callback when import is finished
		dataimporter.on("end_parsed", function(data){
			callback(null, data);
		});
		
		// callback when there is some error
		dataimporter.on("error", function(error){
			callback(error);
		});
		
//		dataimporter.on("record_parsed", function(servicedata){
//			// model 
//			console.log(servicedata);
//			saveRecord(serviceprops.name, servicedata);
//		});
	}else
		callback("Not a valid Service :" + serviceprops.name);
}

//function saveRecord(servicename, record){
//	var request = {};
//	
//	record:getUserprofile=function(){return {}};
//	simpleportal.serviceloader.invoke(servicename, "POST /", {
//		query:{add_update:true},
//		body:record,
//		getUserprofile:function(){return {}}
//	}, function(error, data){
//		if(error){
//			console.log(error);
//			console.log(data);
//		}
//	});
//}
ApiImporter.import_service = function(instance, request, response, callback){
	var serviceprops = instance.serviceprops;
	var filepath = instance.options.file;
	
	request.body = serviceprops;
	request.pathGroup=serviceprops.id = instance.getServiceloader().getService("system_apiservice").getObjectId(serviceprops);
	
	//we need to save the recrd in to the db
	
	var dummyservice = {name:serviceprops.name, model:{}};
	instance.options.saveRecord=false;
	
	var dataimporter = new DataImporter(dummyservice, instance.options);
	
	dataimporter.on("modelready", function(servicemodel){
		console.log("Model ready for import:" + dummyservice.name);
		console.log(servicemodel);
		
		request.body.model=servicemodel;
		request.body.modelfields = TemplateUtil.getFieldFromObject(servicemodel);

//		console.log(request);

		instance.getServiceloader().getService("system_apiservice").cudService.update(request, response, function(error, dbapiservice){
			if(error) {
				console.log(error);
				console.log(dbapiservice);
			}else{
				console.log("API Service is created - " + dbapiservice.id);
				console.log(dbapiservice);
				
				// do call after update for registering the service
				instance.getServiceloader().getService("system_apiservice").emit("afteradd", {
					error:error, servicemodel:dbapiservice
				});
				
				dbapiservice.importeroptions = instance.options;

				//instance.options.saveRecord=true;
				callback(error, dbapiservice);
			}
			//instance.getServiceloader().getService("system_apiservice").afterupdate(error, dbapiservice, callback);
		});
	});

	dataimporter.import(callback);
	
//	var request = {};
//	
//	record:getUserprofile=function(){return {}};
//	simpleportal.serviceloader.invoke(instance.service.name, "POST /", {
//		query:{add_update:true},
//		body:record,
//		getUserprofile:function(){return {}}
//	}, function(error, data){
//		console.log("-----------********----- Data saved["+instance.totalRawCount+"]["+instance.totalRawSavedCount+"]["+data.country+"] ------********-----");
//		
//		if(instance.totalRawCount-1 == instance.totalRawSavedCount++ && instance.end_parsed){
//			instance.service.updateTotalRecords();
//			console.log("-----------********----- Final result is saved ------********-----");
//			
//			instance.emit("end_parsed", {totalRawCount:instance.totalRawCount});
////			callback(null);
//		}
//	});
	
//	simpleportal.serviceloader.system_apiservice.cudService.update(request, response, function(error, dbapiservice){
//		// do call after update for registering the service
//		simpleportal.serviceloader.system_apiservice.emit("afteradd", {
//			error:error, servicemodel:dbapiservice
//		});
//		
//		callback(error, dbapiservice);
//		//simpleportal.serviceloader.system_apiservice.afterupdate(error, dbapiservice, callback);
//	});
}

ApiImporter.prototype.import_data = function(callback){
	var instance = this;

	if(instance.getServiceloader().getService(instance.options.servicename))
		ApiImporter.import_data(instance, function(error, data){
			if(!error){
				ApiImporter.update_model(instance, callback);
			}else if(callback)
				callback(error, data);
		});
	else if(callback)
		callback('No api service found with id  -' + instance.options.servicename);
}

ApiImporter.prototype.import = function(request, response, callback){
	// of the file is valid
	var instance = this;
	
	ApiImporter.import_service(instance, request, response, function(error, data){
		// now call data import

		console.log("Import of api service is finised");
		callback(error, data);
//		instance.import_data(callback);
	});
	
//	simpleportal.serviceloader.on("service."+instance.options.servicename+'.init', function(){
//		console.log("Service init is called ");
//		
//		instance.emit("import_data", instance);
//	});
}

/*
 * Exporting the Api importer service.
 */
module.exports = ApiImporter;