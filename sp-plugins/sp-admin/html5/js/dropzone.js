define([
    "/uiplugin/dropzone/dropzone-amd-module.js", 
    "/uiplugin/backbone-ext/src/backbone-ext.js"
], function(_dropzone, Backbone){
	window.Dropzone = _dropzone;
	
	var dropzone = Backbone.Fieldplugins.dropzone = function(fieldsetting, element, view){
		// Get the template HTML and remove it from the doument the template HTML and remove it from the doument
		var $previewEl = view.$("#dropzone_template");
		$previewEl.removeAttr("id").show();
		var previewtemplate = $previewEl.parent().clone().html();
		$previewEl.remove();
		
		var $container = view.$("#"+fieldsetting.field+"_container");
		var selector = fieldsetting.field + 'dropzone';
		
		var url = view.$('form').attr('action');
		
		var myDropzone = view[ selector ] = new Dropzone($container[0], { // Make the whole body a dropzone
			url: url||view.model.url(),//  Set the url
			maxFilesize:1000,
			thumbnailWidth: 80,
		  	thumbnailHeight: 80,
		  	parallelUploads: 1,
		  	previewTemplate: previewtemplate,
		  	autoQueue: false, // Make sure the files aren't queued until manually added
		  	previewsContainer: "#" + fieldsetting.field + "_preview", // Define the container to display the previews
		  	clickable: fieldsetting.clickable||".fileinput-button" // Define the element that should be used as click trigger to select files.
		});

		myDropzone.on("addedfile", function(file) {
			// Hookup the start button
			file.previewElement.querySelector(".start").onclick = function() { myDropzone.enqueueFile(file); };
		});

		// Update the total progress bar
		myDropzone.on("totaluploadprogress", function(progress) {
			document.querySelector("#total-progress .progress-bar").style.width = progress + "%";
		});

		myDropzone.on("sending", function(file) {
			// Show the total progress bar when upload starts
			document.querySelector("#total-progress").style.opacity = "1";
			// And disable the start button
			file.previewElement.querySelector(".start").setAttribute("disabled", "disabled");
		});

		// Hide the total progress bar when nothing's uploading anymore
		myDropzone.on("queuecomplete", function(progress) {
			document.querySelector("#total-progress").style.opacity = "0";
		});

		// Setup the buttons for all transfers
		// The "add files" button doesn't need to be setup because the config
		// `clickable` has already been specified.
		view.$("#actions .start", $container).onclick = function() {
			myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
		};
		
		view.$("#actions .cancel", $container).onclick = function() {
			myDropzone.removeAllFiles(true);
		};
		
		return view[ selector];
	};
	
	if(window)
		window.Backbone.Fieldplugins.dropzone=dropzone;
	
	return _dropzone;
});