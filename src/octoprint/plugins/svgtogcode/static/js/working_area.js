function WorkingAreaViewModel(loginStateViewModel, settingsViewModel, printerStateViewModel) {
    var self = this;

    self.loginState = loginStateViewModel;
    self.settings = settingsViewModel;
    self.state = printerStateViewModel;

    self.log = [];

    self.command = ko.observable(undefined);

    self.isErrorOrClosed = ko.observable(undefined);
    self.isOperational = ko.observable(undefined);
    self.isPrinting = ko.observable(undefined);
    self.isPaused = ko.observable(undefined);
    self.isError = ko.observable(undefined);
    self.isReady = ko.observable(undefined);
    self.isLoading = ko.observable(undefined);
	

	self.move_laser = function(el){
		var x = event.offsetX;
		var y = event.toElement.offsetHeight - event.offsetY;
		var command = "G0 X"+x+" Y"+y;
		$.ajax({
			url: API_BASEURL + "printer/command",
			type: "POST",
			dataType: "json",
			contentType: "application/json; charset=UTF-8",
			data: JSON.stringify({"command": command})
		});
	};
	
	self.crosshairX = function(){
		var pos = self.state.currentPos(); 
		return pos !== undefined ? (pos.x  - 15) : -100; // subtract width/2;
		
	};
	self.crosshairY = function(){
		var h = document.getElementById('area_preview').clientHeight;
		var pos = self.state.currentPos();
		return pos !== undefined ? (h - pos.y  - 15) : -100; // subtract height/2;
	};

	


}


