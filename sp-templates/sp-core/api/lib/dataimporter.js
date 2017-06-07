"use strict";
var simpleportal = require("simpleportal"),
	fs = require("fs"),
	events = require('events'),	
	ImporterUtil=require('./util'),	
	TemplateUtil=require('simpleportal/lib/template/util');

//console.log(ImporterUtil);

/**
 * @class DataImporter
 * Importer class for importing data bundled in csv or xml to an api service
 * 
 */
var DataImporter = function(service, options){
	this.options = simpleportal.util.extendJSON({}, DataImporter.DEFAULTS, options);
	
	// data type is must
	if(!options.datatype)
		this.options.datatype = simpleportal.util.getExtension(options.file).substring(1);
	
	if(!service)
		throw new Error("Not a valid Service");
	else
		this.service=service;
	
	// get the file delimeter for csv file
	if(options.csvdelimiter)
		this.options.csv_props.delimiter=options.csvdelimiter;
	
	if(options.csvquote)
		this.options.csv_props.quote=options.csvquote;
	
	events.EventEmitter.call(this);

	this.getServiceloader=function(){
		return this.service.getServiceloader();
	};
	
	this.totalRawCount = 0;
	this.totalRawSavedCount = 0;
	this.end_parsed = false;
	
//	this.on("object_formatted", function(data){
//		this.saveRecord(data);
//	});
	
	return this;
}

require("util").inherits(DataImporter, events.EventEmitter);

DataImporter.DEFAULTS = {
	saveRecord:false,
	csv_props:{fork:false, workerNum:1, delimiter:',', constructResult:false}
};

DataImporter.IMPORTER_FUNCTION = {};

DataImporter.IMPORTER_FUNCTION['json'] = function(service, filepath, props, callback){
	if(!fs.existsSync(filepath))
		callback();
	else {
		simpleportal.util.readJSONFile(filepath, function(error, jsondata){
			if(error)
				callback(error);
			else{
				var arrayresults;
				// row check it is json object or array
				if(typeof jsondata.length == "number")
					arrayresults = jsondata;
				else if(Object.keys(jsondata).length == 1){
					var root = Object.keys(jsondata)[0];
					//console.log(jsondata[root]);
					if(typeof jsondata[root] == "object" && typeof jsondata[root].length == "number"){
						arrayresults = jsondata[root];
					}else if(typeof jsondata[root] == "object" && Object.keys(jsondata[root]).length == 1){
						var subroot = Object.keys(jsondata[root])[0];
						if(typeof jsondata[root][subroot] == "object" && typeof jsondata[root][subroot].length == "number"){
							// it is array and the object is 
							arrayresults = jsondata[root][subroot];
						}
					}
				}
				
				if(arrayresults && arrayresults.length > 0){
					// update model before store
					if(Object.keys(service.model).length == 0){
						service.model = TemplateUtil.getModelFromObject(arrayresults[0]);
						
						service.exportConfig(function(error, data){
							ImporterUtil.updateModel(data, data.name, function(errorm, datam){
								console.log("callback from model udpate to the db and the file");
								
								console.log(error);
							});
						});
					}
					
					var count = 0;
					arrayresults.forEach(function(dataobject){
						service.getStorageService().save(dataobject, function(){
							if(count++ == arrayresults.length-1){
								service.updateTotalRecords();
								callback();
							}	
						});
					});
					
					// store inside storage
				}else
					callback("We couldn't fegure out the root element of the data, please provide further info!", jsondata);
			}
		});
	}
}

