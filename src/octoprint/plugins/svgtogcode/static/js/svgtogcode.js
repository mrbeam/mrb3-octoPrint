$(function() {
    function SvgToGcodeViewModel(parameters) {
        var self = this;

        self.loginState = parameters[0];
        self.settingsViewModel = parameters[1];
        self.slicingViewModel = parameters[2];

        self.fileName = ko.observable();

        self.placeholderName = ko.observable();
        self.placeholderDisplayName = ko.observable();
        self.placeholderDescription = ko.observable();

        self.profileName = ko.observable();
        self.profileDisplayName = ko.observable();
        self.profileDescription = ko.observable();
        self.profileAllowOverwrite = ko.observable(true);




        self.convertSVG2 = function(data) {
            if (!data) {
                return;
            }

            return;
        };



	}
    // view model class, parameters for constructor, container to bind to
    //ADDITIONAL_VIEWMODELS.push([SvgToGcodeViewModel, ["loginStateViewModel", "settingsViewModel", "slicingViewModel"], null]);
    ADDITIONAL_VIEWMODELS.push([WorkingAreaViewModel, "workingAreaViewModel",
		["loginStateViewModel", "settingsViewModel", "printerStateViewModel",  "gcodeFilesViewModel"], 
		document.getElementById("area_preview")]);
	
    ADDITIONAL_VIEWMODELS.push([VectorConversionViewModel, "vectorConversionViewModel",
		["loginStateViewModel", "settingsViewModel", "printerStateViewModel", "workingAreaViewModel", "gcodeFilesViewModel"], 
		document.getElementById("dialog_vector_graphics_conversion")]);
});