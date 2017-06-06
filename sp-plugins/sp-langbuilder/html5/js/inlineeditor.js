$(function(){
	var modal=$('#translatorModal').modal({
		show:false,
		backdrop:false
	});
	
	function getSelectionText() {
	    var text = "";
	    
	    if (window.getSelection) {
	        text = window.getSelection().toString();
	    } else if (document.selection && document.selection.type != "Control") {
	        text = document.selection.createRange().text;
	    }
	    
	    return text;
	}

	function inline_translation(event){
		var selectedText = getSelectionText();
		if(selectedText && selectedText.length > 3){
			event.preventDefault();
			$.get('/api/langkey/inlineeditor?key='+selectedText, function(content){
				$('#translatorModal').modal('show');
				
				$('#translatorModal').find('.modal-body').html(content);
				
				var $form = $('#translatorModal').find('#langkey-form');
				
				$form.find(':submit').click(function(event){
					event.preventDefault();
					$form.ajaxSubmit({
						url: $form.attr('action')||'/api/langkey',
						type: 'POST',
						data: $form.serialize(),
						success : function() {
							$('#translatorModal').find('.modal-body').prepend('<label class="bg-success">Successfully saved your content</label>');
							//$form.addClass('submited');
						},error : function() {
							$('#translatorModal').find('.modal-body').prepend('<label class="bg-error">Some problem  while saving</label>');
							//$form.addClass('submited');
						}
					});
					
				});
			});
		}
	}
	
	//check for text double click
	$('body').not(':input').dblclick(function(event){
		inline_translation(event);
	});
});