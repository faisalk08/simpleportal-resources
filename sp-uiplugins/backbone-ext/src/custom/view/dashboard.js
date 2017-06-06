define( [
	"./../../core.js",
	"./core.js",
	"./grid.js"
], function(Backbone, CustomBackboneView, GridView){
	"use strict";
	
	/**
	 * Form with functions to handle the form submit
	 */
	var DashboardView = CustomBackboneView.extend({
		template:_.template('<div><div class="col-sm-12" id="slider"></div></div><div class="dashboardgrid"></div></div>'),
		dashboardsource:function(defaulturl){
			return defaulturl;
		},
		drawGrid:function(colsize){
			var self = this;
	
			if(self.subviewconfig && self.subviewconfig.length > 0){
				colsize = colsize || Number(app.getPreference('dashboardgrid_colsize', 12));
				
				self.gridview = new GridView({colsize:colsize, colcount:self.subviewconfig.length});

//				self.gridView.on("afterload_column", function(options){
//					self.trigger("afterload_column", options);
//				});
				
				self.$('.dashboardgrid').html('');
				self.gridview.render(self.$('.dashboardgrid'));
				
				self.gridview.load(self.subviewconfig);
			}else{
				//@TODO else 
				self.$('.dashboardgrid').html('<div class="alert alert-info">No dashboard item to display, please contact Administrator or configure your dashboard properly!</div>');
			}	
		},
		afterLoad:function(){
			var self = this;
			
			self.subviewconfig = []; 
			if(self.__proto__ && self.__proto__.subviewconfig)
				self.subviewconfig = self.__proto__.subviewconfig
			
			//@TODO override the sub view configuration from url
			if(self.dashboardsource && self.dashboardsource()){
				$.get(self.dashboardsource(), function(data){
					if(data){
						if(data.results || data.subviewconfig){
							var datasubviewconfig = data.results || data.subviewconfig;
							for(var i in datasubviewconfig){
								var dashboardsetting = datasubviewconfig[i];
								
								if(dashboardsetting.urlRoot && dashboardsetting.urlRoot){
									if(!dashboardsetting.name)dashboardsetting.name = dashboardsetting.id;
									self.subviewconfig.push(dashboardsetting);
								}
							}	
						}						
						
						if(self.subviewconfig.length > 0){
							self.drawGrid();
							
							self.$('.dashboardgrid').before('<div class="row"><div class="col-sm-offset-9 col-sm-3" id="slider"><select class="form-control pull-right" style="display:block;" name="dashboardgrid_colsize" id="dashboardgrid_colsize"></select></div><hr/></div>');
							Backbone.Fieldplugins.register({field:'dashboardgrid_colsize', options:[3,4,6,12]}, null, self);
							
							self.$('[name=dashboardgrid_colsize]').on('change', function(){
								var colsize = self.$('[name=dashboardgrid_colsize]').val();
								
								if(colsize && colsize > 0){
									app.setPreference('dashboardgrid_colsize', colsize, {disablereload:true});
									
									self.drawGrid(colsize);
								}	
							});
						}else
							self.drawGrid();
					}
				});	
			}else if(self.subviewconfig.length > 0){
				self.drawGrid();
				
				self.$('.dashboardgrid').before('<div class="row"><div class="col-sm-offset-9 col-sm-3" id="slider"><select class="form-control pull-right" style="display:block;" name="dashboardgrid_colsize" id="dashboardgrid_colsize"></select></div><hr/></div>');
				Backbone.Fieldplugins.register({field:'dashboardgrid_colsize', options:[3,4,6,12]}, null, self);
				
				self.$('[name=dashboardgrid_colsize]').on('change', function(){
					var colsize = self.$('[name=dashboardgrid_colsize]').val();
					
					if(colsize && colsize > 0){
						app.setPreference('dashboardgrid_colsize', colsize, {disablereload:true});
						
						self.drawGrid(colsize);
					}	
				});
			}else
				self.drawGrid();
		}
	});
	
	if(window)
		window.DashboardView = DashboardView;
	
	return DashboardView;
});