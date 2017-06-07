var configurationurl;// = '/configuration/editorsettings' + location.search;

if(window.location.hash != "") {
	configurationurl = window.location.hash.replace("#", "") + location.search;
}else
	configurationurl = 'serverconfig' + location.search;

if(configurationurl)
	$.get(configurationurl, function(editorsettings){
		if(editorsettings)
			loadConfigurationForm(editorsettings);
	}, 'json');

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

