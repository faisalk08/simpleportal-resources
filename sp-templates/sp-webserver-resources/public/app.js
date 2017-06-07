$(function(){
	$('[data-ajax=true]').each(function(){
		var ajaxurl = $(this).data("ajax-url");
		
		var $container = $(this);
		if(ajaxurl){
			$.ajax({url: ajaxurl, success: function(ajaxcontent){
				if(ajaxcontent){
					$container.html(ajaxcontent);
				}
		    }});
		}
	});
});