DataImporter.IMPORTER_FUNCTION['csv'] = function(service, filepath, props, callback){
	console.log("DataImporter.IMPORTER_FUNCTION.csv called")
	var self = this;
	
	if(!fs.existsSync(filepath))
		callback();
	else{
		var Converter = require("csvtojson").Converter;
		
		var readStream = fs.createReadStream(filepath);
		
		//new converter instance 
		var csvConverter = new Converter(props);
		
		if(service && service instanceof DataImporter){
			var diInstance = service;
			var service = service.service;
			
			if(diInstance.options.saveRecord)
				csvConverter.on("record_parsed",function(resultRow, rawRow, rowIndex){
					var formattedobject = diInstance.processRecord(resultRow);
//					console.log(rowIndex + ':' + formattedobject.country);
					
					diInstance.emit("record_parsed", formattedobject);
					
					if(diInstance.options.saveRecord)
						diInstance.saveRecord(formattedobject);
				});
			else
				csvConverter.once("record_parsed",function(resultRow, rawRow, rowIndex){
					diInstance.processRecord(resultRow);
				});
			
			csvConverter.on("end_parsed",function(jsonObj){
				console.log("-----------********----- End parsed:["+diInstance.totalRawCount+"] ------********-----");
				diInstance.end_parsed=true;
				
				if(!diInstance.options.saveRecord)
					diInstance.emit("end_parsed", {totalRawCount:diInstance.totalRawCount});
				//service.updateTotalRecords();
//				callback(null);
			});
			
			csvConverter.on("error",function(errMsg,errData){
				diInstance.emit("error", errMsg,errData);
			});
		} else if(service){
			var totalRawCount = 0;
			var totalRawSavedCount = 0;
			var end_parsed = false;
			csvConverter.on("record_parsed",function(resultRow, rawRow, rowIndex){
				if(Object.keys(service.model).length == 0) {
					service.model = simpleportal.Editor.util.getModelFromObject(resultRow);
					
//					service.exportConfig(function(error, data){
					ImporterUtil.updateModel(service, function(errorm, datam){
						if(error)
							console.log(error);
					});
//					});
				}
				
				for(var key in resultRow){
					var dbfield = simpleportal.util.formatJSONKey(key);
					if(key != dbfield){
						resultRow[dbfield] = resultRow[key];
						delete resultRow[key];
					}
//					if(service.dataformat&&service.dataformat[dbfield])
//						resultRow[dbfield] = service.dataformat[dbfield](resultRow[dbfield]);
				}
				var reqbody ={body:{}};
				reqbody.body[service.name] =resultRow; 
				var formattedobject = service.getObject(reqbody);
				
//				console.log("#########---"+rowIndex+"---########");
				
//				console.log(formattedobject);
				totalRawCount++
				service.getStorageService().save(formattedobject, function(error, data){
					if(end_parsed && totalRawCount == totalRawSavedCount++){
						service.updateTotalRecords();
						console.log("-----------********----- Final result is saved ------********-----");
						callback(null);
					}
				});
			});
			
			csvConverter.on("end_parsed",function(jsonObj){
				console.log("-----------********----- End parsed ------********-----");
				self.end_parsed=true;
				//service.updateTotalRecords();
				
//				callback(null);
			});
			
			csvConverter.on("error",function(errMsg, errData){
				//do error handling here 
				if(errorMsg)
					console.log(errMsg);
				if(errData)
					console.log(errData);
			});
		}
		
		readStream.pipe(csvConverter);	
	}
}

DataImporter.IMPORTER_FUNCTION['xml'] = function(service, filepath, props, callback){
	console.log("DataImporter.IMPORTER_FUNCTION.xml called")
		
	if(!fs.existsSync(filepath))
		callback();
	else {
		var xmlparser = require('xml2json');
		
		fs.readFile(filepath, function(error, xmldata){
			if(error)
				callback(error);
			else{
				props=props||{object:true};
				var jsondata = xmlparser.toJson(xmldata+"", props);
				
				var arrayresults;
				// jow check it is json object or array
				if(typeof jsondata.length == "number")
					arrayresults = jsondata;
				else if(Object.keys(jsondata).length == 1){
					var root = Object.keys(jsondata)[0];
					//console.log(jsondata[root]);
					if(typeof jsondata[root] == "object" && typeof jsondata[root].length == "number"){
						arrayresults = jsondata[root];
					}else if(typeof jsondata[root] == "object" && Object.keys(jsondata[root]).length == 1){
						var subroot = Object.keys(jsondata[root])[0];
						if(typeof jsondata[root][subroot] == "object" && typeof jsondata[root][subroot].length == "number"){
							// it is array and the object is 
							arrayresults = jsondata[root][subroot];
						}
					}
				}
				
				if(arrayresults && arrayresults.length > 0){
					// update model before store
					if(Object.keys(service.model).length == 0){
						service.model = simpleportal.Editor.util.getModelFromObject(arrayresults[0]);
						
//						service.exportConfig(function(error, data){
						ImporterUtil.updateModel(service, function(errorm, datam){
							console.log("callback from model udpate to the db and the file");
							
							if(error)
								console.log(error);
						});
//						});
					}
					
					var count = 0;
					arrayresults.forEach(function(dataobject){
						service.getStorageService().save(dataobject, function(){
							if(count++ == arrayresults.length-1){
								callback();
								service.updateTotalRecords();
							}
						});
					});
					
					// store inside storage
				}else
					callback("We couldnt fedure out the root element of the data, please provide further info!", jsondata);
			}
		});
	}
}

