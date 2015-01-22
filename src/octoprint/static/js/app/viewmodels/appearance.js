function AppearanceViewModel(settingsViewModel, printerStateViewModel) {
    var self = this;

    self.name = settingsViewModel.appearance_name;
    self.color = settingsViewModel.appearance_color;

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
