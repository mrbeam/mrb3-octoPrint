$(function(){

	function WorkingAreaViewModel(params) {
		var self = this;

		self.loginState = params[0];
		self.settings = params[1];
		self.state = params[2];
		self.files = params[3];
		self.conversion = params[4];

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
		self.svgDPI = ko.observable(90); // TODO fetch from settings
		self.workingAreaWidthMM = ko.observable(undefined);
		self.workingAreaHeightMM = ko.observable(undefined);
		self.hwRatio = ko.computed(function(){
			// y/x = 297/216 respectively 594/432
			var w = self.workingAreaWidthMM();
			var h = self.workingAreaHeightMM();
	//		var h = self.settings.printerProfiles.currentProfileData().volume.depth();
	//		var w = self.settings.printerProfiles.currentProfileData().volume.width();
			var ratio = h / w;
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

		self.workingAreaWidthPx = ko.computed(function(){
			var dim = self.workingAreaDim();
			return dim ? dim[0] : 1;
		}, self);

		self.workingAreaHeightPx = ko.computed(function(){
			var dim = self.workingAreaDim();
			return dim ? dim[1] : 1;
		}, self);

		self.px2mm_factor = ko.computed(function(){
			return self.workingAreaWidthMM() / self.workingAreaWidthPx();
		});

		// matrix scales svg units to display_pixels
		self.scaleMatrix = ko.computed(function(){
			var m = new Snap.Matrix();
			var factor = 25.4/self.svgDPI() * 1/self.px2mm_factor();
			if(!isNaN(factor)){
				m.scale(factor);
				return m;
			}
			return m;
		});
		
		// matrix scales svg units to display_pixels
		self.scaleMatrixMMtoDisplay = ko.computed(function(){
			var m = new Snap.Matrix();
			var factor = self.svgDPI()/25.4 ;
			if(!isNaN(factor)){
				m.scale(factor);
				return m;
			}
			return m;
		});

		self.placedDesigns = ko.observableArray([]);

		self.clear = function(){
			snap.selectAll('#userContent>*').remove();
			self.placedDesigns([]);
		};

		self.trigger_resize = function(){
			self.availableHeight(document.documentElement.clientHeight - $('body>nav').outerHeight()  - $('footer>*').outerHeight() - 39); // magic number
			self.availableWidth($('#workingarea div.span8').innerWidth());
		};

		self.move_laser = function(el){
			if(self.state.isOperational() && !self.state.isPrinting()){
				var x = self.px2mm(event.offsetX);
		//		var y = self.px2mm(event.toElement.offsetHeight - event.offsetY); // toElement.offsetHeight is always 0 on svg>* elements ???
				var y = self.px2mm(event.toElement.ownerSVGElement.offsetHeight - event.offsetY); // hopefully this works across browsers
				$.ajax({
					url: API_BASEURL + "printer/printhead",
					type: "POST",
					dataType: "json",
					contentType: "application/json; charset=UTF-8",
					data: JSON.stringify({"command": "position", x:x, y:y})
				});
			}
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

		self.mm2svgUnits = function(val){
			return val * self.svgDPI()/25.4;
		};

		//self.getDivDimensions(); // init

		self.placeSVG = function(file) {
			if (file && file["refs"] && file["refs"]["download"]) {
				var url = file.refs.download.replace("downloads", "serve");
				self.loadSVG(url);
			}
		};

		self.loadSVG = function(url){
			Snap.load(url, function (f) {
				var namespaces = {};
				var root = f.select('svg').node.attributes;
				for(var i = 0; i < root.length; i++){ 
					var attr = root[i];
					if(attr.name.indexOf("xmlns") === 0){
						namespaces[attr.name] = attr.value;
					}
				}

				var newSvg = f.select("g");
				newSvg.attr(namespaces);
				var id = self.generateId(url);
				snap.select("#userContent").append(newSvg);

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
			self.px2mm_factor.subscribe(function(newVal){
				if(!isNaN(newVal))
					self.draw_coord_grid();
			});
		};

		self.draw_coord_grid = function(){
			var grid = snap.select('#coordGrid');
			if(grid.attr('fill') === 'none'){
				var w = self.mm2svgUnits(self.workingAreaWidthMM());
				var h = self.mm2svgUnits(self.workingAreaHeightMM());
				var max_lines = 20;

				var linedistMM = Math.floor(Math.max(self.workingAreaWidthMM(), self.workingAreaHeightMM()) / (max_lines * 10))*10;
				var yPatternOffset = self.mm2svgUnits(self.workingAreaHeightMM() % linedistMM);
				var linedist = self.mm2svgUnits(linedistMM);

				var marker = snap.circle(linedist/2, linedist/2, 1).attr({
					fill: "#000000",
					stroke: "none",
					strokeWidth: 1
				});

				// dot pattern
				var p = marker.pattern(0, 0, linedist, linedist);
				p.attr({
					x: linedist/2,
					y: linedist/2 + yPatternOffset
				});

				grid.attr({
					width: w,
					height: h,
					fill: p
				});
			}
		};

		self.generateId = function(url){
			var idBase = '_'+url.substring(url.lastIndexOf('/')+1).replace(/[^a-zA-Z0-9_.]/ig, '-'); // _ at first place if filename starts with a digit
			idBase = idBase.replace('')
			var suffix = 0;
			var id = idBase + "-" + suffix;
			while(snap.select('#'+id) !== null){
				suffix += 1;
				id = idBase + suffix;
			}
			return id;
		};

		self.getCompositionSVG = function(){
			var dpiFactor = self.svgDPI()/25.4; // convert mm to pix 90dpi for inkscape, 72 for illustrator 
			var w = dpiFactor * self.settings.printerProfiles.currentProfileData().volume.width; 
			var h = dpiFactor * self.settings.printerProfiles.currentProfileData().volume.depth; 

			var tmpsvg = snap.select("#userContent").innerSVG(); // get working area 
			var svg = '<svg height="'+ h +'" version="1.1" width="'+ w +'" xmlns="http://www.w3.org/2000/svg"><defs/>'+ tmpsvg +'</svg>';
			return svg;
		};
		
		self.draw_gcode = function(points, intensity){
			var stroke_color = intensity === 0 ? '#BBBBBB' : '#FF0000';
			var d = 'M'+points.join(' ');
			var p = snap.path(d).attr({
				fill: "none",
				stroke: stroke_color,
				strokeWidth: 1
			});
			snap.select('#gCodePreview').append(p);
		};

		self.onStartup = function(){
			GCODE.workingArea = self; // Temporary hack to use the gcode parser from the gCodeViewer
			self.files.workingArea = self;
			self.conversion.workingArea = self;
			$(window).resize(function(){
				self.trigger_resize();
			});
			self.trigger_resize(); // initialize
			self.init();
		};
	}


    // view model class, parameters for constructor, container to bind to
    ADDITIONAL_VIEWMODELS.push([WorkingAreaViewModel, "workingAreaViewModel",
		["loginStateViewModel", "settingsViewModel", "printerStateViewModel",  "gcodeFilesViewModel", "vectorConversionViewModel"], 
		document.getElementById("area_preview")]);

});