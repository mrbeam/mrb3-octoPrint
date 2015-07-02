$(function() {
        //~~ Lodash setup

        _.mixin({"sprintf": sprintf, "vsprintf": vsprintf});

        //~~ Logging setup

        log.setLevel(CONFIG_DEBUG ? "debug" : "info");

        //~~ AJAX setup

        // work around a stupid iOS6 bug where ajax requests get cached and only work once, as described at
        // http://stackoverflow.com/questions/12506897/is-safari-on-ios-6-caching-ajax-results
        $.ajaxSetup({
            type: 'POST',
            headers: { "cache-control": "no-cache" }
        });

        // send the current UI API key with any request
        $.ajaxSetup({
            headers: {"X-Api-Key": UI_API_KEY}
        });

        //~~ Initialize i18n

        var catalog = window["BABEL_TO_LOAD_" + LOCALE];
        if (catalog === undefined) {
            catalog = {messages: undefined, plural_expr: undefined, locale: undefined, domain: undefined}
        }
        babel.Translations.load(catalog).install();

        moment.locale(LOCALE);

        // Dummy translation requests for dynamic strings supplied by the backend
        var dummyTranslations = [
            // printer states
            gettext("Offline"),
            gettext("Opening serial port"),
            gettext("Detecting serial port"),
            gettext("Detecting baudrate"),
            gettext("Connecting"),
            gettext("Operational"),
            gettext("Printing from SD"),
            gettext("Sending file to SD"),
            gettext("Printing"),
            gettext("Paused"),
            gettext("Closed"),
            gettext("Transfering file to SD")
        ];

        //~~ Initialize PNotify

        PNotify.prototype.options.styling = "bootstrap2";

        //~~ Initialize view models

        // the view model map is our basic look up table for dependencies that may be injected into other view models
        var viewModelMap = {};

        // Fix Function#name on browsers that do not support it (IE):
        // see: http://stackoverflow.com/questions/6903762/function-name-not-supported-in-ie 
        if (!(function f() {}).name) {
            Object.defineProperty(Function.prototype, 'name', {
                get: function() {
                    return this.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
                }
            });
//<<<<<<< HEAD
//        });
//
//        //~~ Initialize view models
//        var loginStateViewModel = new LoginStateViewModel();
//        var printerProfilesViewModel = new PrinterProfilesViewModel();
//        var usersViewModel = new UsersViewModel(loginStateViewModel);
//        var timelapseViewModel = new TimelapseViewModel(loginStateViewModel);
//
//        var printerStateViewModel = new PrinterStateViewModel(loginStateViewModel, timelapseViewModel);
//        var settingsViewModel = new SettingsViewModel(loginStateViewModel, usersViewModel, printerProfilesViewModel);
//        var gcodeViewModel = new GcodeViewModel(loginStateViewModel, settingsViewModel);
//        var connectionViewModel = new ConnectionViewModel(loginStateViewModel, settingsViewModel, printerProfilesViewModel);
//        var appearanceViewModel = new AppearanceViewModel(settingsViewModel, printerStateViewModel);
//        var temperatureViewModel = new TemperatureViewModel(loginStateViewModel, settingsViewModel);
//        var terminalViewModel = new TerminalViewModel(loginStateViewModel, settingsViewModel);
//
//        var slicingViewModel = new SlicingViewModel(loginStateViewModel, printerProfilesViewModel);
//        var gcodeFilesViewModel = new GcodeFilesViewModel(printerStateViewModel, loginStateViewModel, slicingViewModel);
//		var controlViewModel = new ControlViewModel(loginStateViewModel, settingsViewModel, printerStateViewModel);
//        var navigationViewModel = new NavigationViewModel(loginStateViewModel, appearanceViewModel, settingsViewModel, usersViewModel);
//        var logViewModel = new LogViewModel(loginStateViewModel);
//
//
//        // the view model map is our basic look up table for dependencies that may be injected into other view models
//        var viewModelMap = {
//            loginStateViewModel: loginStateViewModel,
//            printerProfilesViewModel: printerProfilesViewModel,
//            usersViewModel: usersViewModel,
//            settingsViewModel: settingsViewModel,
//            connectionViewModel: connectionViewModel,
//            timelapseViewModel: timelapseViewModel,
//            printerStateViewModel: printerStateViewModel,
//            appearanceViewModel: appearanceViewModel,
//            temperatureViewModel: temperatureViewModel,
//            controlViewModel: controlViewModel,
//            terminalViewModel: terminalViewModel,
//            gcodeFilesViewModel: gcodeFilesViewModel,
//            gcodeViewModel: gcodeViewModel,
//            navigationViewModel: navigationViewModel,
//            logViewModel: logViewModel,
//            slicingViewModel: slicingViewModel,
//        };
//=======
        }
//>>>>>>> upstream/maintenance

        // helper to create a view model instance with injected constructor parameters from the view model map
        var _createViewModelInstance = function(viewModel, viewModelMap){
            var viewModelClass = viewModel[0];
            var viewModelParameters = viewModel[1];
//<<<<<<< HEAD
//
//            // now we'll try to resolve all of the view model's constructor parameters via our view model map
//            var constructorParameters = _.map(viewModelParameters, function(parameter){
//                return viewModelMap[parameter]
//            });
//
//            if (_.some(constructorParameters, function(parameter) { return parameter === undefined; })) {
//                var _extractName = function(entry) { return entry[0]; };
//                var _onlyUnresolved = function(entry) { return entry[1] === undefined; };
//                var missingParameters = _.map(_.filter(_.zip(viewModelParameters, constructorParameters), _onlyUnresolved), _extractName);
//                console.log("postponing", viewModel[0].name, "due to missing parameters:", missingParameters.join(", "));
//                return;
//            }
//
//            // if we came this far then we could resolve all constructor parameters, so let's construct that view model
//            return new viewModelClass(constructorParameters);
//        };
//
//        // helper for translating the name of a view model class into an identifier for the view model map
//        var _getViewModelId = function(viewModel){
//            var name = viewModel[0].name;
//            return name.substr(0, 1).toLowerCase() + name.substr(1); // FooBarViewModel => fooBarViewModel
//        };
//
//        // instantiation loop, will make multiple passes over the list of unprocessed view models until all
//        // view models have been successfully instantiated with all of their dependencies or no changes can be made
//        // any more which means not all view models can be instantiated due to missing dependencies
//        var unprocessedViewModels = ADDITIONAL_VIEWMODELS.slice();
//        var additionalViewModels = [];
//        var pass = 1;
//        while (unprocessedViewModels.length > 0) {
//            console.log("View model dependency resolution, pass #" + pass++);
//            var startLength = unprocessedViewModels.length;
//            var postponed = [];
//
//            // now try to instantiate every one of our as of yet unprocessed view model descriptors
//            while (unprocessedViewModels.length > 0){
//                var viewModel = unprocessedViewModels.shift();
//                var viewModelId = _getViewModelId(viewModel);
//
//                // make sure that we don't have to view models going by the same name
//                if (_.has(viewModelMap, viewModelId)) {
//                    console.error("Duplicate class name while instantiating viewModel ", viewModelId);
//                    continue;
//                }
//
//                var viewModelInstance = _createViewModelInstance(viewModel, viewModelMap);
//
//                // our view model couldn't yet be instantiated, so postpone it for a bit
//                if (viewModelInstance === undefined) {
//                    postponed.push(viewModel);
//                    continue;
//                }
//
//                // we could resolve the depdendencies and the view model is not defined yet => add it, it's now fully processed
//                var viewModelBindTarget = viewModel[2];
//                additionalViewModels.push([viewModelInstance, viewModelBindTarget]);
//                viewModelMap[viewModelId] = viewModelInstance;
//            }
//
//            // anything that's now in the postponed list has to be readded to the unprocessedViewModels
//            unprocessedViewModels = unprocessedViewModels.concat(postponed);
//
//            // if we still have the same amount of items in our list of unprocessed view models it means that we
//            // couldn't instantiate any more view models over a whole iteration, which in turn mean we can't resolve the
//            // dependencies of remaining ones, so log that as an error and then quit the loop
//            if (unprocessedViewModels.length == startLength) {
//                console.error("Could not instantiate the following view models due to unresolvable dependencies:");
//                _.each(unprocessedViewModels, function(entry) {
//                    console.error(entry[0].name, "(missing:", _.filter(entry[1], function(id) { return !_.has(viewModelMap, id); }).join(", "), ")");
//                });
//                break;
//            }
//        }
//        console.log("View model dependency resolution done");
//
//        var allViewModels = _.values(viewModelMap);
//        var dataUpdater = new DataUpdater(allViewModels);
//
//
//        //~~ Temperature
//
//        $('#tabs a[data-toggle="tab"]').on('shown', function (e) {
//            temperatureViewModel.updatePlot();
//            terminalViewModel.updateOutput();
//        });
//
//        //~~ File list
//
//        $(".gcode_files").slimScroll({
//            height: "80vh",
//            size: "5px",
//            distance: "0",
//            railVisible: true,
//            alwaysVisible: true,
//            scrollBy: "102px"
//        });
//
//        //~~ Gcode upload
//
//        function gcode_upload_done(e, data) {
//            var filename = undefined;
//            var location = undefined;
//            if (data.result.files.hasOwnProperty("sdcard")) {
//                filename = data.result.files.sdcard.name;
//                location = "sdcard";
//            } else if (data.result.files.hasOwnProperty("local")) {
//                filename = data.result.files.local.name;
//                location = "local";
//            }
//            gcodeFilesViewModel.requestData(filename, location);
//=======

            if (viewModelParameters != undefined) {
                if (!_.isArray(viewModelParameters)) {
                    viewModelParameters = [viewModelParameters];
                }
//>>>>>>> upstream/maintenance

                // now we'll try to resolve all of the view model's constructor parameters via our view model map
                var constructorParameters = _.map(viewModelParameters, function(parameter){
                    return viewModelMap[parameter]
                });
            } else {
                constructorParameters = [];
            }

            if (_.some(constructorParameters, function(parameter) { return parameter === undefined; })) {
                var _extractName = function(entry) { return entry[0]; };
                var _onlyUnresolved = function(entry) { return entry[1] === undefined; };
                var missingParameters = _.map(_.filter(_.zip(viewModelParameters, constructorParameters), _onlyUnresolved), _extractName);
                log.debug("Postponing", viewModel[0].name, "due to missing parameters:", missingParameters);
                return;
            }
//<<<<<<< HEAD
//			
//			if(data.result.files.hasOwnProperty("local")){
//				var f = data.result.files.local;
//				if(_.endsWith(filename.toLowerCase(), ".svg")){
//					f.type = "model"
//					viewModelMap['workingAreaViewModel'].placeSVG(f);
//				}
//				if(_.endsWith(filename.toLowerCase(), ".gco")){
//					f.type = "machinecode"
//					viewModelMap['workingAreaViewModel'].placeGcode(f);
//				}
//			}
//        }
//
//        function gcode_upload_fail(e, data) {
//            var error = "<p>" + gettext("Could not upload the file. Make sure that it is a SVG file and has the extension \".svg\" or a GCode file and has extension \".gco\" or \".gcode\" ") + "</p>";
//            error += pnotifyAdditionalInfo("<pre>" + data.jqXHR.responseText + "</pre>");
//            new PNotify({
//                title: "Upload failed",
//                text: error,
//                type: "error",
//                hide: false
//            });
//            $("#gcode_upload_progress .bar").css("width", "0%");
//            $("#gcode_upload_progress").removeClass("progress-striped").removeClass("active");
//            $("#gcode_upload_progress .bar").text("");
//        }
//=======

            // if we came this far then we could resolve all constructor parameters, so let's construct that view model
            log.debug("Constructing", viewModel[0].name, "with parameters:", viewModelParameters);
            return new viewModelClass(constructorParameters);
        };
//>>>>>>> upstream/maintenance

        // map any additional view model bindings we might need to make
        var additionalBindings = {};
        _.each(OCTOPRINT_ADDITIONAL_BINDINGS, function(bindings) {
            var viewModelId = bindings[0];
            var viewModelBindTargets = bindings[1];
            if (!_.isArray(viewModelBindTargets)) {
                viewModelBindTargets = [viewModelBindTargets];
            }

            if (!additionalBindings.hasOwnProperty(viewModelId)) {
                additionalBindings[viewModelId] = viewModelBindTargets;
            } else {
                additionalBindings[viewModelId] = additionalBindings[viewModelId].concat(viewModelBindTargets);
            }
        });

        // helper for translating the name of a view model class into an identifier for the view model map
        var _getViewModelId = function(viewModel){
            var name = viewModel[0].name;
            return name.substr(0, 1).toLowerCase() + name.substr(1); // FooBarViewModel => fooBarViewModel
        };

        // instantiation loop, will make multiple passes over the list of unprocessed view models until all
        // view models have been successfully instantiated with all of their dependencies or no changes can be made
        // any more which means not all view models can be instantiated due to missing dependencies
        var unprocessedViewModels = OCTOPRINT_VIEWMODELS.slice();
        unprocessedViewModels = unprocessedViewModels.concat(ADDITIONAL_VIEWMODELS);

        var allViewModels = [];
        var allViewModelData = [];
        var pass = 1;
        log.info("Starting dependency resolution...");
        while (unprocessedViewModels.length > 0) {
            log.debug("Dependency resolution, pass #" + pass);
            var startLength = unprocessedViewModels.length;
            var postponed = [];

            // now try to instantiate every one of our as of yet unprocessed view model descriptors
            while (unprocessedViewModels.length > 0){
                var viewModel = unprocessedViewModels.shift();
                var viewModelId = _getViewModelId(viewModel);

                // make sure that we don't have two view models going by the same name
                if (_.has(viewModelMap, viewModelId)) {
                    log.error("Duplicate name while instantiating " + viewModelId);
                    continue;
                }

                var viewModelInstance = _createViewModelInstance(viewModel, viewModelMap);

//<<<<<<< HEAD
//            if (printerStateViewModel.isSdReady() && loginStateViewModel.isUser()) {
//                enable_sd_dropzone();
//            } else {
//                disable_sd_dropzone();
//            }
//        }
//		
//=======
                // our view model couldn't yet be instantiated, so postpone it for a bit
                if (viewModelInstance === undefined) {
                    postponed.push(viewModel);
                    continue;
                }
//>>>>>>> upstream/maintenance

                // we could resolve the depdendencies and the view model is not defined yet => add it, it's now fully processed
                var viewModelBindTargets = viewModel[2];
                if (!_.isArray(viewModelBindTargets)) {
                    viewModelBindTargets = [viewModelBindTargets];
                }

                if (additionalBindings.hasOwnProperty(viewModelId)) {
                    viewModelBindTargets = viewModelBindTargets.concat(additionalBindings[viewModelId]);
                }

                allViewModelData.push([viewModelInstance, viewModelBindTargets]);
                allViewModels.push(viewModelInstance);
                viewModelMap[viewModelId] = viewModelInstance;
            }

//<<<<<<< HEAD
//            window.dropZoneTimeout = setTimeout(function () {
//                window.dropZoneTimeout = null;
//                dropOverlay.removeClass("in");
//                if (dropZoneLocal) dropZoneLocalBackground.removeClass("hover");
//                if (dropZoneSd) dropZoneSdBackground.removeClass("hover");
//                if (dropZone) dropZoneBackground.removeClass("hover");
//            }, 1000);
//        });
//=======
            // anything that's now in the postponed list has to be readded to the unprocessedViewModels
            unprocessedViewModels = unprocessedViewModels.concat(postponed);
//>>>>>>> upstream/maintenance

            // if we still have the same amount of items in our list of unprocessed view models it means that we
            // couldn't instantiate any more view models over a whole iteration, which in turn mean we can't resolve the
            // dependencies of remaining ones, so log that as an error and then quit the loop
            if (unprocessedViewModels.length == startLength) {
                log.error("Could not instantiate the following view models due to unresolvable dependencies:");
                _.each(unprocessedViewModels, function(entry) {
                    log.error(entry[0].name + " (missing: " + _.filter(entry[1], function(id) { return !_.has(viewModelMap, id); }).join(", ") + " )");
                });
                break;
            }

            log.debug("Dependency resolution pass #" + pass + " finished, " + unprocessedViewModels.length + " view models left to process");
            pass++;
        }
        log.info("... dependency resolution done");

        var dataUpdater = new DataUpdater(allViewModels);

        //~~ Custom knockout.js bindings

        ko.bindingHandlers.popover = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var val = ko.utils.unwrapObservable(valueAccessor());

                var options = {
                    title: val.title,
                    animation: val.animation,
                    placement: val.placement,
                    trigger: val.trigger,
                    delay: val.delay,
                    content: val.content,
                    html: val.html
                };
                $(element).popover(options);
            }
        };

        ko.bindingHandlers.allowBindings = {
            init: function (elem, valueAccessor) {
                return { controlsDescendantBindings: !valueAccessor() };
            }
        };
        ko.virtualElements.allowedBindings.allowBindings = true;

        ko.bindingHandlers.slimScrolledForeach = {
            init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
                return ko.bindingHandlers.foreach.init(element, valueAccessor(), allBindings, viewModel, bindingContext);
            },
            update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
                setTimeout(function() {
                    $(element).slimScroll({scrollBy: 0});
                }, 10);
                return ko.bindingHandlers.foreach.update(element, valueAccessor(), allBindings, viewModel, bindingContext);
            }
        };

        ko.bindingHandlers.qrcode = {
            update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
                var val = ko.utils.unwrapObservable(valueAccessor());

                var defaultOptions = {
                    text: "",
                    size: 200,
                    fill: "#000",
                    background: null,
                    label: "",
                    fontname: "sans",
                    fontcolor: "#000",
                    radius: 0,
                    ecLevel: "L"
                };

                var options = {};
                _.each(defaultOptions, function(value, key) {
                    options[key] = ko.utils.unwrapObservable(val[key]) || value;
                });

                $(element).empty().qrcode(options);
            }
        };

        ko.bindingHandlers.invisible = {
            init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
                if (!valueAccessor()) return;
                ko.bindingHandlers.style.update(element, function() {
                    return { visibility: 'hidden' };
                })
            }
        };

        ko.bindingHandlers.contextMenu = {
            init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var val = ko.utils.unwrapObservable(valueAccessor());

                $(element).contextMenu(val);
            },
            update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var val = ko.utils.unwrapObservable(valueAccessor());

                $(element).contextMenu(val);
            }
        };

        //~~ some additional hooks and initializations

        // make sure modals max out at the window height
        $.fn.modal.defaults.maxHeight = function(){
            // subtract the height of the modal header and footer
            return $(window).height() - 165;
        };

        // jquery plugin to select all text in an element
        // originally from: http://stackoverflow.com/a/987376
        $.fn.selectText = function() {
            var doc = document;
            var element = this[0];
            var range, selection;

            if (doc.body.createTextRange) {
                range = document.body.createTextRange();
                range.moveToElementText(element);
                range.select();
            } else if (window.getSelection) {
                selection = window.getSelection();
                range = document.createRange();
                range.selectNodeContents(element);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        };

        $.fn.isChildOf = function (element) {
            return $(element).has(this).length > 0;
        };

        // from http://jsfiddle.net/KyleMit/X9tgY/
        $.fn.contextMenu = function (settings) {
            return this.each(function () {
                // Open context menu
                $(this).on("contextmenu", function (e) {
                    // return native menu if pressing control
                    if (e.ctrlKey) return;

                    $(settings.menuSelector)
                        .data("invokedOn", $(e.target))
                        .data("contextParent", $(this))
                        .show()
                        .css({
                            position: "absolute",
                            left: getMenuPosition(e.clientX, 'width', 'scrollLeft'),
                            top: getMenuPosition(e.clientY, 'height', 'scrollTop'),
                            "z-index": 9999
                        }).off('click')
                        .on('click', function (e) {
                            if (e.target.tagName.toLowerCase() == "input")
                                return;

                            $(this).hide();

                            settings.menuSelected.call(this, $(this).data('invokedOn'), $(this).data('contextParent'), $(e.target));
                        });

                    return false;
                });

                //make sure menu closes on any click
                $(document).click(function () {
                    $(settings.menuSelector).hide();
                });
            });

            function getMenuPosition(mouse, direction, scrollDir) {
                var win = $(window)[direction](),
                    scroll = $(window)[scrollDir](),
                    menu = $(settings.menuSelector)[direction](),
                    position = mouse + scroll;

                // opening menu would pass the side of the page
                if (mouse + menu > win && menu < mouse)
                    position -= menu;

                return position;
            }
        };

        // Use bootstrap tabdrop for tabs and pills
        $('.nav-pills, .nav-tabs').tabdrop();

        // Allow components to react to tab change
        var tabs = $('#tabs a[data-toggle="tab"]');
        tabs.on('show', function (e) {
            var current = e.target.hash;
            var previous = e.relatedTarget.hash;

            _.each(allViewModels, function(viewModel) {
                if (viewModel.hasOwnProperty("onTabChange")) {
                    viewModel.onTabChange(current, previous);
                }
            });
        });

        tabs.on('shown', function (e) {
            var current = e.target.hash;
            var previous = e.relatedTarget.hash;

            _.each(allViewModels, function(viewModel) {
                if (viewModel.hasOwnProperty("onAfterTabChange")) {
                    viewModel.onAfterTabChange(current, previous);
                }
            });
        });

        // Fix input element click problems on dropdowns
        $(".dropdown input, .dropdown label").click(function(e) {
            e.stopPropagation();
        });

//<<<<<<< HEAD
//        settingsViewModel.requestData(function() {
//            ko.applyBindings(settingsViewModel, document.getElementById("settings_dialog"));
//
//            ko.applyBindings(connectionViewModel, document.getElementById("connection"));
//            ko.applyBindings(printerStateViewModel, document.getElementById("state"));
//            ko.applyBindings(gcodeFilesViewModel, document.getElementById("files_accordion"));
//            ko.applyBindings(controlViewModel, document.getElementById("control"));
//            ko.applyBindings(controlViewModel, document.getElementById("focus"));
//            ko.applyBindings(terminalViewModel, document.getElementById("term"));
//            var gcode = document.getElementById("gcode");
//            if (gcode) {
//                gcodeViewModel.initialize();
//                ko.applyBindings(gcodeViewModel, gcode);
//            }
//            ko.applyBindings(navigationViewModel, document.getElementById("navbar"));
////            ko.applyBindings(appearanceViewModel, document.getElementsByTagName("head")[0]);
//            ko.applyBindings(printerStateViewModel, document.getElementById("drop_overlay"));
//            ko.applyBindings(logViewModel, document.getElementById("logs"));
//
////            var timelapseElement = document.getElementById("timelapse");
////            if (timelapseElement) {
////                ko.applyBindings(timelapseViewModel, timelapseElement);
////            }
////
////            ko.applyBindings(slicingViewModel, document.getElementById("slicing_configuration_dialog"));
//=======
        // prevent default action for drag-n-drop
        $(document).bind("drop dragover", function (e) {
            e.preventDefault();
        });

        //~~ Starting up the app

        _.each(allViewModels, function(viewModel) {
            if (viewModel.hasOwnProperty("onStartup")) {
                viewModel.onStartup();
            }
        });

        //~~ view model binding

        var bindViewModels = function() {
            log.info("Going to bind " + allViewModelData.length + " view models...");
            _.each(allViewModelData, function(viewModelData) {
                if (!Array.isArray(viewModelData) || viewModelData.length != 2) {
                    return;
                }
//>>>>>>> upstream/maintenance

                var viewModel = viewModelData[0];
                var targets = viewModelData[1];

                if (targets === undefined) {
                    return;
                }

                if (!_.isArray(targets)) {
                    targets = [targets];
                }


                if (viewModel.hasOwnProperty("onBeforeBinding")) {
                    viewModel.onBeforeBinding();
                }

                if (targets != undefined) {
                    if (!_.isArray(targets)) {
                        targets = [targets];
                    }

                    _.each(targets, function(target) {
                        if (target == undefined) {
                            return;
                        }

                        var object;
                        if (!(target instanceof jQuery)) {
                            object = $(target);
                        } else {
                            object = target;
                        }

                        if (object == undefined || !object.length) {
                            log.info("Did not bind view model", viewModel.constructor.name, "to target", target, "since it does not exist");
                            return;
                        }

                        var element = object.get(0);
                        if (element == undefined) {
                            log.info("Did not bind view model", viewModel.constructor.name, "to target", target, "since it does not exist");
                            return;
                        }

                        try {
                            ko.applyBindings(viewModel, element);
                            log.debug("View model", viewModel.constructor.name, "bound to", target);
                        } catch (exc) {
                            log.error("Could not bind view model", viewModel.constructor.name, "to target", target, ":", (exc.stack || exc));
                        }
                    });
                }

                if (viewModel.hasOwnProperty("onAfterBinding")) {
                    viewModel.onAfterBinding();
                }
            });

            _.each(allViewModels, function(viewModel) {
                if (viewModel.hasOwnProperty("onAllBound")) {
                    viewModel.onAllBound(allViewModels);
                }
            });
            log.info("... binding done");

            _.each(allViewModels, function(viewModel) {
                if (viewModel.hasOwnProperty("onStartupComplete")) {
                    viewModel.onStartupComplete();
                }
            });
        };

        if (!_.has(viewModelMap, "settingsViewModel")) {
            throw new Error("settingsViewModel is missing, can't run UI")
        }
        viewModelMap["settingsViewModel"].requestData(bindViewModels);
    }
);

