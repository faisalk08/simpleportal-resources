define( [
	"./core.js",
	"./../model.js"
], function(Backbone, BackboneExtModel){
	"use strict";
	
	/**
	 * Grid view
	 * Simple grid view
	 */
	var GridView = function(options){
		var self = this;
		
		self.options = _.extend({}, GridView.DEFAULS, options);
		
		self.col_template = _.template(self.options.col_template);
		self.row_template = _.template(self.options.row_template);
		
		self.colcount = self.options.colsize*self.options.colcount;
		self.rowcount = Math.ceil(self.colcount/self.options.col_max);
		self.rowcolcount = Math.ceil(self.options.col_max/self.options.colsize);
		
		return self;
	};
	
	GridView.DEFAULS = {
		id:'default-grid',
		colsize:4,
		colcount:3,
		col_max:12,
		row_css:'row',
		row_id_prifix:'-row-',
		col_id_prifix:'-col-',
		col_css_prifix:'col-sm-',
		col_template:'<div class="<%= cssclass %>" id="<%= colid %>" ></div>',
		row_template:'<div id="<%= rowid %>" class="row"></div>'
	};
	
	GridView.prototype.setProps = function(container){
		var self = this;
		
		self.colcount = self.options.colsize*self.options.colcount;
		self.rowcount = Math.ceil(self.colcount/self.options.col_max);
		self.rowcolcount = Math.ceil(self.options.col_max/self.options.colsize);
	};
	
	GridView.prototype.render = function(container){
		var self = this;
		self.container = container;
		
		self.columnlist = [];
		
		for(var i=0; i < self.rowcount; i++){
			var rowid = self.options.id + self.options.row_id_prifix + i;
			self.container.append(self.row_template({rowid:self.options.id + self.options.row_id_prifix + i}));
			
			for(var rc=0; rc < self.rowcolcount; rc++){
				var colid = self.options.id + self.options.row_id_prifix + i + self.options.col_id_prifix + rc;
				var colcss = self.options.col_css_prifix+self.options.colsize;
				
				self.columnlist.push({id:colid});
				
				$('#'+rowid, self.container).append(self.col_template({
					cssclass:colcss,
					colid:colid
				}));
			}
		}
	};
	
	GridView.prototype.loadColumn = function(index, columnprops){
		var self = this;
		
		if(self.columnlist[index]){
			var container = self.columnlist[index].id;
			
			self.loadView(columnprops, '#' + container);
		}else
			throw Error("No column found for loading the specified view!");
	};
	
	GridView.prototype.changeColsize = function(columnprops, container){
		
	};
	
	/**
	 * @method loadView
	 */
	GridView.prototype.loadView = function(columnprops, container){
		if(!columnprops.name)
			throw Error("No valid name for the chart!!");
		else if(columnprops.charttype){
			if(!columnprops.title)
				columnprops.title = columnprops.name;
			
			app.loadView(_.extend({"container": container}, columnprops));
		}else if(columnprops.uri){
			var normalview = app.getView({}, [columnprops.uri.replace('#', '')]);
			
			if(normalview)
				normalview.load(container);
			else
				throw Error("No view found for specified uri -" + columnprops.uri);
		} else if(columnprops.templateName && columnprops.templateName && columnprops.urlRoot){
			var normalview = app.getView(_.extend({}, {
				templateName:columnprops.templateName,
				templatedir:columnprops.templatedir,
				viewmode:"list",
				urlRoot:columnprops.urlRoot,
				title:columnprops.title||'',
				name:columnprops.name||columnprops.id
			}));
			
			if(normalview){
				normalview.on('afterload', function(){
					app.trigger("afterload_column", {container:container, columnprops:columnprops});
				});
				normalview.load(container);
			} else
				throw Error("No view found for specified uri -" + columnprops.id);
		} else{
			throw Error("Not implemented yet");
		}
	}
	
	/**
	 * To load the various views into the grid
	 * @method load
	 * @params columnprops configuration for the columns in order, 
	 */
	GridView.prototype.load = function(columnprops){
		var self = this;
		
		if(self.container){
			if(columnprops){
				for(var index in columnprops){
					self.loadColumn(index, columnprops[index]);
				}
			}
		}else
			throw Error("No container defined for the grid!");
	}
	
	return GridView;
});