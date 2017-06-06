define( [
	"./core.js",
	"./form.js",
	"./chart.js",
	"./../../model.js",
	"./../../collection.js"
], function(CustomBackboneView, BackboneFormView, BackboneChartView, BackboneExtModel, BackboneExtCollection){
	"use strict";
	
	//	Backbone.ChartView = BackboneChartView.ChartView;
	/**
	 * Props for default chart view
	 */
	var ChartView_DEFAULTS = {
		"name": "dynamic_aggregate_report",
		"charttype":"chartjs-doughnut",
		"templatedir":"templates/",
		"templateName":"chart",
		"title":"Dynamic chart"	
	};
	
	/**
	 * @class ReportView
	 */
	var ReportView = BackboneFormView.extend({
		fieldsettings:{
			displaytype:{
				html:{caption:'Display type'}, fieldplugin:'radio', options:['chart', 'table'/*, 'custom'*/],
				change:{"chart":{charttype:'dependant'}}
			}, charttype:{
				options:window.charttypes
			}, layout:{
				options:["accordion"], fieldplugin:'radio'
			}
		},
		events:{
			"click .modelaction":"customModelAction",
			"click .aggregate-filter.addmore":"addMoreFilter",
			"click .aggregate-sort.addmore":"addMoreSorting",
			"click .aggregate-filter.remove":"removeSelectedField",
			"change [name=aggregate-query_filter_field]":"removeSelectedField",
			"click .advanced_control":"toggleAdvancedQuery",
			"change":"changePipeline"
		}, changePipeline:function(event){
			var self = this;
			
			var name = $(event.target).attr("name");
			var value = $(event.target).val();
			var groupedfields = [];
			if(name && name == "_id" && value && typeof value == "object" && value.length > 1){
				for(var index in  value){
					if(groupedfields.length > 0)
						groupedfields.push(" ");
					
					groupedfields.push("$_id." + value[index].replace("$", ""));
				}
				
				if(groupedfields.length > 0)
					self.setValue("_id_text", JSON.stringify({$concat:groupedfields}));
			}

			self.showAdvQuery();
			
			return false;
			
			if(name){
				if(name && name == "$group._id"){
					var idfield;
					if(name && value){
						if(value && value.indexOf(",") != -1){
							for(var value in value.split(","))
								idfield[value]=value;
						}else
							idfield=value;	
					}
					
					var groupquery = {"_id":idfield};
					var countfield = $(event.target).closest(".form-control").find("[data-aggregate-field=count]");
					if(countfield && countfield.length >0){
						var countfieldvalue;
						if(!countfield.val() && countfield.val() != "-1")
							countfieldvalue=countfield.val();
						
						else if(countfield.val() != "-1")
							countfieldvalue = countfield.data("new-value");
						
						if(countfieldvalue){
							if(typeof countfieldvalue == "number")
								groupquery["count"]={"$sum":Number(countfieldvalue)};
							else
								groupquery["count"]={"$sum":countfieldvalue};
						}
					}
				}
				self.pipeline.push({"$group":groupquery});
			}
		}, showAdvQuery:function(){
			var self = this;
			
			var pipelinerawselector = ".pipeline";
			
			var pipeline = [];
			self.$(pipelinerawselector).each(function(){
				var pipelinequery = getPipelineRaw($(this));
				pipeline.push(pipelinequery);
			});
			
			if(pipeline.length > 0){
				self.setValue("aggregate-pipeline", JSON.stringify(pipeline, null, '\t'));
				
				self.$("textarea").each(function() {
			        this.style.overflow = 'hidden';
			        this.style.height = 0;
			        this.style.height = this.scrollHeight + 'px';
			    });
			}
			
			function getPipelineRaw(container){
				var _query = {},
					pipelinequery = {},
					pipelinetype = container.data("pipeline-type"),
					groupedfields=[];
				
				$(container).find("input, select, textarea").each(function(){
					var $inputfield = $(this);  
					var name = $(this).attr("name");
					var qvalue = $(this).val();
//					
//					if(qvalue)
//						console.log(qvalue + ' .------ ---- ' + typeof qvalue  + ' ==== === = = ='  + qvalue ? typeof qvalue.length :"");
//					
					if(name && name == "count" && pipelinetype == "$group"){
						if(/^\d+$/.test(qvalue))
							pipelinequery[name] = {"$sum":Number(qvalue)}
						else if(qvalue)
							pipelinequery[name] = {"$sum":qvalue}
					} else if(name && name == "_id" && pipelinetype == "$group"){
						if(qvalue && typeof qvalue == "object" && typeof qvalue.length === "number"){
							pipelinequery[name] = {};
						
							if(qvalue.length > 1)
								for(var index in  qvalue){
									pipelinequery[name][qvalue[index].replace("$", "")] = qvalue[index];
									
									if(groupedfields.length > 0)
										groupedfields.push(" ");
									
									groupedfields.push(qvalue[index]);
								}
							else 
								pipelinequery[name] = qvalue[0];
						} else if(qvalue)
							pipelinequery[name] = qvalue;
						
						if(pipelinequery[name] && typeof pipelinequery[name] === "undefined" ){
							groupedfields = Object.keys(pipelinequery[name]);
						}
					} else if(name && name == "_id_text" && pipelinetype == "$project"){
						if(qvalue && qvalue.indexOf("{") > -1 || qvalue.indexOf("[") > -1)
							pipelinequery[name] = JSON.parse(qvalue);
						else if(!qvalue || (qvalue == "$_id") && groupedfields.length > 0){
							pipelinequery[name] = JSON.parse({"$concat":groupedfields});
						}else
							pipelinequery[name] = "$_id";
					} else if(name && name == "count" && pipelinetype == "$project"){
						if(qvalue && qvalue.indexOf("{") > -1 || qvalue.indexOf("[") > -1)
							pipelinequery[name] = JSON.parse(qvalue);
						else if(qvalue)
							pipelinequery[name] = qvalue;
					} else if( pipelinetype == "$sort" ){
						if(name && name == "sortfield"){
							// get the  filterfield operator
							// get filter field value
							var $sortfieldvalue = $inputfield.closest(".pipeline").find("[name=sortfieldvalue]");
							var sortvalue=1;

							if($sortfieldvalue && $sortfieldvalue.length > 0){
								sortvalue = $sortfieldvalue.val();
							}
							
							if(sortvalue){
								pipelinequery[qvalue] = Number(sortvalue);	
							}
						}
					} else if( pipelinetype == "$match" ){
						if(name && name == "filterfield"){
							// get the  filterfield operator
							// get filter field value
							var $filterfieldoperator = $inputfield.closest(".pipeline").find("[name=filterfieldoperator]");
							var $filterfieldvalue = $inputfield.closest(".pipeline").find("[name=filterfieldvalue]");
							var filtervalue;

							if($filterfieldvalue && $filterfieldvalue.length > 0){
								filtervalue = $filterfieldvalue.val();
							}
							
							if(filtervalue && $filterfieldoperator && $filterfieldoperator.length > 0){
								var filterfieldoperator = $filterfieldoperator.val();
								if(filterfieldoperator && filterfieldoperator == "="){
									pipelinequery[qvalue] = filtervalue;
								}else {
									pipelinequery[qvalue] = {};
									pipelinequery[qvalue][filterfieldoperator]=filtervalue;
								}		
							}
						}
					} else if(name)
						pipelinequery[name] = qvalue;
				});
				
				_query[pipelinetype]=pipelinequery;
				
				return _query;
			}
		}, afterLoad:function(){
			var self = this;
			
			self.$('[name=charttype] option:nth(1)').attr('selected', 'selected');
			self.$('[name=aggregate-query_field]').select2();
			
			self.$(".service-report").prepend(self.$("#aggregate_pipeline_group_template").html());
			self.$('.pipeline-advanced').before(self.$("#aggregate_pipeline_filter_template").html());
			self.$('.pipeline-advanced').before(self.$("#aggregate_pipeline_project_template").html());
			
			self.$('[data-aggregate-field=_id]').select2();

			self.filterrawtemplate = $('.aggregate-filter-raw:first').clone();
			
			if(!self.pipeline)
				self.pipeline = [];
			
//			$('.pipeline').arrangeable();
			$('.pipeline').sortable();
		}, toggleAdvancedQuery:function(event){
			var self = this;
			if(self.$(".advanced").hasClass("open")){
				self.$(".advanced").slideUp("slow", function(){
					self.$(".advanced").removeClass("open");
					self.$(".basic").show();
				});
			}else{
				self.$(".advanced").slideDown("slow", function(){
					self.$(".advanced").addClass("open");
					self.$(".basic").hide();
					
					self.$(".advanced textarea").each(function() {
				        this.style.overflow = 'hidden';
				        this.style.height = 0;
				        this.style.height = this.scrollHeight + 'px';
				    });
				});
			}
		},removeSelectedField:function(event){
			var self= this;
			
			if(!self.filterrawtemplate)
				self.filterrawtemplate = $('.aggregate-filter-raw:first').clone();
			
			var $target = $(event.target);
			if($target.hasClass('remove')){
				var $filterraw = $target.parents(".aggregate-filter-raw:first");
				
				var numberofraw  = $filterraw.siblings('.aggregate-filter-raw').length;
				
				if(numberofraw > 0){
					var field = $('[name=aggregate-query_filter_field]', $filterraw).val();
					
					$filterraw.remove();
				}	
			}else{
				var field = $target.val();
				var selectedfields = [];
				var $filterraw = $target.parents(".aggregate-filter-raw:first");
				
				$('select[name=aggregate-query_filter_field]', $filterraw.siblings('.aggregate-filter-raw')).each(function(){
					selectedfields.push($(this).val());
				});
				
				if(field && _.indexOf(selectedfields, field) != -1) { 
					app.showMessage('error', {title:'field already included', message:'Please select another field, field already included'});
				}else {
					if($filterraw.siblings('.aggregate-filter-raw').length > 0){
						$("[name=aggregate-query_filter_field]", $filterraw.siblings('.aggregate-filter-raw')).filter(function () { return $(this).html() == field; }).remove();
					}
				}
			}
		}, addMoreSorting: function(event){
			var self= this;
			event.preventDefault();
			
			var emptyraws = [];
			$('[name=sortfield]', self.$('.aggregate-sort-raw')).each(function(){
				if(!this.value)
					emptyraws.push(this.name);
			});
			
			if(emptyraws && emptyraws.length > 0){
				app.showMessage('error', {title:'Please fill out the current raw before adding more field', message:'Please fill out the current raw before adding more field'});
			}else{
				var sortrawtemplate = self.$("#aggregate_pipeline_sort_template").html();
				
				var selectedfields = [];
				self.$('.aggregate-sort-raw select[name=sortfield]').each(function(){
					selectedfields.push($(this).val());
				});
				
				if(self.$('.aggregate-sort-raw').lebngth > 0)
					self.$('.aggregate-sort-raw').last().after(sortrawtemplate).show();
				else
					self.$('.service-report').prepend(sortrawtemplate).show();
				
				//self.$('.aggregate-sort-raw').last().after(sortrawtemplate).show();
				
				var $newraw = self.$('.aggregate-sort-raw').last();
				
				var fieldtitle = $('.field-operator', $newraw).html();
				
				$('.field-operator', $newraw).html(fieldtitle + '('+ self.$('.aggregate-sort-raw').length + ')');
				
				$('select[name=sortfield] option', $newraw).each(function(){
					if(this.value && _.indexOf(selectedfields, this.value) != -1)
						$(this).remove();
				});
				$('.aggregate-sort.disabled.remove', $newraw).removeClass('disabled');
			}
		},
		addMoreFilter:function(event){
			var self= this;
			event.preventDefault();
			
			var emptyraws = [];
			$('[name=aggregate-query_filter_field]', self.$('.aggregate-filter-raw')).each(function(){
				if(!this.value)
					emptyraws.push(this.name);
			});
			
			if(emptyraws && emptyraws.length > 0){
				app.showMessage('error', {title:'Please fill out the current raw before adding more field', message:'Please fill out the current raw before adding more field'});
			}else{
				var filterrawtemplate = self.filterrawtemplate.clone();
				
				var selectedfields = [];
				self.$('.aggregate-filter-raw select[name=aggregate-query_filter_field]').each(function(){
					selectedfields.push($(this).val());
				});
				
				self.$('.aggregate-filter-raw').last().after(filterrawtemplate).show();
				
				var $newraw = self.$('.aggregate-filter-raw').last();
				
				var fieldtitle = $('.field-operator', $newraw).html();
				
				$('.field-operator', $newraw).html(fieldtitle + '('+ self.$('.aggregate-filter-raw').length + ')');
				
				$('select[name=aggregate-query_filter_field] option', $newraw).each(function(){
					if(this.value && _.indexOf(selectedfields, this.value) != -1)
						$(this).remove();
				});
				$('.aggregate-filter.disabled.remove', $newraw).removeClass('disabled');
				//$('input, select[name!=aggregate-query_filter_field_operator]', $newraw).val('');
			}
		}, customModelAction:function(event){
			event.preventDefault();
			
			var self = this;
			var pluginid;
			var $target = $(event.target);
			
			if(!$target.is('.modelaction')){
				$target=$target.parents('.modelaction:first');
			}
			
			var modelaction = $target.data('modelaction');
			if(modelaction == 'edit')
				modelaction ='form';
			
			if(modelaction == "aggregate"){
				var query = self.options.url||$target.data('aggregate-query');
				
				if(query){
					var parentblock = $target.parents('.service-report:first');
					
					var aggregatefilter = [];
					var aggregatepipeline;
					/**
					 * Collect aggregate filter in an object
					 */
					var servicereportobject = {};
					$('input:text, select, :radio:checked', parentblock).each(function(){
						servicereportobject[$(this).attr("name")]=$(this).val();
					});
					
					var title = $target.data('aggregate-title');

					/**
					 * Default props for Chart view
					 */
					var chartviewprops = $.extend(ChartView_DEFAULTS, {
						plugin:pluginid,
						charttype:servicereportobject['charttype'],
						"urlRoot":query,
						"title":title
					});
					
					if(true || self.$(".advanced").hasClass("open")){
						aggregatepipeline = self.$("[name=aggregate-pipeline]").val();
						
						/**
						 * aggregate url for mongo db
						 */
						chartviewprops.urlRoot += '?' + getUrlQuery({pipeline:aggregatepipeline});
					}else{
						
						/**
						 * Collect search filter in an array 
						 */
						$('.aggregate-filter-raw', parentblock).each(function(){
							var filterrow = {};
							$('input,select', $(this)).each(function(){
								filterrow[$(this).attr("name")]=$(this).val();
							});
							
							if(filterrow["aggregate-query_filter_field"] && filterrow["aggregate-query_filter_field_value"])
								aggregatefilter.push(filterrow);
						});
						
						var groupbyQuery = generateAggregateQuery(self, servicereportobject);

						var filterQuery = {};
						if(servicereportobject&&servicereportobject['$count']){
							filterQuery['$count'] = servicereportobject['$count'];
							
							if(servicereportobject['$count_operator'])
								filterQuery['$count_operator'] = servicereportobject['$count_operator'];
						}	
						
						if(aggregatefilter && aggregatefilter.length > 0){
							for(var i in aggregatefilter)
								filterQuery = generateSearchQuery(aggregatefilter[i], filterQuery);
						}

						var filterurl = getUrlQuery(filterQuery);
						var groupbyurl = getUrlQuery(groupbyQuery);

						if(groupbyQuery['_id']){
							chartviewprops.title += '(' + groupbyQuery['_id'].join(' vs ') + ')';
						}
						
						/**
						 * aggregate url for mongo db
						 */
						chartviewprops.urlRoot += '?' + getUrlQuery({$match:filterurl, $group:groupbyurl});
					}
					
					parentblock.find('.service-report_results').attr('data-remote-loading', 'reload');
					
					if(parentblock.find('.service-report_results').length <= 0)
						parentblock.append('<div class="service-report_results"></div>');
					
					if(((groupbyQuery && Object.keys(groupbyQuery).length > 0) || aggregatepipeline != "") && parentblock.find('.service-report_results') && parentblock.find('.service-report_results').data('remote-loading') != 'loaded'){
						if(self.reportview)
							self.reportview.undelegateEvents();
						
						var reportview;
						if(servicereportobject["displaytype"] == "table"){
//							var reportview = self.reportview = new Backbone.ChartView({
//								title:chartviewprops.title,
//								
//								model:new BackboneExtModel({
//									name:chartviewprops.name,
//									title:chartviewprops.title,
//									urlRoot:chartviewprops.urlRoot||chartviewprops.url
//								}), afterload:function(){
//									if(this.model && !this.model.get('count') || this.model.get('count').length == 0)
//										app.showMessage('error', {title:'No valid data to plot the chart', message:'Please change your criteria, we could\'nt prepare valid report!'});
//									else {
//										reportview.$('.savefilter').show();
//									}
//								}
//							});
							var reportview = app.getView(_.extend({}, {
								title:chartviewprops.title,
								"templatedir":"templates/",
								templateName:'dynamictable.html'+(servicereportobject.layout ? '?layout='+servicereportobject.layout :''),
								viewmode:"list",
								urlRoot:chartviewprops.urlRoot||chartviewprops.url/*,
								dataroot:'count'*/
							}));
							
							if(reportview){
								reportview.on("afterload", function(){
//									if(this.model && !this.model.get('count') || this.model.get('count').length == 0)
//										app.showMessage('error', {title:'No valid data to plot the chart', message:'Please change your criteria, we could\'nt prepare valid report!'});
//									else {
										reportview.$('.savefilter').show();
//									}
								});
								
								if(servicereportobject["localtemplate"]){
									delete reportview.options.templateName;
								
									reportview.template=servicereportobject["localtemplate"];
								}
								//reportview.load(self.$('#display_preview_div'));
							} else
								throw Error("No view found for specified uri -" + columnprops.id);
						}else {
							var reportview = self.reportview = new Backbone.ChartView({
								title:chartviewprops.title,
								charttype:chartviewprops.charttype||'chartjs-pie',
								"templatedir":"templates/",
								templateName:'canvas.html',
								model:new BackboneExtModel({
									name:chartviewprops.name,
									title:chartviewprops.title,
									urlRoot:chartviewprops.urlRoot||chartviewprops.url
								}), afterload:function(){
									if(this.model && !this.model.get('count') || this.model.get('count').length == 0)
										app.showMessage('error', {title:'No valid data to plot the chart', message:'Please change your criteria, we could\'nt prepare valid report!'});
									else {
										reportview.$('.savefilter').show();
									}
								}
							});
						}
						
						if(reportview)
							app.loadView({view:reportview, container:parentblock.find('.service-report_results')});
					}else
						app.showMessage('error', {title:'Please select all mandatory data', message:'Please select all mandatory data'});
					}
				}else
					self.openActionDialog({type:"confirm", title:self.model.get('id'), action:modelaction});
		}
	});
	
	/**
	 * To generate the search query from the json object
	 */
	function generateAggregateQuery(view, searchobject){
		var groupQuery = {};
		
		var groupbyfield = [];//searchobject["aggregate-query_field"];
		var selevalue = view.$("[name=aggregate-query_field]").select2('data');
		for(var i in selevalue)
			groupbyfield.push(selevalue[i].id);
		
		if(groupbyfield && groupbyfield.length > 0){
			groupQuery['_id'] = groupbyfield;
		}
		
		return groupQuery;
	}
		
	/**
	 * To generate the search query
	 */
	function generateSearchQuery(searchobject, filterQuery){
		var filterQuery = $.extend({}, filterQuery);
		
		var filterfield = searchobject["aggregate-query_filter_field"];
		var filterfieldvalue = searchobject["aggregate-query_filter_field_value"];
		var filterfieldvalue_operator = searchobject["aggregate-query_filter_field_operator"];
		
		if(filterfield && filterfieldvalue){
			if(filterfieldvalue_operator){
				filterQuery[filterfield+'_operator']=filterfieldvalue_operator;
			}
			filterQuery[filterfield]=filterfieldvalue;
		}
		
		return filterQuery;
	}
	
	/**
	 * Get the search query as url parameter string
	 */
	function getUrlQuery(data){
		return Object.keys(data).map(function(k) {
		    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
		}).join('&');
	}
	
	return ReportView;
});