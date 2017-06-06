define( [
	"./core.js"
], function(CustomBackboneView){
	"use strict";
	
	/**
	 * Customized view for chart view
	 */
	var ChartView = CustomBackboneView.extend({
		events:{
			'click .savefilter':'saveFilter'
		},
		saveFilter: function(event){
			event.preventDefault();
			
			var self = this;
			var fields = ['templatedir', 'templateName', 'charttype', 'title', 'name', 'plugin'];
			var filterdatasource = _.extend({}, self.options, self.model.toJSON());
			
			var filterdata = _.pick(filterdatasource, fields);
			
			filterdata.urlRoot = self.model.url();
			
			// confirm the title of the Filter
			var modalprops = _.extend({
				message : 'Please provide a valid title|name for the filter to save this report ? '
			}, {
				type:'prompt', title:'Save '+filterdata.title, value:filterdata.title, model:filterdata,
				fieldsettings:[
	               {field:'title', display:'Title', value:filterdata.title},
	               {field:'dashboard', display:'Include in my dashboard', value:true, type:'checkbox'}
               ]
			}); 
			
			app.openDialog(modalprops, function(modal, promptdata){
				if(promptdata){
					var model = new Backbone.Model({urlRoot:'/api/displayfilter', newmodel:true});
					
					_.extend(filterdata, promptdata);
					
					model.on('sync', function(){
						app.showMessage('success', {
				    		title:'Report filter save',
				    		message:'filter for the mentioned report is saved successfully.'
				    	});
					});
					model.save(filterdata);
				}else{
					//@TODO ignore the save
				}	
			});
		}, getChartData:function(options){
			var self = this;
			
			var options = self.options = _.extend({
				charttype:'pie',
				dataroot:'count', 
				datax:'_id',
				datay:'count',
				xfield:'indexLabel',
				yfield:'y',
				showlegend:false
			}, options, self.options);
			
			if(self.options.charttype.indexOf('chartjs-') == 0){
				options.xfield = 'label';
				options.yfield = 'value';
			}
			
			var dataPoints=[];
			var rawdata = self.model.toJSON();
			
			var skipcolor = [];
			for(var i in rawdata[options.dataroot]){
				var curdata = rawdata[options.dataroot][i],
					datapoint = {};
				
				if(curdata[options.datax] && curdata[options.datay]){
					datapoint[options.xfield]=curdata[options.datax];
					
					if(curdata[options.datax+'_text'])
						datapoint[options.xfield]=curdata[options.datax+'_text'];
					
					datapoint[options.yfield]=curdata[options.datay];
					
					//@TODO default implementation
					datapoint["color"] = utils.getRandomColor(skipcolor);
					datapoint["highlight"] = utils.getRandomColor(skipcolor);
					datapoint["labelFontSize"]=16;
					datapoint["labelColor"] = 'white';
					
					dataPoints.push(datapoint);
				}	
			}
			return dataPoints;
		}, afterLoad:function(){
			var self = this;
			
			// if chartjs
			if(!self.$('canvas').attr('id'))
				self.$('canvas').attr('id', self.$el.attr('id')+'_chart');
			
			var container = self.$('canvas').attr('id');
			self.drawChart(self.getChartData(), self.$('canvas').attr('id'), self.options.charttype);
			
			if(self.chart){
				//if(self.options.showlegend){
				self.$('#'+ container).after('<div style="display:'+(self.options.showlegend?'block':'none')+';" class="chart_legends">' +self.chart.generateLegend()+'</div>');
				//}
				
				//self.$('.panel-heading h4').after('<select class="pull-right form-control" name="charttype"></select>');
				self.$('#'+ container).before('<div class="row"><div class="col-sm-offset-9 col-sm-3">\
						'+window.getMessage("show")+' Legend <input type="checkbox" name="showlegend"/> \
						<select class="pull-right input-sm form-control" name="charttype_selector"></select></div></div>');
				
				Backbone.Fieldplugins.register({field:'charttype_selector', options:window.charttypes}, null, self);
				
				self.$('[name=charttype_selector]').val(self.options.charttype);
				self.$('[name=charttype_selector]').on('change', function(){
					if($(this).val() && $(this).val() != '')
						self.drawChart(self.getChartData(), container, $(this).val());
				});
				
				self.$('[name=showlegend]').on('change', function(){
					if($(this).is(':checked'))
						self.$('.chart_legends').show();
					else
						self.$('.chart_legends').hide();
				});
			}
		}, drawChart : function (chartdata, container, charttype){
			var self = this,
				chartprovider;
			
			if(charttype.indexOf('-') != -1){
				var charttypearray = charttype.split("-");
				
				if(charttypearray[0])
					chartprovider = charttypearray[0];
				
				if(charttypearray.length > 0)
					charttype = charttypearray[1];
			}else
				chartprovider = Object.keys(chartproviders)[0];
			
			if(chartprovider){
				if(self.chart)
					self.chart.destroy();
				
				var chart = self.chart = chartproviders[chartprovider].draw(chartdata, self.$('#'+ container), charttype, function(){
					self.$('.printchart').attr('href', self.chart.toBase64Image());
					self.$('.printchart').attr('target', '_blank');
					self.$('.printchart').attr('download', (self.options.title||self.options.name||self.options.charttype) + '.png');
					
					var data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(self.getChartData()));
					
					self.$('.exportchart').attr('href', data);
					self.$('.exportchart').attr('target', '_blank');
					self.$('.exportchart').attr('download', (self.options.title||self.options.name||self.options.charttype) + '.json');
					
					//self.$('canvas')[0].fillText('Code Project', 10, self.$('canvas')[0].height / 2 - 15);
				});
			} else
				throw "Not a valid chart provider!"
		}
	});

	/**
	 * Chart provider configuration
	 * should be dynamic loading based on the chart providers
	 * @TODO must use amd style define and require functions
	 */
	var chartproviders={
		"chartjs":{
			"doughnut":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).Doughnut(chartdata, {
					responsive:true,
					onAnimationComplete:function(){
						callback();
					}
				});
			},
			"pie":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).Pie(chartdata, {
					responsive:true,
					legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<segments.length; i++){%><li><span style=\"background-color:<%=segments[i].fillColor%>\"><%if(segments[i].label){%><%=segments[i].label%><%}%></span></li><%}%></ul>"
					,onAnimationComplete:function(){
						callback();
					}
				});
			},"radar":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).Radar(chartdata, {
					responsive:true,
					segmentStrokeColor: "#000000",
					onAnimationComplete:function(){
						callback();
					}
				});
			},"polararea":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).PolarArea(chartdata, {
					responsive:true,
					segmentStrokeColor: "#000000",
					onAnimationComplete:function(){
						callback();
					}
				});
			},"bar":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).Bar(chartdata, {
					showScale:true,
					responsive:true,
					segmentStrokeColor: "#000000",
					legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\">&nbsp;</span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
					onAnimationComplete:function(){
						callback();
					}
				});
			},"stackedbar":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).StackedBar(chartdata, {
					showScale:true,
					responsive:true,
					segmentStrokeColor: "#000000",
					legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\">&nbsp;</span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
					onAnimationComplete:function(){
						callback();
					}
				});
			}/*,"AxisFixedBar":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).AxisFixedBar(chartdata, {
					showScale:true,
					responsive:true,
					segmentStrokeColor: "#000000",
					legendTemplate : "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\">&nbsp;</span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
					onAnimationComplete:function(){
						callback();
					}
				});
			}*/,
			"line":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).Line(chartdata, {
					responsive:true,
					onAnimationComplete:function(){
						callback();
					}
				});
			}/*,"AxisFixedLine":function(chartdata, container, callback){
				return new Chart(container.get(0).getContext("2d")).AxisFixedLine(chartdata, {
					responsive:true,
					onAnimationComplete:function(){
						callback();
					}
				});
			}*/,"draw":function(chartdata, container, charttype, callback){
				if(charttype.indexOf("chartjs-") == 0 )
					charttype = charttype.substring("chartjs-".length);
				
				if(charttype =='radar' || charttype == 'line' || charttype == 'bar' || charttype == 'stackedbar' || charttype ==  'AxisFixedBar' || charttype ==  'AxisFixedLine'){
					var chartdataobject = {labels:[], datasets:[]};
					for(var index in chartdata){
						if(chartdata[index].label){
							if(chartdata[index].label.x){
								if(_.indexOf(chartdataobject.labels, chartdata[index].label.x) == -1)
									chartdataobject.labels.push(chartdata[index].label.x)
							} else if(_.indexOf(chartdataobject.labels, chartdata[index].label) == -1)
								chartdataobject.labels.push(chartdata[index].label)
						}
					}
					
					for(var index in chartdata){
						var chartdatapoint = _.extend({data:[], dataobject:[]}, chartdata[index]);
						var chartdatapoint_ = chartdataobject.datasets.filter(function(object, index){
							if(chartdatapoint.label.y)
								return object.label == chartdatapoint.label.y;
							else
								return object.label == chartdatapoint.label;
						});
						
						if(chartdatapoint_ && chartdatapoint_.length > 0)
							chartdatapoint = chartdatapoint_[0];
						
						if(chartdata[index].label){
							//@TODO format 
							if(chartdata[index].label.y)
								chartdatapoint.label = chartdata[index].label.y;
							else
								chartdatapoint.label = chartdata[index].label;
							
							chartdatapoint.dataobject[chartdata[index].label.x] = chartdata[index].value;
						}	
						
						chartdatapoint.fillColor=chartdatapoint.color;
						chartdatapoint.highlightFill=chartdatapoint.highlight;
						
						delete chartdatapoint.value;
						if(!chartdatapoint_ || chartdatapoint_.length == 0)
							chartdataobject.datasets.push(chartdatapoint);
					}
					
					for(var index in chartdataobject.datasets){
						var chartpoint = chartdataobject.datasets[index];
						for(var lindex in chartdataobject.labels){
							var label = chartdataobject.labels[lindex];
							
							chartpoint.data.push(chartpoint.dataobject[label]||0);
						}
					}
					
					return chartproviders["chartjs"][charttype](chartdataobject, container, callback||function(){});
				}else
					return chartproviders["chartjs"][charttype](chartdata, container, callback||function(){});
			}
		}, "canvasjs":{
			"draw":function(chartdata, container, charttype){
				var chart = new CanvasJS.Chart(container, {
		            data: [{
		                type: charttype||"pie",
		                dataPoints: chartdata
		            }]
		        });
		
		        chart.render();
		        return chart;
			}
		}
	}
	
	if(window){
		window.chartproviders = chartproviders;
		window.charttypes = [];
		
		for(var key in chartproviders){
			var charttypes = Object.keys(chartproviders[key]);
			for(var charttype in charttypes){
				if(charttypes[charttype] != 'draw')
					window.charttypes.push(key + '-' + charttypes[charttype]);
			}
		}
		
//		if(window.Backbone)
//			window.Backbone.ChartView=ChartView;
	}	
		
	return ChartView;
});