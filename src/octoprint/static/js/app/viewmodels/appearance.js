$(function() {
    function AppearanceViewModel(parameters) {
        var self = this;

        self.name = parameters[0].appearance_name;
        self.color = parameters[0].appearance_color;
        self.colorTransparent = parameters[0].appearance_colorTransparent;


		self.brand = ko.computed(function() {
			if (self.name())
				return gettext("Mr Beam") + ": " + self.name();
			else
				return gettext("Mr Beam");
		});

		self.title = ko.computed(function() {
			if (self.name())
				return self.name() + " [" + gettext("Mr Beam") + "]";
			else
				return gettext("Mr Beam");
		});

    }

    OCTOPRINT_VIEWMODELS.push([
        AppearanceViewModel,
        ["settingsViewModel"],
        "head"
    ]);
});
