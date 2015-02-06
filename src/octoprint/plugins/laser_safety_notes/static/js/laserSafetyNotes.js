$(function() {
    
	function LaserSafetyNotesViewModel(params) {
		var self = this;

		self.settings = params[0];

		self.onStartup = function(){
//			self.requestData();
//			self.control.showZAxis = ko.computed(function(){
//				var has = self.currentProfileData()['zAxis']();
//				return has;
//			}); // dependency injection
		};
	}

	
    // view model class, identifier, parameters for constructor, container to bind to
    ADDITIONAL_VIEWMODELS.push([LaserSafetyNotesViewModel,
		["settingsViewModel"], 
		document.getElementById("laser_safety_notes")]);
	
});