DataImporter.prototype.processRecord = function(resultRow, callback){
//	console.log("DataImporter.processRecord is called - "+ resultRow.country)
	
	var self = this;
	self.totalRawCount++;
	
	for(var key in resultRow){
		var dbfield = simpleportal.util.formatJSONKey(key);
		if(key != dbfield){
			resultRow[dbfield] = resultRow[key];
			delete resultRow[key];
		}
	}
	
	var record = resultRow;
	
	if(self.service.get){
		var reqbody ={body:{}};
		reqbody.body[self.service.name] = resultRow; 
		record = self.service.getObject(reqbody);
	}
	
	if(Object.keys(self.service.model).length == 0) {
		self.service.model = TemplateUtil.getModelFromObject(record);
		
		self.emit("modelready", self.service.model);
	}
	
	if(callback)
		callback(record);
	else
		return record;
}

	
DataImporter.prototype.saveRecord = function(record){
	var self = this;
//	console.log("DataImporter.saveRecord is called - ("+self.totalRawCount +":" + self.totalRawSavedCount +") : "+ record.country)
//	console.log(self.primaryKey);
//	console.log(record.iso);
	
	var request = {};
	
	record.getUserprofile=function(){return {}};
	
	self.getServiceloader().invoke(self.service.name, "POST /", {
		query:{add_update:true},
		body:record,
		getUserprofile:function(){return {}}
	}, function(error, data){
		
//		if(data)
//			console.log("-----------********----- Data saved["+self.totalRawCount+"]["+self.totalRawSavedCount+"]["+data.country+"] ------********-----");
		
		if(error)
			console.log(error);
		else
			console.log(data);
		
		if(self.totalRawCount-1 == self.totalRawSavedCount++ && self.end_parsed){
			self.service.updateTotalRecords();
			console.log("-----------********----- Final result is saved ------********-----");
			
			self.emit("end_parsed", {totalRawCount:self.totalRawCount});
//			callback(null);
		}
	});
	
//	self.service.getStorageService().save(record, function(error, data){
//		console.log("-----------********----- Data saved["+self.totalRawCount+"]["+self.totalRawSavedCount+"]["+data.country+"] ------********-----");
//		
//		if(self.totalRawCount-1 == self.totalRawSavedCount++ && self.end_parsed){
//			self.service.updateTotalRecords();
//			console.log("-----------********----- Final result is saved ------********-----");
//			
//			self.emit("end_parsed", {totalRawCount:self.totalRawCount});
////			callback(null);
//		}
//	});
};

DataImporter.prototype.import = function(callback){
	console.log("DataImporter.import called")
	var self = this;
	
	if(DataImporter.IMPORTER_FUNCTION[self.options.datatype])
		DataImporter.IMPORTER_FUNCTION[self.options.datatype](self, self.options.file, self.options[self.options.datatype+'_props'], callback);
		//DataImporter.IMPORTER_FUNCTION[self.options.datatype](self.service, self.options.file, self.options[self.options.datatype+'_props'], callback);
	else
		callback("No data import possible with the given data type");
	
//	if(callback)
//		self.on("import_finished", function(data){
//			callback(null, data);
//		});
}

/*
 * Exporting the PluginUtil service.
 */
module.exports = DataImporter;