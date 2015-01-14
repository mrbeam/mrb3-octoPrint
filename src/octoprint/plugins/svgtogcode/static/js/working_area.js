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
	
	self.availableHeight = ko.observable(undefined);
	self.availableWidth = ko.observable(undefined);
	self.px2mm_factor = 1; // initial value
	self.hwRatio = ko.computed(function(){
		// y/x = 297/216 respectively 594/432
		var ratio = self.settings.printer_bedDimensionY() / self.settings.printer_bedDimensionX();
		return ratio;
	}, self);
	
	self.workingAreaDim = ko.computed(function(){
		var maxH = self.availableHeight();
		var maxW = self.availableWidth();
		var hwRatio = self.hwRatio(); 
		if( hwRatio > 0, maxH > 0, maxW > 0){
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
			return dim;
		}
	});
	
	self.workingAreaWidth = ko.computed(function(){
		var dim = self.workingAreaDim();
		return dim ? dim[0] : 1;
	}, self);
	
	self.workingAreaHeight = ko.computed(function(){
		var dim = self.workingAreaDim();
		return dim ? dim[1] : 1;
	}, self);
	
	self.px2mm_factor = ko.computed(function(){
		return self.settings.printer_bedDimensionX() / self.workingAreaWidth();
	});
	
	self.scaleMatrix = ko.computed(function(){
		var m = new Snap.Matrix();
		m.scale(25.4/90 * 1/self.px2mm_factor());
		return m;
	});
	
	self.placedDesigns = ko.observableArray([]);
	
	self.trigger_resize = function(){
		self.availableHeight(document.documentElement.clientHeight - $('body>nav').outerHeight()  - $('footer>*').outerHeight() - 39); // magic number
		self.availableWidth($('#workingarea div.span8').innerWidth());
	};

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
		
	self.px2mm = function(val){
		return val * self.px2mm_factor();
	};
	
	self.mm2px = function(val){
		return val / self.px2mm_factor();
	};
	
	//self.getDivDimensions(); // init
	
	self.placeSVG = function(url){
		console.log("workingarea", url);
		Snap.load(url, function (f) {
			var newSvg = f.select("g");
			var id = self.generateId(url);
			newSvg.attr("id", id);
			snap.select("#scaleGroup").append(newSvg);
			
			newSvg.drag();// Making croc draggable. Go ahead drag it around!
			// Obviously drag could take event handlers too
			var ref = {
				id : id,
				url : url
			};
			self.placedDesigns.push(ref);
		});
	};
	
	self.init = function(){
		// init snap.svg
		snap = Snap('#area_preview');

	};
	
	self.generateId = function(url){
		var idBase = '_'+url.substring(url.lastIndexOf('/')+1).replace('.', '-'); // _ at first place if filename starts with a digit
		var suffix = 0;
		var id = idBase + "-" + suffix;
		while(snap.select('#'+id) !== null){
			suffix += 1;
			id = idBase + suffix;
		}
		return id;
	};
}


