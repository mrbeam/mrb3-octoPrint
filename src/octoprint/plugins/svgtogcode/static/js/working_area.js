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
	
	self.px2mm_factor = 1;
	

	self.move_laser = function(el){
		var x = self.px2mm(event.offsetX);
		var y = self.px2mm(event.toElement.offsetHeight - event.offsetY);
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
		return pos !== undefined ? (self.mm2px(pos.x)  - 15) : -100; // subtract width/2;
		
	};
	self.crosshairY = function(){
		var h = document.getElementById('area_preview').clientHeight;
		var pos = self.state.currentPos();
		return pos !== undefined ? (h - self.mm2px(pos.y)  - 15) : -100; // subtract height/2;
	};

	
	self.workingAreaWidth = function(){
		return self.getDivDimensions()[0];
	};
	
	self.workingAreaHeight = function(){
		return self.getDivDimensions()[1];
	};
	
	self.getDivDimensions = function(){
		var maxH = document.documentElement.clientHeight - $('body>nav').height() - $('footer>*').outerHeight();
		var maxW = $('#workingarea div.span8').innerWidth();
		
		// y/x = 297/216 respectively 594/432
		var hwRatio = self.settings.printer_bedDimensionY() / self.settings.printer_bedDimensionX();
		var w = 0;
		var h = 0;
		if( maxH/maxW > hwRatio) { 
			w = maxW;
			h = maxW * hwRatio;
		} else {
			w = maxH / hwRatio;
			h = maxH;
		}
		var dim = [w,h];
		self.px2mm_factor = self.settings.printer_bedDimensionX() / dim[0];
		return dim;
	};
	
	self.px2mm = function(val){
		return val * self.px2mm_factor;
	};
	
	self.mm2px = function(val){
		return val / self.px2mm_factor;
	};
}


