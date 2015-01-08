function VectorConversionViewModel(loginStateViewModel, settingsViewModel) {
    var self = this;

    self.loginState = loginStateViewModel;

    self.target = undefined;
    self.file = undefined;
    self.data = undefined;

    self.defaultSlicer = undefined;
    self.defaultProfile = undefined;

    self.gcodeFilename = ko.observable();
    self.laserIntensity = ko.observable("800"); // TODO fetch from settings
    self.laserSpeed = ko.observable("300");

    self.title = ko.observable(undefined);
    self.slicer = ko.observable();
    self.slicers = ko.observableArray();
    self.profile = ko.observable();
    self.profiles = ko.observableArray();

    self.show = function(target, file) {
        self.target = target;
        self.file = file;
        self.title(_.sprintf(gettext("Converting %(filename)s"), {filename: self.file}));
        self.gcodeFilename(self.file.substr(0, self.file.lastIndexOf(".")));
        $("#dialog_vector_graphics_conversion").modal("show");
    };

    self.slicer.subscribe(function(newValue) {
        self.profilesForSlicer(newValue);
    });

    self.enableConvertButton = ko.computed(function() {
        if (self.laserIntensity() == undefined || self.laserSpeed() == undefined || self.gcodeFilename() == undefined) {
            return false;
        } else {
            var tmpIntensity = parseInt(self.laserIntensity().trim());
            var tmpSpeed = parseInt(self.laserSpeed().trim());
            var tmpGcodeFilename = self.gcodeFilename().trim();
            return tmpGcodeFilename != ""
                && tmpIntensity > 0 && tmpIntensity <= 1000
                && tmpSpeed >= 30 && tmpSpeed <= 2000;
        }
    });

    self.requestData = function() {
        $.ajax({
            url: API_BASEURL + "slicing",
            type: "GET",
            dataType: "json",
            success: self.fromResponse
        })
    };

    self.fromResponse = function(data) {
		console.log("convert.js", data);
        self.data = data;

        var selectedSlicer = undefined;
        self.slicers.removeAll();
        _.each(_.values(data), function(slicer) {
            var name = slicer.displayName;
            if (name == undefined) {
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
            command: "slice",
            "profile.speed": self.laserSpeed(),
            "profile.intensity": self.laserIntensity(),
            slicer: "svgtogcode",
            gcode: gcodeFilename
        };

        $.ajax({
            url: API_BASEURL + "files/" + self.target + "/" + self.file,
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
    };
	
	self._configureIntensitySlider = function() {
        self.layerSlider = $("#svgtogcode_intensity").slider({
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
        }).on("slideStop", self.changeIntensity);
    };

	self._configureFeedrateSlider = function() {
        self.layerSlider = $("#svgtogcode_feedrate").slider({
            id: "svgtogcode_feedrate_slider",
            reversed: false,
            selection: "after",
            orientation: "horizontal",
            min: 20,
            max: 3000,
            step: 10,
            value: 300,
            enabled: true,
            formatter: function(value) { return "" + (value) +"mm/min"; }
        }).on("slideStop", self.changeFeedrate);
    };
	
	self.init = function(){
		self._configureIntensitySlider();
		self._configureFeedrateSlider();
	};
}