define( [
	"/uiplugin/backbone-ext/src/backbone-ext.js"
], function( Backbone) {
	var exports = this;//{};
	
	exports.ProjectitemscheduleView = Backbone.ScheduleView.extend({
		schedulesource:function(){return '/api/project/erec2.0/schedule';},
		afterInitialize:function(){
			this.options.templateName;
		}
	});
	
	exports.ProjectitemlistView = Backbone.ListView.extend({
		afterInitialize:function(){
			var self = this;
			
//			console.log(app.urimapping);
			app.urimapping['projectdashboard']=
				{
					"display": "My Project dashboard",
					"uri": "#projectdashboard",
					"icon": "glyphicon glyphicon-home"
				};
			
			if(self.options.tabs){
				self.options.tabs.unshift({id:'dashboard', uri:'#projectdashboard', cssclass:'pull-left', title:'project-dashboard', icon:'glyphicon glyphicon-home'});
//				self.options.tabs.unshift({id:'schedule', uri:'#projectitem/schedule', cssclass:'pull-left', title:'project-schedule', icon:'glyphicon glyphicon-home'});
			}
		}
	});
	
	var dateformat = 'dd.mm.yy';//Backbone.Utils.dateTools.parseFormat("dd.mm.yyyy");
	var projectdurationtemplate = _.template('<%= title %><table class="table"><thead><tr><th>Start</i></th><th>End (Start + <%= timeindays %> working days)</th></tr></thead><tbody><tr><td><input style="background:transparent;border:none;" type="text" class="startdateinput" value="<%= startdate %>"/></td><td><%= enddate %></td></tr></tbody></table>');
	
	var extendJSONProps=function(from, to)
	{
	    if (from == null || typeof from != "object") return from;
	    if (from.constructor != Object && from.constructor != Array) return from;
	    if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
	        from.constructor == String || from.constructor == Number || from.constructor == Boolean)
	        return new from.constructor(from);

	    to = to || new from.constructor();

	    for (var name in from)
	    {
	        to[name] = typeof to[name] == "undefined" ? extendJSONProps(from[name], null) : to[name];
	    }

	    return to;
	}
	
	var calculateEndDate = function(container, modeldatatoprocess){
//		console.log("Updating the end date based on time in hours -- " + modeldatatoprocess.startdate  +' -- '+ modeldatatoprocess.timeinhours + ' ---type ' +typeof modeldatatoprocess.startdate);
//		console.log(modeldata);

//		var modeldatatoprocess = extendJSONProps(modeldata, {});
		var displaymodel = extendJSONProps(modeldatatoprocess, {});

		if(typeof modeldatatoprocess.startdate === "string")
			modeldatatoprocess.startdate = Backbone.Utils.dateTools.parseDate(modeldatatoprocess.startdate, dateformat);

		displaymodel.startdate = Backbone.Utils.dateTools.formatDate(modeldatatoprocess.startdate, dateformat);
		
//		console.log(modeldatatoprocess.startdate);
		
		var timeindays = displaymodel.timeindays = Math.floor(Number(modeldatatoprocess.timeinhours)/8);
		var timeinweeks = Math.round(timeindays/5);
		var extradays = ((((timeindays%5)*8)+(modeldatatoprocess.timeinhours%8)))%(8);
			timeinweeks += Math.round(extradays/5);
			extradays = extradays%5;

//		console.log("Adding  -- " + timeinweeks + ' weeks --- '+ extradays + ' days');
//		console.log(modeldatatoprocess.startdate);
//		console.log(Backbone.Utils.dateTools.formatDate(modeldatatoprocess.startdate, dateformat));
//		console.log(modeldatatoprocess.startdate);
//		var displaymodel = $.extend({}, modeldata);
		
		modeldatatoprocess.enddate = Backbone.Utils.dateTools.addWeeks(modeldatatoprocess.startdate, timeinweeks);
		if(extradays>0){
			modeldatatoprocess.enddate = Backbone.Utils.dateTools.addDays(modeldatatoprocess.enddate, extradays);
		}
		
		displaymodel.enddate = Backbone.Utils.dateTools.formatDate(modeldatatoprocess.enddate, dateformat);
		
//		console.log("after processing");
//		console.log(modeldatatoprocess.startdate);
//		console.log(displaymodel.startdate);
		
		if(container.find(".startdateinput").length > 0)
			container.find(".startdateinput").parent().next().html(displaymodel.enddate);
		else if(container.length > 0)
			container.append(projectdurationtemplate(displaymodel));
//		
//		var noofweekend = Backbone.Utils.dateTools.countWeekendDays(Backbone.Utils.dateTools.parseDate(modeldata.startdate, dateformat), Backbone.Utils.dateTools.parseDate(modeldata.enddate, dateformat)); 
//		
//		var _enddate = Backbone.Utils.dateTools.formatDate(Backbone.Utils.dateTools.addDays(Backbone.Utils.dateTools.parseDate(modeldata.startdate, dateformat), timeindays + (Math.floor(timeindays / 7)*2)), dateformat);
//		var _noofweekend = Backbone.Utils.dateTools.countWeekendDays(Backbone.Utils.dateTools.parseDate(modeldata.startdate, dateformat), Backbone.Utils.dateTools.parseDate(_enddate, dateformat));
//		
//		var numberofdays = noofweekend % 30;
//		var numberofmonths = Math.floor(noofweekend / 30);
		
		return modeldatatoprocess;
	};
	

	function updateTable(view, tableid, modeldata, timeinhoursindex){
//		console.log("updating -- "+ tableid + ' -- ' + timeinhoursindex);
//		console.log(modeldata);
		
		if(modeldata && timeinhoursindex){
			var timeinhours = view.$('#'+tableid+'>tbody [data-id="'+modeldata.id+'"]>td:nth-child('+(timeinhoursindex+1)+')').text().trim();
			var $projecttitlecontainer = view.$('#'+tableid+'>tbody [data-id="'+modeldata.id+'"]>td:nth-child('+(timeinhoursindex)+')');
			
			modeldata.timeinhours = Number(timeinhours);
			var modeldatatoprocessed = calculateEndDate($projecttitlecontainer, modeldata);
			
			new  Backbone.Utils.SimpleDatePicker($projecttitlecontainer.find(".startdateinput"), {
				buttonImageOnly:true,
				buttonText:"Change start date",
				title:"Change start date",
				dateFormat:dateformat,
				onSelect:(function(container, modeldata_){
					modeldata_ = extendJSONProps(modeldata_, {});
					return function(seldate, target){
						modeldata_.startdate = seldate;
						
						var $closesttr = $(target.input).closest('table').closest('tr');
						var currowindex;
						if($closesttr && $closesttr.length > 0)
							currowindex = $closesttr.parent().children().index($closesttr);
						
//						console.log(currowindex);
						
						var modeldataprocessed = calculateEndDate(container, modeldata_);
						if(currowindex||currowindex==0){
							
//							console.log("we have more items -- "+ $closesttr.parent().children('tr:gt('+currowindex+')').length);
//							var enddate = Backbone.Utils.dateTools.formatDate(modeldataprocessed.enddate, dateformat)
							$closesttr.next().find('.startdateinput').val(Backbone.Utils.dateTools.formatDate(modeldataprocessed.enddate, dateformat));
//							$closesttr.next().find('.startdateinput').trigger('onSelect', enddate, {input:$closesttr.next().find('.startdateinput')[0]})
							modeldataprocessed.startdate=modeldataprocessed.enddate;
							modeldataprocessed = calculateEndDate($closesttr.next().find('.startdateinput').closest('table').parent(), modeldata_);
						}	
					} 
				})($projecttitlecontainer, modeldata)
			});
			
			return modeldatatoprocessed;
		} else
			return modeldata;
	}
	
	function updateItemTable(view, tableid, modeldata){
		var itemtableid = tableid.replace("_count_", "_count_projectitems_items_");
//		view.$(itemtableid+':first').find()
		
		var $timeinhoursindex = self.$('#'+itemtableid+'>thead tr [data-data=timeinhours]');
		if($timeinhoursindex && $timeinhoursindex.length > 0)
			timeinhoursindex = $timeinhoursindex.parent().children().index($timeinhoursindex);
		
		var firstid = self.$('#'+itemtableid+'>tbody tr:first').data("id");
		//'erec2.0requirementmanagement';
		
		var projectitems = [];
		self.$('#'+itemtableid+'>tbody>tr').each(function(){
			projectitems.push($(this).data("id"));
		});
		
		if(projectitems.length > 0){
			var modeldata_ = extendJSONProps(modeldata, {});
			
			modeldata_.id=projectitems[0];
			var modeldatatoprocessed = updateTable(view, itemtableid, modeldata_, timeinhoursindex);
			
			for(var i = 1; i < projectitems.length; i ++){
				var modeldatatorocess = extendJSONProps(modeldatatoprocessed, {});
				modeldatatorocess.id=projectitems[i];
				
				modeldatatoprocessed = updateTable(view, itemtableid, modeldatatorocess, timeinhoursindex);
			}
			
//			console.log(modeldatatoprocessed.enddate);
		}
		//find out next item and use end date based on the current end date
	}
	
	exports.DashboardView = Backbone.DashboardView.extend({
		afterLoad:function(){
			alert("sdsadas");
		}
	});
	
	exports.DashboardView = exports.ProjectdashboardView = Backbone.DashboardView.extend({
		updateTableInfo:function(options){
			var self = this;
			
			var projects = [];
			var tableid = "datatable_"+ options.columnprops.id.replace(/-\./ig, "_")+"_count_dynamic_table";
			var timeinhoursindex;
			
			var $timeinhoursindex = self.$('#'+tableid+'>thead tr [data-data=timeinhours]');
			if($timeinhoursindex && $timeinhoursindex.length > 0)
				timeinhoursindex = $timeinhoursindex.parent().children().index($timeinhoursindex);
			
			var projectids = (self.$('#'+tableid+'>tbody>tr')).each(function(index, tr){
				//projects.push($(tr).data("id"));
				
				$.get("/api/project/search?id="+ encodeURIComponent($(tr).data("id").trim()), (function(tableid, timeinhoursindex){
					return function(data){
						var modeldata = data;
						if(data&&data.results&&data.results.length>0)
							modeldata = data.results[0];
						
						if(modeldata){
							var startdate;
							if(modeldata.startdate){
								modeldata.startdate = new Date(modeldata.startdate);
								startdate = new Date(modeldata.startdate);
							}
//							console.log("from db --- " + modeldata.startdate)
							var modeltoprocess = extendJSONProps(modeldata, {});
							
//							updateTable(self, tableid, extendJSONProps(modeldata, {}), timeinhoursindex);
//							console.log("from db --- " + modeldata.startdate)
							updateItemTable(self, tableid, extendJSONProps(modeltoprocess, {}));
//							console.log("from db --- " + startdate);
							modeldata.startdate =startdate;
							updateTable(self, tableid, extendJSONProps(modeldata, {}), timeinhoursindex);
//							updateTable(self, tableid.replace("_count_", "_count_projectitems_"), modeldata, timeinhoursindex);
						}
					}
				})(tableid, timeinhoursindex));
			});
//			
//			if(projects.length > 0){
//				$.get("/api/project/search?id="+ encodeURIComponent(projects.join(",")), (function(tableid, timeinhoursindex){
//					return function(data){
//						var modeldata = data;
//						if(data&&data.results&&data.results.length>0)
//							modeldata = data.results[0];
//						
//						if(modeldata){
//							updateTable(self, tableid, modeldata, timeinhoursindex);
//							
//							//updateTable(self, tableid.replace("_count_", "_count_projectitems_"), modeldata, timeinhoursindex);
//						}
//					}
//				})(tableid, timeinhoursindex));
//			}
		},
		afterInitialize:function(){
			var self = this;
			
			app.on("afterload_column", function(options){
				if(options.columnprops.id == "projectwise-cost-table" || options.columnprops.id == 'projectwise-resource-cost'){
					self.updateTableInfo(options);
				}
			});
		},
		afterConfigure:function(){
			var self = this;
			
			
		}, "subviewconfig": [
			/*{
				"name":"projectwise-cost-table",	
			    "title": "projectwise-cost-table",
			    "urlRoot": "/api/projectitem/$cmd/aggregate?pipeline=%5B%0A%09%7B%0A%09%09%22%24group%22%3A%20%7B%0A%09%09%09%22_id%22%3A%20%7B%0A%09%09%09%09%22project%22%3A%20%22%24project%22%2C%0A%09%09%09%09%22itemcategory%22%3A%20%22%24itemcategory%22%0A%09%09%09%7D%2C%0A%09%09%09%22timeinhours%22%3A%20%7B%0A%09%09%09%09%22%24sum%22%3A%22%24timeinhours%22%0A%09%09%09%7D%2C%20%22items%22%3A%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22%24push%22%3A%7B%22itemcategory%22%3A%22%24itemcategory%22%2C%20%22itemtitle%22%3A%22%24itemtitle%22%2C%20%22timeinhours%22%3A%22%24timeinhours%22%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%09%09%7D%0A%09%7D%2C%7B%0A%09%09%22%24project%22%3A%20%7B%0A%09%09%09%22_id%22%3A%20%22%24_id%22%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22combinedid%22%3A%7B%22%24concat%22%3A%5B%22%24_id.project%22%2C%20%22%24_id.itemcategory%22%5D%7D%2C%0A%09%09%09%22timeinhours%22%3A%20%22%24timeinhours%22%2C%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22costineuros%22%3A%7B%22%24multiply%22%3A%5B%22%24timeinhours%22%2C%2040%5D%7D%2C%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22categories%22%3A%22%24items%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%09%7D%2C%7B%0A%09%09%22%24group%22%3A%20%7B%0A%09%09%09%22_id%22%3A%20%22%24_id.project%22%2C%0A%09%09%09%22totaltime%22%3A%20%7B%0A%09%09%09%09%22%24sum%22%3A%22%24timeinhours%22%0A%09%09%09%7D%2C%20%22project-items%22%3A%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%22%24push%22%3A%7B%22itemcategory%22%3A%22%24_id.itemcategory%22%2C%20%22costineuros%22%3A%22%24costineuros%22%2C%20%22timeinhours%22%3A%22%24timeinhours%22%2C%20%22items%22%3A%22%24categories%22%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%09%09%7D%0A%09%7D%2C%7B%0A%09%09%22%24project%22%3A%20%7B%0A%09%09%09%22project-title%22%3A%20%22%24_id%22%2C%0A%09%09%09%22timeinhours%22%3A%22%24totaltime%22%2C%0A%09%09%09%22costineuros%22%3A%7B%22%24multiply%22%3A%5B%22%24totaltime%22%2C%2040%5D%7D%2C%0A%22projectitems%22%3A%20%22%24project-items%22%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%0A%09%7D%0A%5D",
			    "templatedir": "templates/",
			    "templateName": "dynamictable.html?layout=accordion",
			    "id": "projectwise-cost-table"
			},
            {
				"name":"time-for-erec-in-months",
				"title": "time-for-erec-in-months",
		        "urlRoot": "/api/projectitem/$cmd/aggregate?pipeline=%5B%0A%7B%22%24group%22%3A%7B%22_id%22%3A%22%24resourcerole%22%2C%20%22count%22%3A%7B%22%24sum%22%3A%22%24timeinhours%22%7D%7D%7D%2C%0A%7B%22%24project%22%3A%7B%22_id%22%3A%22%24_id%22%2C%20%22time-in-months%22%3A%7B%22%24divide%22%3A%5B%22%24count%22%2C%20120%5D%7D%7D%7D%0A%5D",
		        "templatedir": "templates/",
		        "templateName": "dynamictable.html?layout=accordion",
		        "id": "time-for-erec-in-months"
		    }, {
		    	"name":"eREC-cost-per-resource-role-in-euro",	
		        "title": "eREC-cost-per-resource-role-in-euro",
		        "urlRoot": "/api/projectitem/$cmd/aggregate?pipeline=%5B%0A%7B%22%24group%22%3A%7B%22_id%22%3A%22%24resourcerole%22%2C%20%22count%22%3A%7B%22%24sum%22%3A%7B%22%24multiply%22%3A%5B%22%24timeinhours%22%2C%2072%5D%7D%7D%7D%7D%2C%0A%7B%22%24project%22%3A%7B%22_id%22%3A%22%24_id%22%2C%20%22cost-in-euro%22%3A%22%24count%22%7D%7D%0A%5D",
		        "templatedir": "templates/",
		        "templateName": "dynamictable.html?layout=accordion",
		        "id": "erec-cost-per-resource-role-in-euro"
		    }, */
		]
	});
});