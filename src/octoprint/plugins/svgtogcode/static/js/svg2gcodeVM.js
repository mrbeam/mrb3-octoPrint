function Svg2GcodeViewModel(settingsViewModel) {
    var self = this;

    self.settings = settingsViewModel;

    self.log = [];

    self.command = ko.observable(undefined);

}


