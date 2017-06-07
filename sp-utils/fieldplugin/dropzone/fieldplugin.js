define( [
	"/uiplugin/dropzone/dropzone-amd-module.js"
], function(Dropzone){
	"use strict";
	
	var _dropzone_preview_template_= '<div id="dropzone_template" class="file-row">\
		<!-- This is used as the file preview template -->\
		<div>\
			<span class="preview"><img class="img-thumbnail" data-dz-thumbnail /></span>\
		</div>\
		<div>\
			<p class="name" data-dz-name></p>\
			<strong class="error text-danger" data-dz-errormessage></strong>\
		</div>\
		<div>\
			<p class="size" data-dz-size></p>\
			<div class="progress progress-striped active" role="progressbar"\
				aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">\
				<div class="progress-bar progress-bar-success" style="width: 0%;"\
					data-dz-uploadprogress></div>\
			</div>\
		</div>\
		<div>\
			<button class="btn btn-primary start">\
				<i class="glyphicon glyphicon-upload"></i> <span>Start</span>\
			</button>\
			<button data-dz-remove class="btn btn-warning cancel">\
				<i class="glyphicon glyphicon-ban-circle"></i> <span>Cancel</span>\
			</button>\
			<button data-dz-remove class="btn btn-danger delete">\
				<i class="glyphicon glyphicon-trash"></i> <span>Delete</span>\
			</button>\
		</div>\
	</div>';
	
	var _dropzone_template_='\
		<div class="row">\
			<div class="col-sm-12">\
				<div class="dropzone thumbnail" action="<%= url %>">\
					<div class="dz-message">Drop files here or click to upload.</div>\
				</div>\
			</div>\
			<div class="col-sm-12">\
				<span class="fileupload-process">\
					<div id="total-progress" class="progress progress-striped active"\
						role="progressbar" aria-valuemin="0" aria-valuemax="100"\
						aria-valuenow="0">\
						<div class="progress-bar progress-bar-success" style="width: 0%;" data-dz-uploadprogress=""></div>\
					</div>\
				</span>\
			</div>\
		</div>\
		<hr />\
		<div class="table table-striped" class="files" id="<%= field %>_preview"></div>\
		';	
	
	if(Dropzone){
		Dropzone.options.myAwesomeDropzone = false;
		Dropzone.autoDiscover = false;
	}
	
	var dropzone = function(fieldsetting, element, view){
		// Get the template HTML and remove it from the document the template HTML and remove it from the document
		var $previewEl = view.$("#dropzone_template");
		$previewEl.removeAttr("id").show();
		
		var previewtemplate = $previewEl.parent().clone().html();
		$previewEl.remove();
		
		var $container = view.$("#" +fieldsetting.field + "_container");
			if($container.length == 0 )
				$container= view.$("#" +fieldsetting.field + "container");
		var url = view.$('form').attr('action');

		if($container.length == 0 && view.$("#"+fieldsetting.field) && view.$("#"+fieldsetting.field).data('fieldplugin') == "dropzone"){
			if(view.$("#"+fieldsetting.field).data('url'))
				url = view.$("#"+fieldsetting.field).data('url');
			
			var dtemplate = _.template(_dropzone_template_)({field:fieldsetting.field, url:url});
			
			if($container.length == 0){
				view.$("#"+fieldsetting.field).parent().append('<div id="'+fieldsetting.field+'_container">'+dtemplate+'</div>');
				$container = view.$("#"+fieldsetting.field+"_container");
			}else
				$container.append(dtemplate);
		} else if($container.length > 0){
			if(view.$("#"+fieldsetting.field).data('url') || $container.data('url'))
				url = view.$("#"+fieldsetting.field).data('url') || $container.data('url');
			
			var dtemplate = _.template(_dropzone_template_)({field:fieldsetting.field, url:url});
			
			$container.append(dtemplate);
		}
		
		var selector = fieldsetting.field + 'dropzone';
		
		var options = {
			url: url||view.model.url(),//  Set the url
			maxFilesize:1000,
			thumbnailWidth: 80,
		  	thumbnailHeight: 80,
		  	parallelUploads: 1,
		  	previewTemplate: _dropzone_preview_template_,
		  	autoQueue: false, // Make sure the files aren't queued until manually added
		  	previewsContainer: $container.selector + " #" + fieldsetting.field + "_preview", // Define the container to display the previews
		  	clickable:'.dz-message'
		};
		
		options = _.extend(options, fieldsetting.displayoptions);
		
		var myDropzone = view[ selector ] = new Dropzone($container[0], options);

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
	
	if(window.Backbone && window.Backbone.FieldPlugins)
		window.Backbone.FieldPlugins['dropzone'] = dropzone;
	
	return dropzone;
});