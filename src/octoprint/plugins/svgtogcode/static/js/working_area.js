$(function(){

	function WorkingAreaViewModel(params) {
		var self = this;
		
		self.parser = new gcParser();

		self.loginState = params[0];
		self.settings = params[1];
		self.state = params[2];
		self.files = params[3];

		self.log = [];

		self.command = ko.observable(undefined);

		self.availableHeight = ko.observable(undefined);
		self.availableWidth = ko.observable(undefined);
		self.px2mm_factor = 1; // initial value
		self.svgDPI = ko.observable(90); // TODO fetch from settings
		self.workingAreaWidthMM = ko.observable(undefined);
		self.workingAreaHeightMM = ko.observable(undefined);
		self.hwRatio = ko.computed(function(){
			// y/x = 297/216 junior, respectively 594/432 senior
			var w = self.workingAreaWidthMM();
			var h = self.workingAreaHeightMM();
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
			var factor = self.svgDPI()/25.4; // scale mm to 90dpi pixels 
			var yShift = self.workingAreaHeightMM(); // 0,0 origin of the gcode is bottom left. (top left in the svg)
			if(!isNaN(factor)){
				m.scale(factor, -factor).translate(0,-yShift);
				return m;
			}
			return m;
		});

		self.placedDesigns = ko.observableArray([]);
		self.working_area_empty = ko.computed(function(){
			return self.placedDesigns().length === 0;
		});

		self.clear = function(){
			snap.selectAll('#userContent>*').remove();
			snap.selectAll('#placedGcodes>*').remove();
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
		
		self.isPlaced = function(file){
			if(file === undefined) return false;

			var filePlaced = ko.utils.arrayFirst(this.placedDesigns(), function(d) {
				return d.name === file.name; 
			});
			return filePlaced;
		};

		self.placeGcode = function(file){
			var previewId = self.getEntryId(file);
			
			if(snap.select('#'+previewId)){
				console.error("working_area placeGcode: file already placed.");
				return;
			} else {
				var g = snap.group();
				g.attr({id: previewId});
				snap.select('#placedGcodes').append(g);
				self.placedDesigns.push(file);
			}
			
			self.loadGcode(file, function(gcode){
				self.parser.parse(gcode, /(m0?3)|(m0?5)/i, function(block){
					var points = [];
					var intensity = -1;
					for (var idx = 0; idx < block.length; idx++) {
						var item = block[idx];
						points.push( [ item.x, item.y ] );
						intensity = item.laser;
					}
					if(points.length > 0)
					self.draw_gcode(points, intensity, '#'+previewId);
					
				});
			});
		};
		
		self.loadGcode = function(file, callback){
			var url = file.refs.download;
			var date = file.date;
			$.ajax({
                url: url,
                data: { "ctime": date },
                type: "GET",
                success: function(response, rstatus) {
                    if(rstatus === 'success'){
						if(typeof(callback) === 'function'){
							callback(response);
						}
                    }
                },
                error: function() {
					console.error("working_area.js placeGcode: unable to load ", url);
                }
            });
			
		};

		self.removeGcode = function(file){
			var previewId = self.getEntryId(file);
			snap.select('#' + previewId).remove();
			self.placedDesigns.remove(file);
		};

		self.placeSVG = function(file) {
			var url = self._getSVGserveUrl(file);
			callback = function (f) {
				var newSvgAttrs = {};
				var root_attrs = f.select('svg').node.attributes;
				var doc_width = null;
				var doc_height = null;
				var doc_viewbox = null;
				
				// iterate svg tag attributes
				for(var i = 0; i < root_attrs.length; i++){ 
					var attr = root_attrs[i];
					
					// get dimensions
					if(attr.name === "width") doc_width = attr.value;
					if(attr.name === "height") doc_height = attr.value;
					if(attr.name === "viewBox") doc_viewbox = attr.value;

					// copy namespaces into group
					if(attr.name.indexOf("xmlns") === 0){
						newSvgAttrs[attr.name] = attr.value;
					}
				}
				
				// scale matrix
				var mat = self.getDocumentViewBoxMatrix(doc_width, doc_height, doc_viewbox);
				var scaleMatrixStr = new Snap.Matrix(mat[0][0],mat[0][1],mat[1][0],mat[1][1],mat[0][2],mat[1][2]).toTransformString();
				newSvgAttrs['transform'] = scaleMatrixStr;
				
				var newSvg = snap.group(f.selectAll("svg>*"));
				var hasText = newSvg.selectAll('text,tspan');
				if(hasText !== null && hasText.length > 0){
					self.svg_contains_text_warning(newSvg);
				}
				newSvg.bake(); // remove transforms
				newSvg.attr(newSvgAttrs);
				var id = self.getEntryId(file); 
				var previewId = self.generateUniqueId(id); // appends -# if multiple times the same design is placed.
				newSvg.attr({id: previewId});
				snap.select("#userContent").append(newSvg);
				newSvg.drag();// TODO debug drag. should not be affected by scale matrix


				file.id = previewId;
				file.previewId = previewId;
				file.url = url;
				
				self.placedDesigns.push(file);
			};
			self.loadSVG(url, callback);
		};

		self.loadSVG = function(url, callback){
			Snap.load(url, callback);
		};
		
		self.removeSVG = function(file){
			snap.select('#'+file.previewId).remove();
			self.placedDesigns.remove(file); 
			// TODO debug why remove always clears all items of this type.
//			self.placedDesigns.remove(function(item){ 
//				console.log("item", item.previewId );
//				//return false;
//				if(item.previewId === file.previewId){ 
//					console.log("match", item.previewId );
//					return true;
//				} else return false;
//			});
		};
		
		self.svg_contains_text_warning = function(svg){
            var error = "<p>" + gettext("The svg file contains text elements.<br/>Please convert them to paths.<br/>Otherwise they will be ignored.") + "</p>";
            //error += pnotifyAdditionalInfo("<pre>" + data.jqXHR.responseText + "</pre>");
            new PNotify({
                title: "Text elements found",
                text: error,
                type: "warn",
                hide: false
            });
			svg.selectAll('text,tspan').remove();
		};
		
		self.getDocumentDimensionsInPt = function(doc_width, doc_height, doc_viewbox){
			if(doc_width === null){
				// assume defaults if not set
				if(doc_viewbox !== null ){
					var parts = doc_viewbox.split(' ');
					if(parts.length === 4){
						doc_width = parts[2];
					}
				}
				if(doc_width === "100%"){
					doc_width = 744.09; // 210mm @ 90dpi
				}
				if(doc_width === null){
					doc_width = 744.09; // 210mm @ 90dpi
				}
			}
			if(doc_height === null){
				// assume defaults if not set
				if(doc_viewbox !== null ){
					var parts = doc_viewbox.split(' ');
					if(parts.length === 4){
						doc_height = parts[3];
					}
				}
				if(doc_height === "100%"){
					doc_height = 1052.3622047 // 297mm @ 90dpi
				}
				if(doc_height === null){
					doc_height = 1052.3622047 // 297mm @ 90dpi
				}
			}
			
			var widthPt = self.unittouu(doc_width);
			var heightPt = self.unittouu(doc_height);
			
			return [widthPt, heightPt];
		};
		
		self.getDocumentViewBoxMatrix = function(widthStr, heightStr, vbox){
			var dim = self.getDocumentDimensionsInPt(widthStr, heightStr, vbox)
			if(vbox !== null ){
				var widthPx = dim[0];
				var heightPx = dim[1];
				var parts = vbox.split(' ');
				if(parts.length === 4){
					var offsetVBoxX = parseFloat(parts[0]);
					var offsetVBoxY = parseFloat(parts[1]);
					var widthVBox = parseFloat(parts[2]) - parseFloat(parts[0]);
					var heightVBox = parseFloat(parts[3]) - parseFloat(parts[1]);

					var fx = widthPx / widthVBox;
					var fy = heightPx / heightVBox;
					var dx = offsetVBoxX * fx;
					var dy = offsetVBoxY * fy;
					return [[fx,0,0],[0,fy,0], [dx,dy,1]];

				}
			}
			return [[1,0,0],[0,1,0], [0,0,1]]
		};
		
		//a dictionary of unit to user unit conversion factors
		self.uuconv = {
			'in':90.0,
			'pt':1.25, 
			'px':1, 
			'mm':3.5433070866, 
			'cm':35.433070866, 
			'm':3543.3070866,
			'km':3543307.0866, 
			'pc':15.0, 
			'yd':3240 , 
			'ft':1080
		};
					
		// Returns userunits given a string representation of units in another system'''
		self.unittouu = function(string){
			var unit_re = new RegExp('(' + Object.keys(self.uuconv).join('|') +')$');
			
			var unit_factor = 1;
			var u_match = string.match(unit_re);
			if(u_match !== null){
				var unit = string.substring(u_match.index);
				string = string.substring(0,u_match.index);
				if(self.uuconv[unit])
					unit_factor = self.uuconv[unit];
			}

			var p = parseFloat(string);
			if(p)
				return p * unit_factor;
			return 0;
		};
				
		self._getSVGserveUrl = function(file){
			if (file && file["refs"] && file["refs"]["download"]) {
				var url = file.refs.download.replace("downloads", "serve") +'?'+ Date.now(); // be sure to avoid caching.
				return url;
			}
			
		};
		
		self.templateFor = function(data) {
			var extension = data.name.split('.').pop().toLowerCase();
			if (extension === "svg") {
				return "wa_template_" + data.type + "_svg";
			} else {
				return "wa_template_" + data.type;
			}
		};
		
		self.getEntryId = function(data) {
			return "wa_" + md5(data["origin"] + ":" + data["name"]);
		};

		self.getEntryElement = function(data) {
			var entryId = self.getEntryId(data);
			var entryElements = $("#" + entryId);
			if (entryElements && entryElements[0]) {
				return entryElements[0];
			} else {
				return undefined;
			}
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

		self.generateUniqueId = function(idBase){
			var suffix = 0;
			var id = idBase + "-" + suffix;
			while(snap.select('#'+id) !== null){
				suffix += 1;
				id = idBase + "-" + suffix;
			}
			return id;
		};

		self.getCompositionSVG = function(){
			var tmpsvg = snap.select("#userContent").innerSVG(); // get working area 
			if(tmpsvg !== ''){
				var dpiFactor = self.svgDPI()/25.4; // convert mm to pix 90dpi for inkscape, 72 for illustrator 
				var w = dpiFactor * self.workingAreaWidthMM(); 
				var h = dpiFactor * self.workingAreaHeightMM(); 
	//			var w = dpiFactor * self.settings.printerProfiles.currentProfileData().volume.width; 
	//			var h = dpiFactor * self.settings.printerProfiles.currentProfileData().volume.depth; 

				var svg = '<svg height="'+ h +'" version="1.1" width="'+ w +'" xmlns="http://www.w3.org/2000/svg"><defs/>'+ tmpsvg +'</svg>';
				return svg;
			} else {
				return;
			}
		};
		
		self.getPlacedGcodes = ko.computed(function() {
			var gcodeFiles = [];
			ko.utils.arrayForEach(self.placedDesigns(), function(design) {
				if(design.type === 'machinecode') gcodeFiles.push(design);
			});
			return gcodeFiles;
		}, self);
	
		
		self.draw_gcode = function(points, intensity, target){
			var stroke_color = intensity === 0 ? '#BBBBBB' : '#FF0000';
			var d = 'M'+points.join(' ');
			var p = snap.path(d).attr({
				fill: "none",
				stroke: stroke_color,
				strokeWidth: 1
			});
			snap.select(target).append(p);
		};
		self.clear_gcode = function(){
//			console.log("gcodeprev clear");
			snap.select('#gCodePreview').clear();
		};

		self.onStartup = function(){
			GCODE.workingArea = self; // Temporary hack to use the gcode parser from the gCodeViewer
			self.state.workingArea = self;
			self.files.workingArea = self;
			
			$(window).resize(function(){
				self.trigger_resize();
			});
			self.trigger_resize(); // initialize
			self.init();
		};
	}


    // view model class, parameters for constructor, container to bind to
    ADDITIONAL_VIEWMODELS.push([WorkingAreaViewModel, 
		["loginStateViewModel", "settingsViewModel", "printerStateViewModel",  "gcodeFilesViewModel"], 
		[document.getElementById("area_preview"), document.getElementById("working_area_files")]]);

});