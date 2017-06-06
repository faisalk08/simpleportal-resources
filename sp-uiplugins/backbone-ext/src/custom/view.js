define( [
	"./../core.js",
	"./../view.js",
	"./view/core.js",
	"./view/form.js",
	"./view/search.js",
	"./view/backup.js",
	"./view/tab.js",
	"./view/dashboard.js",
	"./view/grid.js",
	"./view/report.js",
	"./view/chart.js",
	"./view/schedule.js"
], function(Backbone, 
	BackboneView,
	CustomBackboneView,
	FormView,
	SearchView,
	BackupView,
	TabView,
	DashboardView,
	GridView,
	ReportView,
	ChartView,
	ScheduleView
){
	"use strict";
	
	var exports = {};
	
	exports.View = CustomBackboneView;
	
	exports.ListView = CustomBackboneView.extend({
		viewmode:"list",
		modelaction:{
			more:function(props, listView){
				listView.model.next(function(){});
			}
		}
	});
	
	exports.DetailsView = CustomBackboneView.extend({
		viewmode:"details"
	});
	
	exports.FormView = FormView;
	
	exports.FormView = FormView;
	exports.SearchView = SearchView;
	exports.BackupView=BackupView;
	exports.GridView = GridView;
	exports.TabView = TabView;
	exports.DashboardView = DashboardView;
	exports.ReportView = ReportView;
	exports.ChartView = ChartView; 
	exports.ScheduleView=ScheduleView;
	
	return exports;
});
