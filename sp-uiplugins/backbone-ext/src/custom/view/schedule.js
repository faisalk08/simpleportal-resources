define( [
	"./core.js"
], function(CustomBackboneView){
	"use strict";
	
	/**
	 * Customized view for chart view
	 */
	var ScheduleView = CustomBackboneView.extend({
		template:'<h1>Scheduer view</h1><div class="scheduleview"></div>',
		afterLoad:function(){
			var self= this;
			
			$.get(self.schedulesource(), function(data){
				self.$('.scheduleview').graspSchedule({
					schedules:data.schedules,
					events:[]
				});
			});
			
//			var schedules = [ //"schedules" is list for events which have start and end.
//			                  {
//			                      end: "2014/05/10 3:00",
//			                      start: "2014/05/10 1:40",
//			                      title: "Meeting A"
//			                  },
//			                  {
//			                      end: "2014/05/10 2:41",
//			                      start: "2014/05/10 2:30",
//			                      title: "Conference B <br>", //You can use html tags
//			                      css:{backgroundColor:"#f39c12",height:"100px"}
//			                     //You can use most of CSS properties.But only pixel is allow for height.
//			                  }
//			              ];
//			          var events = [ //"events" is list for events which have only one time.
//			                  {
//			                      date: "2014/05/10 16:00",
//			                      title: "tweeted at this time."
//			                  },
//			                  {
//			                      date: "2014/05/10 17:00",
//			                      title: "You can use media. <br><img src='http://wepia.biz/wlogo.png'/>",
//			                      css:{height:"302px"}
//			                      //You can use most of CSS properties.But only pixel is allow for height.
//			                  }
//			              ]; 
//			          
//			          self.$('.scheduleview').graspSchedule({
//			        	    schedules:schedules,
//			        	    events:events
//			        	});
		}
	});
	
	return ScheduleView;
});