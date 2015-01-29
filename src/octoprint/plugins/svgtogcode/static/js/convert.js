$(function(){
	

	function VectorConversionViewModel(params) {
		var self = this;
		
				console.log('conversion', params);


		self.loginState = params[0];
		self.settings = params[1];
		self.state = params[2];
		self.workingArea = params[3];
		self.files = params[4];

		self.target = undefined;
		self.file = undefined;
		self.data = undefined;

		self.defaultSlicer = undefined;
		self.defaultProfile = undefined;

		self.gcodeFilename = ko.observable();
		self.laserIntensity = ko.observable(undefined);
		self.laserSpeed = ko.observable(undefined);
		self.maxSpeed = ko.observable(3000);
		self.minSpeed = ko.observable(30);
		self.title = ko.observable(undefined);
		self.slicer = ko.observable();
		self.slicers = ko.observableArray();
		self.profile = ko.observable();
		self.profiles = ko.observableArray();

		self.maxSpeed.subscribe(function(val){
			self._configureFeedrateSlider();
		});

		// TODO check if still in use
		self.show = function(target, file) {
			self.target = target;
			self.file = file;
			self.title(_.sprintf(gettext("Converting %(filename)s"), {filename: self.file}));
			self.gcodeFilename(self.file.substr(0, self.file.lastIndexOf(".")));
			$("#dialog_vector_graphics_conversion").modal("show");
		};

		// shows conversion dialog and extracts svg first
		self.show_conversion_dialog = function() {
			var intensity = self.settings.settings.plugins.svgtogcode.defaultIntensity();
			var speed = self.settings.settings.plugins.svgtogcode.defaultIntensity();
			self.laserIntensity(intensity);
			self.laserSpeed(speed);

			self.svg = self.workingArea.getCompositionSVG();

			// TODO: js svg conversion
			self.title(gettext("Converting"));
			var gcodeFile = self.create_gcode_filename(self.workingArea.placedDesigns());
			self.gcodeFilename(gcodeFile);
			$("#dialog_vector_graphics_conversion").modal("show");
		};

		self.create_gcode_filename = function(placedDesigns){
			if(placedDesigns.length > 0){
				var filemap = {};
				for(var idx in placedDesigns){
					var design = placedDesigns[idx];
					var start = design.url.lastIndexOf('/')+1;
					var end = design.url.lastIndexOf('.');
					var name = design.url.substring(start, end);
					if(filemap[name] !== undefined) filemap[name] += 1;
					else filemap[name] = 1;
				}
				var mostPlaced;
				var placed = 0;
				for(var name in filemap){
					if(filemap[name] > placed){
						mostPlaced = name;
						placed = filemap[name];
					}
				}
				var uniqueDesigns = Object.keys(filemap).length;
				var gcode_name = mostPlaced;
				if(placed > 1) gcode_name += "." + placed + "x";
				if(uniqueDesigns > 1){
					gcode_name += "_"+(uniqueDesigns-1)+"more";
				}
				return gcode_name + ".gco";
			} else { 
				return "tmp"+Date.now()+".gco"; // TODO: user should not deal with gcode anymore. go and laser it.
			}
		};

		self.slicer.subscribe(function(newValue) {
			self.profilesForSlicer(newValue);
		});

		self.enableConvertButton = ko.computed(function() {
			if (self.laserIntensity() === undefined || self.laserSpeed() === undefined || self.gcodeFilename() === undefined) {
				return false;
			} else {
				var tmpIntensity = self.laserIntensity();
				var tmpSpeed = self.laserSpeed();
				var tmpGcodeFilename = self.gcodeFilename().trim();
				return tmpGcodeFilename !== ""
					&& tmpIntensity > 0 && tmpIntensity <= 1000 // TODO no magic numbers here!
					&& tmpSpeed >= self.minSpeed() && tmpSpeed <= self.maxSpeed();
			}
		});

		self.requestData = function() {
			$.ajax({
				url: API_BASEURL + "slicing",
				type: "GET",
				dataType: "json",
				success: self.fromResponse
			});
		};

		self.fromResponse = function(data) {
			self.data = data;

			var selectedSlicer = undefined;
			self.slicers.removeAll();
			_.each(_.values(data), function(slicer) {
				var name = slicer.displayName;
				if (name === undefined) {
					name = slicer.key;
				}

				if (slicer.default) {
					selectedSlicer = slicer.key;
				}

				self.slicers.push({
					key: slicer.key,
					name: name
				});
			});

			if (selectedSlicer != undefined) {
				self.slicer(selectedSlicer);
			}

			self.defaultSlicer = selectedSlicer;
		};

		self.profilesForSlicer = function(key) {
			if (key == undefined) {
				key = self.slicer();
			}
			if (key == undefined || !self.data.hasOwnProperty(key)) {
				return;
			}
			var slicer = self.data[key];

			var selectedProfile = undefined;
			self.profiles.removeAll();
			_.each(_.values(slicer.profiles), function(profile) {
				var name = profile.displayName;
				if (name == undefined) {
					name = profile.key;
				}

				if (profile.default) {
					selectedProfile = profile.key;
				}

				self.profiles.push({
					key: profile.key,
					name: name
				})
			});

			if (selectedProfile != undefined) {
				self.profile(selectedProfile);
			}

			self.defaultProfile = selectedProfile;
		};

		self.convert = function() {
			var gcodeFilename = self._sanitize(self.gcodeFilename());
			if (!_.endsWith(gcodeFilename.toLowerCase(), ".gco")
				&& !_.endsWith(gcodeFilename.toLowerCase(), ".gcode")
				&& !_.endsWith(gcodeFilename.toLowerCase(), ".g")) {
				gcodeFilename = gcodeFilename + ".gco";
			}

			var data = {
				command: "convert",
				"profile.speed": self.laserSpeed(),
				"profile.intensity": self.laserIntensity(),
				slicer: "svgtogcode",
				gcode: gcodeFilename
			};

			if(self.svg !== undefined){
				data.svg = self.svg;
			}

			$.ajax({
				url: API_BASEURL + "files/convert",
				type: "POST",
				dataType: "json",
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(data)
			});

			$("#dialog_vector_graphics_conversion").modal("hide");

			self.gcodeFilename(undefined);
			//self.slicer(self.defaultSlicer);
			//self.profile(self.defaultProfile);
		};

		self._sanitize = function(name) {
			return name.replace(/[^a-zA-Z0-9\-_\.\(\) ]/g, "").replace(/ /g, "_");
		};

		self.onStartup = function() {
			self.requestData();
			self.state.conversion = self; // hack! injecting method to avoid circular dependency.
			self.files.conversion = self;
			self._configureIntensitySlider();
			self._configureFeedrateSlider();
		};

		self._configureIntensitySlider = function() {
			self.intensitySlider = $("#svgtogcode_intensity").slider({
				id: "svgtogcode_intensity_slider",
				reversed: false,
				selection: "after",
				orientation: "horizontal",
				min: 1,
				max: 1000,
				step: 1,
				value: 500,
				enabled: true,
				formatter: function(value) { return "" + (value/10) +"%"; }
			}).on("slideStop", function(ev){
				self.laserIntensity(ev.value);
			});

			self.laserIntensity.subscribe(function(newVal){
				self.intensitySlider.slider('setValue', parseInt(newVal));
			});
		};

		self._configureFeedrateSlider = function() {
			self.feedrateSlider = $("#svgtogcode_feedrate").slider({
				id: "svgtogcode_feedrate_slider",
				reversed: false,
				selection: "after",
				orientation: "horizontal",
				min: 0,
				max: 1000,
				step: 1,
				value: 300,
				enabled: true,
				formatter: function(value) { return "" + Math.round(self._calcRealSpeed(value)) +"mm/min"; }
			});

			// use the class as a flag to avoid double binding of the slideStop event
			if($("#svgtogcode_feedrate").attr('class') === 'uninitialized'){ // somehow hasClass(...) did not work ???
				self.feedrateSlider.on("slideStop", function(ev){
					self.laserSpeed(self._calcRealSpeed(ev.value));
				});
				$("#svgtogcode_feedrate").removeClass('uninitialized');
			}



			var speedSubscription = self.laserSpeed.subscribe(function(realVal){
				var val = (parseInt(realVal) - self.minSpeed()) / (self.maxSpeed() - self.minSpeed());
				self.feedrateSlider.slider('setValue', val);
				speedSubscription.dispose(); // only do it once
			});
		};

		self._calcRealSpeed = function(sliderVal){
			console.log();
			return self.minSpeed() + sliderVal/1000 * (self.maxSpeed() - self.minSpeed());
		};

	}
	
    ADDITIONAL_VIEWMODELS.push([VectorConversionViewModel, "vectorConversionViewModel",
		["loginStateViewModel", "settingsViewModel", "printerStateViewModel", "workingAreaViewModel", "gcodeFilesViewModel"], 
		document.getElementById("dialog_vector_graphics_conversion")]);
	
});
