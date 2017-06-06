define( [
    "/uiplugin/backbone-ext/src/backbone-ext.js",
    "/uiplugin/blueimpgallery/Gallery-2.21.3/js/blueimp-gallery.js"
], function( Backbone, blueimp) {
	var exports = this;
	
	exports.MediadirlistView = Backbone.ListView.extend({
		afterLoad:function(){
			var self = this;
			
			this.model.models.forEach(function(model){
				if(model.get("thumbnail")){
					var uri = model.get("uri") + '/' + model.get("path");
					
					self.$('[data-id='+model.get("id")+'] td:first a').prepend("<img src="+ (uri + model.get("thumbnail")) +" class='img-thumbnail img-rounded'/>")
				}
			});
		}
	});
	
	exports.MediadirdetailsView = Backbone.DetailsView.extend({
		modelaction:{
			photogallery:function(actionprops){
				var self = this;
				$.get(actionprops.action, function(data){
					app.openDialog({message:data+'', 
						open:function(modal){
							// let us check u have the html template for the images
						}, close:function(){
						}
					});
				});
			}
		}, afterLoad:function(){
			var self = this;
			
			Backbone.Fieldplugins.register(self.fieldsettings.mediafiles, null, self);
			
			if(self['mediafilesdropzone']){
				self['mediafilesdropzone'].url = self.model.url() + "/upload";
				
				self['mediafilesdropzone'].on("sending", function(file, xhr, data) {
					var modelobj = self.model.toJSON();
					
					for(var key in modelobj){
						data.append(key, modelobj[key]);
					}
					app.blockUI(self.$el);
					return false;
				});
				
				self['mediafilesdropzone'].on("complete", function(file, data) {
					app.unblockUI(self.$el);
					
					self['mediafilesdropzone'].removeFile(file);
					
					if(file.accepted && file.xhr.status == "200"){
						console.log(file);
					}
				});
			}
			
			$('[data-ajax="true"]', $(self.el)).each(function(){
				var ajaxUrl = $(this).data("ajax-url");
				var $container = $(this);
				if(ajaxUrl){
					$.ajax({
					    type: "GET",
					    contentType: "text/html",
					    url: ajaxUrl,
					    complete:function(response){
					    	if(response.status == 200){
					    		$container.html(response.responseText);
					    		
					    		var links = $('.blueimpgallery .thumbnail a', $container);
								
					    		$('.blueimpgallery a', $container).on('click', function (event) {
					    			event.preventDefault();
							        event = event || window.event;
							        var target = event.target || event.srcElement,
							            link = target.src ? target.parentNode : target,
							            options = {index: link, event: event};
							        
							        blueimp(links, options);
							    });
					    	}
					    }
					});
				}
			});
		}
	});
	
	exports.VideogallerydetailsView = Backbone.DetailsView.extend({
		modelaction:{
			videoplayer:function(actionprops){
				var self = this;
				$.get(actionprops.action, function(data){
					app.openDialog({message:data+'', 
						open:function(modal){
							$(".flowplayer", modal).flowplayer();
						}, close:function(){
							$(".flowplayer", modal).remove();
						}
					});
				});
			}
		}
	});
	
	exports.VideogallerylistView = Backbone.ListView.extend({
		afterLoad:function(){
			var self = this;
			
			if(!this.modelaction)
				this.modelaction = {};
			
			this.modelaction.videoplayer = function(actionprops){
				$.get(actionprops.action, function(data){
					app.openDialog({message:data+'', 
						open:function(modal){
							self.flowplayer = $(".flowplayer", modal).flowplayer();
						}, close:function(){
							$(".flowplayer", modal).remove();
						}
					});
				});
			};
		}
	});
});