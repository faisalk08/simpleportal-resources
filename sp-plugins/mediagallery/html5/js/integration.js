define( [
    "/uiplugin/blueimpgallery/Gallery-2.21.3/js/blueimp-gallery.js"
], function( blueimp) {
	var exports = this;
	
	loadDynamicAjaxContent($(document))
	
	function loadDynamicPhotoGalleryFromURL($container){
		if($(".imagegallery", $container).length > 0){
			$('.imagegallery a', $container).on('click', function (event) {
				event.preventDefault();
		        event = event || window.event;
		        var target = event.target || event.srcElement,
		            link = target.href ? target : target.parentNode.href ? target.parentNode : target
		        	
		        var id = encodeURI(link.href).replace(/(\:|\.|\&|\?|\/|\\)/ig, '');
		        
		        if($(".photoalbums", $container).length > 0 && $(".photoalbums [data-photoalbumid='"+id+"']", $container).length <= 0){
		        	$(".photoalbums", $container).append('<div class="row" data-ajax="true" data-photoalbumid="'+id+'" data-ajax-url="'+link.href+'" ></div>');
		        	
		        	loadDynamicAjaxContent($(".photoalbums", $container), function(){
		        		$(document).scrollTo($(".photoalbums [data-photoalbumid='"+id+"']", $container));
		        	});
		        } else
		        	$(document).scrollTo($(".photoalbums [data-photoalbumid='"+id+"']", $container));
		    });
		}
	}
	
	function loadDynamicPhotoGallery($container){
		if($(".blueimpgallery", $container).length > 0){
			var links = $('.blueimpgallery .thumbnail a', $container);
			
			$('.blueimpgallery .thumbnail a', $container).on('click', function (event) {
				event.preventDefault();
		        event = event || window.event;
		        var target = event.target || event.srcElement,
		            link = target.src ? target.parentNode : target,
		            options = {index: link, event: event};
		        
		        blueimp(links, options);
		    });
		}
	}
	
	function loadDynamicAjaxContent($maincontainer, callback){
		$('[data-ajax="true"]', $maincontainer).each(function(){
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
				    		
				    		loadDynamicAjaxContent($container); // call multi level ajax loading
				    		loadDynamicPhotoGallery($container); // call multi level photo gallery
				    		loadDynamicPhotoGalleryFromURL($container);
				    		
				    		if(callback)
				    			callback();
				    	}
				    }
				});
			}
		});
	}
});