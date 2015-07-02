# coding=utf-8
"""
This module defines the interface for communicating with a connected printer.

The communication is in fact divided in two components, the :class:`PrinterInterface` and a deeper lying
communcation layer. However, plugins should only ever need to use the :class:`PrinterInterface` as the
abstracted version of the actual printer communiciation.

.. autofunction:: get_connection_options

.. autoclass:: PrinterInterface
   :members:

.. autoclass:: PrinterCallback
   :members:
"""

from __future__ import absolute_import

__author__ = "Gina Häußge <osd@foosel.net>"
__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'
__copyright__ = "Copyright (C) 2014 The OctoPrint Project - Released under terms of the AGPLv3 License"

import re

import octoprint.util.comm_acc as comm
import octoprint.util as util

from octoprint.settings import settings

def get_connection_options():
	"""
	Retrieves the available ports, baudrates, prefered port and baudrate for connecting to the printer.

	Returned ``dict`` has the following structure::

	    ports: <list of available serial ports>
	    baudrates: <list of available baudrates>
	    portPreference: <configured default serial port>
	    baudratePreference: <configured default baudrate>
	    autoconnect: <whether autoconnect upon server startup is enabled or not>

	Returns:
	    (dict): A dictionary holding the connection options in the structure specified above
	"""
	return {
		"ports": comm.serialList(),
		"baudrates": comm.baudrateList(),
		"portPreference": settings().get(["serial", "port"]),
		"baudratePreference": settings().getInt(["serial", "baudrate"]),
		"autoconnect": settings().getBoolean(["serial", "autoconnect"])
	}

#<<<<<<< HEAD
#class Printer():
#	def __init__(self, fileManager, analysisQueue, printerProfileManager):
#		from collections import deque
#
#		self._logger = logging.getLogger(__name__)
#		#self._estimationLogger = logging.getLogger("ESTIMATIONS")
#		#self._printTimeLogger = logging.getLogger("PRINT_TIME")
#
#		self._analysisQueue = analysisQueue
#		self._fileManager = fileManager
#		self._printerProfileManager = printerProfileManager
#
#		# state
#		# TODO do we really need to hold the temperature here?
#		self._temp = None
#		self._bedTemp = None
#		self._targetTemp = None
#		self._targetBedTemp = None
#		self._temps = deque([], 300)
#		self._tempBacklog = []
#
#		self._latestMessage = None
#		self._messages = deque([], 300)
#		self._messageBacklog = []
#
#		self._latestLog = None
#		self._log = deque([], 300)
#		self._logBacklog = []
#
#		self._state = None
#
#		self._currentZ = None
#		self._machinePosition = "-"
#		self._workPosition = "-"
#
#		self._progress = None
#		self._printTime = None
#		self._printTimeLeft = None
#
#		self._printAfterSelect = False
#
#		# sd handling
#		self._sdPrinting = False
#		self._sdStreaming = False
#		self._sdFilelistAvailable = threading.Event()
#		self._streamingFinishedCallback = None
#
#		self._selectedFile = None
#		self._timeEstimationData = None
#
#		# comm
#		self._comm = None
#
#		# callbacks
#		self._callbacks = []
#
#		# progress plugins
#		self._lastProgressReport = None
#		self._progressPlugins = plugin_manager().get_implementations(ProgressPlugin)
#
#		self._stateMonitor = StateMonitor(
#			ratelimit=0.5,
#			updateCallback=self._sendCurrentDataCallbacks,
#			addTemperatureCallback=self._sendAddTemperatureCallbacks,
#			addLogCallback=self._sendAddLogCallbacks,
#			addMessageCallback=self._sendAddMessageCallbacks
#		)
#		self._stateMonitor.reset(
#			state={"text": self.getStateString(), "flags": self._getStateFlags()},
#			jobData={
#				"file": {
#					"name": None,
#					"size": None,
#					"origin": None,
#					"date": None
#				},
#				"estimatedPrintTime": None,
#				"lastPrintTime": None,
#				"filament": {
#					"length": None,
#					"volume": None
#				}
#			},
#			progress={"completion": None, "filepos": None, "printTime": None, "printTimeLeft": None},
#			currentZ=None
#		)
#
#		eventManager().subscribe(Events.METADATA_ANALYSIS_FINISHED, self.onMetadataAnalysisFinished)
#		eventManager().subscribe(Events.METADATA_STATISTICS_UPDATED, self.onMetadataStatisticsUpdated)
#
#	#~~ callback handling
#
#	def registerCallback(self, callback):
#		self._callbacks.append(callback)
#		self._sendInitialStateUpdate(callback)
#
#	def unregisterCallback(self, callback):
#		if callback in self._callbacks:
#			self._callbacks.remove(callback)
#
#	def _sendAddTemperatureCallbacks(self, data):
#		for callback in self._callbacks:
#			try: callback.addTemperature(data)
#			except: self._logger.exception("Exception while adding temperature data point")
#
#	def _sendAddLogCallbacks(self, data):
#		for callback in self._callbacks:
#			try: callback.addLog(data)
#			except: self._logger.exception("Exception while adding communication log entry")
#
#	def _sendAddMessageCallbacks(self, data):
#		for callback in self._callbacks:
#			try: callback.addMessage(data)
#			except: self._logger.exception("Exception while adding printer message")
#
#	def _sendCurrentDataCallbacks(self, data):
#		for callback in self._callbacks:
#			try: callback.sendCurrentData(copy.deepcopy(data))
#			except: self._logger.exception("Exception while pushing current data")
#
#	def _sendTriggerUpdateCallbacks(self, type):
#		for callback in self._callbacks:
#			try: callback.sendEvent(type)
#			except: self._logger.exception("Exception while pushing trigger update")
#
#	def _sendFeedbackCommandOutput(self, name, output):
#		for callback in self._callbacks:
#			try: callback.sendFeedbackCommandOutput(name, output)
#			except: self._logger.exception("Exception while pushing feedback command output")
#
#	#~~ callback from metadata analysis event
#
#	def onMetadataAnalysisFinished(self, event, data):
#		if self._selectedFile:
#			self._setJobData(self._selectedFile["filename"],
#							 self._selectedFile["filesize"],
#							 self._selectedFile["sd"])
#
#	def onMetadataStatisticsUpdated(self, event, data):
#		self._setJobData(self._selectedFile["filename"],
#		                 self._selectedFile["filesize"],
#		                 self._selectedFile["sd"])
#
#	#~~ progress plugin reporting
#
#	def _reportPrintProgressToPlugins(self, progress):
#		if not progress or not self._selectedFile or not "sd" in self._selectedFile or not "filename" in self._selectedFile:
#			return
#
#		storage = "sdcard" if self._selectedFile["sd"] else "local"
#		filename = self._selectedFile["filename"]
#
#		def call_plugins(storage, filename, progress):
#			for name, plugin in self._progressPlugins.items():
#				try:
#					plugin.on_print_progress(storage, filename, progress)
#				except:
#					self._logger.exception("Exception while sending print progress to plugin %s" % name)
#
#		thread = threading.Thread(target=call_plugins, args=(storage, filename, progress))
#		thread.daemon = False
#		thread.start()
#
#	#~~ printer commands
#=======

class PrinterInterface(object):
	"""
	The :class:`PrinterInterface` represents the developer interface to the :class:`~octoprint.printer.standard.Printer`
	instance.
	"""

	valid_axes = ("x", "y", "z", "e")
	"""Valid axes identifiers."""

	valid_tool_regex = re.compile("^(tool\d+)$")
	"""Regex for valid tool identifiers."""

	valid_heater_regex = re.compile("^(tool\d+|bed)$")
	"""Regex for valid heater identifiers."""
#>>>>>>> upstream/maintenance

	def connect(self, port=None, baudrate=None, profile=None):
		"""
		Connects to the printer, using the specified serial ``port``, ``baudrate`` and printer ``profile``. If a
		connection is already established, that connection will be closed prior to connecting anew with the provided
		parameters.

		Arguments:
		    port (str): Name of the serial port to connect to. If not provided, an auto detection will be attempted.
		    baudrate (int): Baudrate to connect with. If not provided, an auto detection will be attempted.
		    profile (str): Name of the printer profile to use for this connection. If not provided, the default
		        will be retrieved from the :class:`PrinterProfileManager`.
		"""
		pass

	def disconnect(self):
		"""
		Disconnects from the printer. Does nothing if no connection is currently established.
		"""
		raise NotImplementedError()

	def get_transport(self):
		"""
		Returns the communication layer's transport object, if a connection is currently established.

		Note that this doesn't have to necessarily be a :class:`serial.Serial` instance, it might also be something
		different, so take care to do instance checks before attempting to access any properties or methods.

		Returns:
		    object: The communication layer's transport object
		"""
		raise NotImplementedError()

	def fake_ack(self):
		"""
		Fakes an acknowledgement for the communication layer. If the communication between OctoPrint and the printer
		gets stuck due to lost "ok" responses from the server due to communication issues, this can be used to get
		things going again.
		"""
		raise NotImplementedError()

	def commands(self, commands):
		"""
		Sends the provided ``commands`` to the printer.

		Arguments:
		    commands (str, list): The commands to send. Might be a single command provided just as a string or a list
		        of multiple commands to send in order.
		"""
		raise NotImplementedError()

	def script(self, name, context=None):
		"""
		Sends the GCODE script ``name`` to the printer.

		The script will be run through the template engine, the rendering context can be extended by providing a
		``context`` with additional template variables to use.

		If the script is unknown, an :class:`UnknownScriptException` will be raised.

		Arguments:
		    name (str): The name of the GCODE script to render.
		    context (dict): An optional context of additional template variables to provide to the renderer.

		Raises:
		    UnknownScriptException: There is no GCODE script with name ``name``
		"""
		raise NotImplementedError()

	def jog(self, axis, amount):
#<<<<<<< HEAD
#		printer_profile = self._printerProfileManager.get_current_or_default()
#		movement_speed = printer_profile["axes"][axis]["speed"]
#		self.commands(["G91", "G1 %s%.4f F%d" % (axis.upper(), amount, movement_speed), "G90", "?"])
#
#	def position(self, x, y):
#		printer_profile = self._printerProfileManager.get_current_or_default()
#		movement_speed = min(printer_profile["axes"]["x"]["speed"], printer_profile["axes"]["y"]["speed"])
#		self.commands(["G90", "G0 X%.3f Y%.3f F%d" % (x, y, movement_speed), "?"])
#
#	def home(self, axes):
#		if(settings().getBoolean(["feature", "grbl"])):
#			self.commands(["$H", "G92X0Y0Z0", "G90", "G21"])
#		else:
#			self.commands(["G91", "G28 %s" % " ".join(map(lambda x: "%s0" % x.upper(), axes)), "G90"])
#
#	def extrude(self, amount):
#		printer_profile = self._printerProfileManager.get_current_or_default()
#		extrusion_speed = printer_profile["axes"]["e"]["speed"]
#		self.commands(["G91", "G1 E%s F%d" % (amount, extrusion_speed), "G90"])
#
#	def changeTool(self, tool):
#		try:
#			toolNum = int(tool[len("tool"):])
#			self.command("T%d" % toolNum)
#		except ValueError:
#			pass
#
#	def setTemperature(self, type, value):
#		if type.startswith("tool"):
#			printer_profile = self._printerProfileManager.get_current_or_default()
#			extruder_count = printer_profile["extruder"]["count"]
#			if extruder_count > 1:
#				try:
#					toolNum = int(type[len("tool"):])
#					self.command("M104 T%d S%f" % (toolNum, value))
#				except ValueError:
#					pass
#			else:
#				self.command("M104 S%f" % value)
#		elif type == "bed":
#			self.command("M140 S%f" % value)
#
#	def setTemperatureOffset(self, offsets={}):
#		if self._comm is None:
#			return
#
#		tool, bed = self._comm.getOffsets()
#
#		validatedOffsets = {}
#
#		for key in offsets:
#			value = offsets[key]
#			if key == "bed":
#				bed = value
#				validatedOffsets[key] = value
#			elif key.startswith("tool"):
#				try:
#					toolNum = int(key[len("tool"):])
#					tool[toolNum] = value
#					validatedOffsets[key] = value
#				except ValueError:
#					pass
#
#		self._comm.setTemperatureOffset(tool, bed)
#		self._stateMonitor.setTempOffsets(validatedOffsets)
#
#	def selectFile(self, filename, sd, printAfterSelect=False):
#		if self._comm is None or (self._comm.isBusy() or self._comm.isStreaming()):
#			self._logger.info("Cannot load file: printer not connected or currently busy")
#			return
#
#		self._printAfterSelect = printAfterSelect
#		self._comm.selectFile(filename, sd)
#		self._setProgressData(0, None, None, None)
#		self._setCurrentZ(None)
#
#	def unselectFile(self):
#		if self._comm is not None and (self._comm.isBusy() or self._comm.isStreaming()):
#			return
#
#		self._comm.unselectFile()
#		self._setProgressData(0, None, None, None)
#		self._setCurrentZ(None)
#
#	def startPrint(self):
#		"""
#		 Starts the currently loaded print job.
#		 Only starts if the printer is connected and operational, not currently printing and a printjob is loaded
#		"""
#		if self._comm is None or not self._comm.isOperational() or self._comm.isPrinting():
#			return
#		if self._selectedFile is None:
#			return
#
#		self._timeEstimationData = TimeEstimationHelper()
#		self._lastProgressReport = None
#		self._setCurrentZ(None)
#		self._comm.startPrint()
#		self._addPositionData(None, None)
#
#	def _addPositionData(self, MPos, WPos):
#
#		if MPos is None or WPos is None:
#			MPosString = WPosString = "-"
#		else:
#			MPosString = "X: %.4f Y: %.4f Z: %.4f" % ( MPos[0], MPos[1], MPos[2] )
#			WPosString = "X: %.4f Y: %.4f Z: %.4f" % ( WPos[0], WPos[1], WPos[2] )
#		
#		
#		self._stateMonitor.setWorkPosition(WPosString)
#		self._stateMonitor.setMachinePosition(MPosString)
#
#	def togglePausePrint(self):
#		"""
#		 Pause the current printjob.
#		"""
#		if self._comm is None:
#			return
#
#		self._comm.setPause(not self._comm.isPaused())
#
#	def cancelPrint(self, disableMotorsAndHeater=True):
#		"""
#		 Cancel the current printjob.
#		"""
#		if self._comm is None:
#			return
#
#		self._comm.cancelPrint()
#
#		if disableMotorsAndHeater:
#			printer_profile = self._printerProfileManager.get_current_or_default()
#			extruder_count = printer_profile["extruder"]["count"]
#
#			# disable motors, switch off hotends, bed and fan
#			#commands = ["M84"]
#			#commands.extend(map(lambda x: "M104 T%d S0" % x, range(extruder_count)))
#			#commands.extend(["M140 S0", "M106 S0"])
#			commands = ["M05", "G0X0Y0", "M09"]
#			self.commands(commands)
#
#		# reset progress, height, print time
#		self._setCurrentZ(None)
#		self._setProgressData(None, None, None, None)
#
#		# mark print as failure
#		if self._selectedFile is not None:
#			self._fileManager.log_print(FileDestinations.SDCARD if self._selectedFile["sd"] else FileDestinations.LOCAL, self._selectedFile["filename"], time.time(), self._comm.getPrintTime(), False, self._printerProfileManager.get_current_or_default()["id"])
#			payload = {
#				"file": self._selectedFile["filename"],
#				"origin": FileDestinations.LOCAL
#			}
#			if self._selectedFile["sd"]:
#				payload["origin"] = FileDestinations.SDCARD
#			eventManager().fire(Events.PRINT_FAILED, payload)
#
#	#~~ state monitoring
#
#	def _setCurrentZ(self, currentZ):
#		self._currentZ = currentZ
#		self._stateMonitor.setCurrentZ(self._currentZ)
#
#	def _setState(self, state):
#		self._state = state
#		self._stateMonitor.setState({"text": self.getStateString(), "flags": self._getStateFlags()})
#
#	def _addLog(self, log):
#		self._log.append(log)
#		self._stateMonitor.addLog(log)
#
#	def _addMessage(self, message):
#		self._messages.append(message)
#		self._stateMonitor.addMessage(message)
#
#	def _estimateTotalPrintTime(self, progress, printTime):
#		if not progress or not printTime or not self._timeEstimationData:
#			#self._estimationLogger.info("{progress};{printTime};;;;".format(**locals()))
#			return None
#
#		else:
#			newEstimate = printTime / progress
#			self._timeEstimationData.update(newEstimate)
#
#			result = None
#			if self._timeEstimationData.is_stable():
#				result = self._timeEstimationData.average_total_rolling
#
#			#averageTotal = self._timeEstimationData.average_total
#			#averageTotalRolling = self._timeEstimationData.average_total_rolling
#			#averageDistance = self._timeEstimationData.average_distance
#
#			#self._estimationLogger.info("{progress};{printTime};{newEstimate};{averageTotal};{averageTotalRolling};{averageDistance}".format(**locals()))
#
#			return result
#
#	def _setProgressData(self, progress, filepos, printTime, cleanedPrintTime):
#		estimatedTotalPrintTime = self._estimateTotalPrintTime(progress, cleanedPrintTime)
#		statisticalTotalPrintTime = None
#		totalPrintTime = estimatedTotalPrintTime
#
#		if self._selectedFile and "estimatedPrintTime" in self._selectedFile and self._selectedFile["estimatedPrintTime"]:
#			statisticalTotalPrintTime = self._selectedFile["estimatedPrintTime"]
#			if progress and cleanedPrintTime:
#				if estimatedTotalPrintTime is None:
#					totalPrintTime = statisticalTotalPrintTime
#				else:
#					if progress < 0.5:
#						sub_progress = progress * 2
#					else:
#						sub_progress = 1.0
#					totalPrintTime = (1 - sub_progress) * statisticalTotalPrintTime + sub_progress * estimatedTotalPrintTime
#
#		#self._printTimeLogger.info("{progress};{cleanedPrintTime};{estimatedTotalPrintTime};{statisticalTotalPrintTime};{totalPrintTime}".format(**locals()))
#
#		self._progress = progress
#		self._printTime = printTime
#		self._printTimeLeft = totalPrintTime - cleanedPrintTime if (totalPrintTime is not None and cleanedPrintTime is not None) else None
#
#		self._stateMonitor.setProgress({
#			"completion": self._progress * 100 if self._progress is not None else None,
#			"filepos": filepos,
#			"printTime": int(self._printTime) if self._printTime is not None else None,
#			"printTimeLeft": int(self._printTimeLeft) if self._printTimeLeft is not None else None
#		})
#
#		if progress:
#			progress_int = int(progress * 100)
#			if self._lastProgressReport != progress_int:
#				self._lastProgressReport = progress_int
#				self._reportPrintProgressToPlugins(progress_int)
#
#
#	def _addTemperatureData(self, temp, bedTemp):
#		currentTimeUtc = int(time.time())
#
#		data = {
#			"time": currentTimeUtc
#		}
#		for tool in temp.keys():
#			data["tool%d" % tool] = {
#				"actual": temp[tool][0],
#				"target": temp[tool][1]
#			}
#		if bedTemp is not None and isinstance(bedTemp, tuple):
#			data["bed"] = {
#				"actual": bedTemp[0],
#				"target": bedTemp[1]
#			}
#
#		self._temps.append(data)
#
#		self._temp = temp
#		self._bedTemp = bedTemp
#
#		self._stateMonitor.addTemperature(data)
#
#	def _setJobData(self, filename, filesize, sd):
#		if filename is not None:
#			self._selectedFile = {
#				"filename": filename,
#				"filesize": filesize,
#				"sd": sd,
#				"estimatedPrintTime": None
#			}
#		else:
#			self._selectedFile = None
#			self._stateMonitor.setJobData({
#				"file": {
#					"name": None,
#					"origin": None,
#					"size": None,
#					"date": None
#				},
#				"estimatedPrintTime": None,
#				"averagePrintTime": None,
#				"lastPrintTime": None,
#				"filament": None,
#			})
#			return
#
#		estimatedPrintTime = None
#		lastPrintTime = None
#		averagePrintTime = None
#		date = None
#		filament = None
#		if filename:
#			# Use a string for mtime because it could be float and the
#			# javascript needs to exact match
#			if not sd:
#				date = int(os.stat(filename).st_ctime)
#
#			try:
#				fileData = self._fileManager.get_metadata(FileDestinations.SDCARD if sd else FileDestinations.LOCAL, filename)
#			except:
#				fileData = None
#			if fileData is not None:
#				if "analysis" in fileData:
#					if estimatedPrintTime is None and "estimatedPrintTime" in fileData["analysis"]:
#						estimatedPrintTime = fileData["analysis"]["estimatedPrintTime"]
#					if "filament" in fileData["analysis"].keys():
#						filament = fileData["analysis"]["filament"]
#				if "statistics" in fileData:
#					printer_profile = self._printerProfileManager.get_current_or_default()["id"]
#					if "averagePrintTime" in fileData["statistics"] and printer_profile in fileData["statistics"]["averagePrintTime"]:
#						averagePrintTime = fileData["statistics"]["averagePrintTime"][printer_profile]
#					if "lastPrintTime" in fileData["statistics"] and printer_profile in fileData["statistics"]["lastPrintTime"]:
#						lastPrintTime = fileData["statistics"]["lastPrintTime"][printer_profile]
#
#				if averagePrintTime is not None:
#					self._selectedFile["estimatedPrintTime"] = averagePrintTime
#				elif estimatedPrintTime is not None:
#					# TODO apply factor which first needs to be tracked!
#					self._selectedFile["estimatedPrintTime"] = estimatedPrintTime
#
#		self._stateMonitor.setJobData({
#			"file": {
#				"name": os.path.basename(filename) if filename is not None else None,
#				"origin": FileDestinations.SDCARD if sd else FileDestinations.LOCAL,
#				"size": filesize,
#				"date": date
#			},
#			"estimatedPrintTime": estimatedPrintTime,
#			"averagePrintTime": averagePrintTime,
#			"lastPrintTime": lastPrintTime,
#			"filament": filament,
#		})
#
#	def _sendInitialStateUpdate(self, callback):
#		try:
#			data = self._stateMonitor.getCurrentData()
#			data.update({
#				"temps": list(self._temps),
#				"logs": list(self._log),
#				"messages": list(self._messages)
#			})
#			callback.sendHistoryData(data)
#		except Exception, err:
#			import sys
#			sys.stderr.write("ERROR: %s\n" % str(err))
#			pass
#
#	def _getStateFlags(self):
#		return {
#			"operational": self.isOperational(),
#			"locked": self.isLocked(),
#			"printing": self.isPrinting(),
#			"closedOrError": self.isClosedOrError(),
#			"error": self.isError(),
#			"paused": self.isPaused(),
#			"ready": self.isReady(),
#			"sdReady": self.isSdReady()
#		}
#
#	#~~ callbacks triggered from self._comm
#
#	def mcLog(self, message):
#		"""
#		 Callback method for the comm object, called upon log output.
#		#"""
#		self._addLog(message)
#
#	def mcTempUpdate(self, temp, bedTemp):
#		self._addTemperatureData(temp, bedTemp)
#
#	def mcPosUpdate(self, MPos, WPos):
#		self._addPositionData(MPos, WPos)
#
#	def mcStateChange(self, state):
#		"""
#		 Callback method for the comm object, called if the connection state changes.
#		#"""
#		oldState = self._state
#
#		# forward relevant state changes to gcode manager
#		if self._comm is not None and oldState == self._comm.STATE_PRINTING:
#			if self._selectedFile is not None:
#				if state == self._comm.STATE_OPERATIONAL:
#					self._fileManager.log_print(FileDestinations.SDCARD if self._selectedFile["sd"] else FileDestinations.LOCAL, self._selectedFile["filename"], time.time(), self._comm.getPrintTime(), True, self._printerProfileManager.get_current_or_default()["id"])
#				elif state == self._comm.STATE_CLOSED or state == self._comm.STATE_ERROR or state == self._comm.STATE_CLOSED_WITH_ERROR:
#					self._fileManager.log_print(FileDestinations.SDCARD if self._selectedFile["sd"] else FileDestinations.LOCAL, self._selectedFile["filename"], time.time(), self._comm.getPrintTime(), False, self._printerProfileManager.get_current_or_default()["id"])
#			self._analysisQueue.resume() # printing done, put those cpu cycles to good use
#		elif self._comm is not None and state == self._comm.STATE_PRINTING:
#			self._analysisQueue.pause() # do not analyse files while printing
#
#		self._setState(state)
#
#	def mcMessage(self, message):
#		"""
#		 Callback method for the comm object, called upon message exchanges via serial.
#		 Stores the message in the message buffer, truncates buffer to the last 300 lines.
#		#"""
#		self._addMessage(message)
#
#	def mcProgress(self):
#		"""
#		 Callback method for the comm object, called upon any change in progress of the printjob.
#		 Triggers storage of new values for printTime, printTimeLeft and the current progress.
#		#"""
#
#		self._setProgressData(self._comm.getPrintProgress(), self._comm.getPrintFilepos(), self._comm.getPrintTime(), self._comm.getCleanedPrintTime())
#=======
		"""
		Jogs the specified printer ``axis`` by the specified ``amount`` in mm.

		Arguments:
		    axis (str): The axis to jog, will be converted to lower case, one of "x", "y", "z" or "e"
		    amount (int, float): The amount by which to jog in mm
		"""
		raise NotImplementedError()

	def home(self, axes):
		"""
		Homes the specified printer ``axes``.

		Arguments:
		    axes (str, list): The axis or axes to home, each of which must converted to lower case must match one of
		        "x", "y", "z" and "e"
		"""
		raise NotImplementedError()

	def extrude(self, amount):
		"""
		Extrude ``amount`` milimeters of material from the tool.

		Arguments:
		    amount (int, float): The amount of material to extrude in mm
		"""
		raise NotImplementedError()

	def change_tool(self, tool):
		"""
		Switch the currently active ``tool`` (for which extrude commands will apply).

		Arguments:
		    tool (str): The tool to switch to, matching the regex "tool[0-9]+" (e.g. "tool0", "tool1", ...)
		"""
		raise NotImplementedError()

	def set_temperature(self, heater, value):
		"""
		Sets the target temperature on the specified ``heater`` to the given ``value`` in celsius.

		Arguments:
		    heater (str): The heater for which to set the target temperature. Either "bed" for setting the bed
		        temperature or something matching the regular expression "tool[0-9]+" (e.g. "tool0", "tool1", ...) for
		        the hotends of the printer
		    value (int, float): The temperature in celsius to set the target temperature to.
		"""
		raise NotImplementedError()

	def set_temperature_offset(self, offsets=None):
		"""
		Sets the temperature ``offsets`` to apply to target temperatures red from a GCODE file while printing.

		Arguments:
		    offsets (dict): A dictionary specifying the offsets to apply. Keys must match the format for the ``heater``
		        parameter to :func:`set_temperature`, so "bed" for the offset for the bed target temperature and
		        "tool[0-9]+" for the offsets to the hotend target temperatures.
		"""
		raise NotImplementedError()

	def feed_rate(self, factor):
		"""
		Sets the ``factor`` for the printer's feed rate.

		Arguments:
		    factor (int, float): The factor for the feed rate to send to the firmware. Percentage expressed as either an
		    int between 0 and 100 or a float between 0 and 1.
		"""
		raise NotImplementedError()

	def flow_rate(self, factor):
		"""
		Sets the ``factor`` for the printer's flow rate.
#>>>>>>> upstream/maintenance

		Arguments:
		    factor (int, float): The factor for the flow rate to send to the firmware. Percentage expressed as either an
		    int between 0 and 100 or a float between 0 and 1.
		"""
		raise NotImplementedError()

	def select_file(self, path, sd, printAfterSelect=False):
		"""
		Selects the specified ``path`` for printing, specifying if the file is to be found on the ``sd`` or not.
		Optionally can also directly start the print after selecting the file.

		Arguments:
		    path (str): The path to select for printing. Either an absolute path (local file) or a
		"""
		raise NotImplementedError()

	def unselect_file(self):
		"""
		Unselects and currently selected file.
		"""
		raise NotImplementedError()

	def start_print(self):
		"""
		Starts printing the currently selected file. If no file is currently selected, does nothing.
		"""
		raise NotImplementedError()

	def toggle_pause_print(self):
		"""
		Pauses the current print job if it is currently running or resumes it if it is currently paused.
		"""
		raise NotImplementedError()

	def cancel_print(self):
		"""
		Cancels the current print job.
		"""
		raise NotImplementedError()

	def get_state_string(self):
		"""
		Returns:
		     (str) A human readable string corresponding to the current communication state.
		"""
		raise NotImplementedError()

	def get_current_data(self):
		"""
		Returns:
		    (dict) The current state data.
		"""
		raise NotImplementedError()

	def get_current_job(self):
		"""
		Returns:
		    (dict) The data of the current job.
		"""
		raise NotImplementedError()

	def get_current_temperatures(self):
		"""
		Returns:
		    (dict) The current temperatures.
		"""
		raise NotImplementedError()

	def get_temperature_history(self):
		"""
		Returns:
		    (list) The temperature history.
		"""
		raise NotImplementedError()

	def get_current_connection(self):
		"""
		Returns:
		    (tuple) The current connection information as a 4-tuple ``(connection_string, port, baudrate, printer_profile)``.
		        If the printer is currently not connected, the tuple will be ``("Closed", None, None, None)``.
		"""
		raise NotImplementedError()

	def is_closed_or_error(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently disconnected and/or in an error state.
		"""
		raise NotImplementedError()

	def is_operational(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently connected and available.
		"""
		raise NotImplementedError()

	def is_printing(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently printing.
		"""
		raise NotImplementedError()

	def is_paused(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently paused.
		"""
		raise NotImplementedError()

	def is_error(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently in an error state.
		"""
		raise NotImplementedError()

	def is_ready(self):
		"""
		Returns:
		    (boolean) Whether the printer is currently operational and ready for new print jobs (not printing).
		"""
		raise NotImplementedError()

	def register_callback(self, callback):
		"""
		Registers a :class:`PrinterCallback` with the instance.

		Arguments:
		    callback (PrinterCallback): The callback object to register.
		"""
		raise NotImplementedError()

	def unregister_callback(self, callback):
		"""
		Unregisters a :class:`PrinterCallback` from the instance.

		Arguments:
		    callback (PrinterCallback): The callback object to unregister.
		"""
		raise NotImplementedError()


class PrinterCallback(object):
	def on_printer_add_log(self, data):
		"""
		Called when the :class:`PrinterInterface` receives a new communication log entry from the communication layer.

		Arguments:
		    data (str): The received log line.
		"""
		pass

	def on_printer_add_message(self, data):
		"""
		Called when the :class:`PrinterInterface` receives a new message from the communication layer.

		Arguments:
		    data (str): The received message.
		"""
		pass

	def on_printer_add_temperature(self, data):
		"""
		Called when the :class:`PrinterInterface` receives a new temperature data set from the communication layer.

		``data`` is a ``dict`` of the following structure::

		    tool0:
		        actual: <temperature of the first hotend, in degC>
		        target: <target temperature of the first hotend, in degC>
		    ...
		    bed:
		        actual: <temperature of the bed, in degC>
		        target: <target temperature of the bed, in degC>

		Arguments:
		    data (dict): A dict of all current temperatures in the format as specified above
		"""
		pass

	def on_printer_received_registered_message(self, name, output):
		"""
		Called when the :class:`PrinterInterface` received a registered message, e.g. from a feedback command.

		Arguments:
		    name (str): Name of the registered message (e.g. the feedback command)
		    output (str): Output for the registered message
		"""
		pass

	def on_printer_send_initial_data(self, data):
		"""
		Called when registering as a callback with the :class:`PrinterInterface` to receive the initial data (state,
		log and temperature history etc) from the printer.

		``data`` is a ``dict`` of the following structure::

		    temps:
		      - time: <timestamp of the temperature data point>
		        tool0:
		            actual: <temperature of the first hotend, in degC>
		            target: <target temperature of the first hotend, in degC>
		        ...
		        bed:
		            actual: <temperature of the bed, in degC>
		            target: <target temperature of the bed, in degC>
		      - ...
		    logs: <list of current communication log lines>
		    messages: <list of current messages from the firmware>

		Arguments:
		    data (dict): The initial data in the format as specified above.
		"""
		pass

	def on_printer_send_current_data(self, data):
		"""
		Called when the internal state of the :class:`PrinterInterface` changes, due to changes in the printer state,
		temperatures, log lines, job progress etc. Updates via this method are guaranteed to be throttled to a maximum
		of 2 calles per second.

		``data`` is a ``dict`` of the following structure::

		    state:
		        text: <current state string>
		        flags:
		            operational: <whether the printer is currently connected and responding>
		            printing: <whether the printer is currently printing>
		            closedOrError: <whether the printer is currently disconnected and/or in an error state>
		            error: <whether the printer is currently in an error state>
		            paused: <whether the printer is currently paused>
		            ready: <whether the printer is operational and ready for jobs>
		            sdReady: <whether an SD card is present>
		    job:
		        file:
		            name: <name of the file>,
		            size: <size of the file in bytes>,
		            origin: <origin of the file, "local" or "sdcard">,
		            date: <last modification date of the file>
		        estimatedPrintTime: <estimated print time of the file in seconds>
		        lastPrintTime: <last print time of the file in seconds>
		        filament:
		            length: <estimated length of filament needed for this file, in mm>
		            volume: <estimated volume of filament needed for this file, in ccm>
		    progress:
		        completion: <progress of the print job in percent (0-100)>
		        filepos: <current position in the file in bytes>
		        printTime: <current time elapsed for printing, in seconds>
		        printTimeLeft: <estimated time left to finish printing, in seconds>
		    currentZ: <current position of the z axis, in mm>
		    offsets: <current configured temperature offsets, keys are "bed" or "tool[0-9]+", values the offset in degC>

		Arguments:
		    data (dict): The current data in the format as specified above.
		"""
#<<<<<<< HEAD
#		 Returns a human readable string corresponding to the current communication state.
#		"""
#		if self._comm is None:
#			return "Offline"
#		else:
#			return self._comm.getStateString()
#
#	def getCurrentData(self):
#		return self._stateMonitor.getCurrentData()
#
#	def getCurrentJob(self):
#		currentData = self._stateMonitor.getCurrentData()
#		return currentData["job"]
#
#	def getCurrentTemperatures(self):
#		if self._comm is not None:
#			tempOffset, bedTempOffset = self._comm.getOffsets()
#		else:
#			tempOffset = {}
#			bedTempOffset = None
#
#		result = {}
#		if self._temp is not None:
#			for tool in self._temp.keys():
#				result["tool%d" % tool] = {
#					"actual": self._temp[tool][0],
#					"target": self._temp[tool][1],
#					"offset": tempOffset[tool] if tool in tempOffset.keys() and tempOffset[tool] is not None else 0
#					}
#		if self._bedTemp is not None:
#			result["bed"] = {
#				"actual": self._bedTemp[0],
#				"target": self._bedTemp[1],
#				"offset": bedTempOffset
#			}
#
#		return result
#
#	def getTemperatureHistory(self):
#		return self._temps
#
#	def getCurrentConnection(self):
#		if self._comm is None:
#			return "Closed", None, None, None
#
#		port, baudrate = self._comm.getConnection()
#		printer_profile = self._printerProfileManager.get_current_or_default()
#		return self._comm.getStateString(), port, baudrate, printer_profile
#
#	def isClosedOrError(self):
#		return self._comm is None or self._comm.isClosedOrError()
#
#	def isOperational(self):
#		return self._comm is not None and self._comm.isOperational()
#
#	def isLocked(self):
#		return self._comm is not None and self._comm.isLocked()
#
#	def isPrinting(self):
#		return self._comm is not None and self._comm.isPrinting()
#
#	def isPaused(self):
#		return self._comm is not None and self._comm.isPaused()
#
#	def isError(self):
#		return self._comm is not None and self._comm.isError()
#
#	def isReady(self):
#		return self.isOperational() and not self._comm.isStreaming()
#
#	def isSdReady(self):
#		if not settings().getBoolean(["feature", "sdSupport"]) or self._comm is None:
#			return False
#		else:
#			return self._comm.isSdReady()
#
#class StateMonitor(object):
#	def __init__(self, ratelimit, updateCallback, addTemperatureCallback, addLogCallback, addMessageCallback):
#		self._ratelimit = ratelimit
#		self._updateCallback = updateCallback
#		self._addTemperatureCallback = addTemperatureCallback
#		self._addLogCallback = addLogCallback
#		self._addMessageCallback = addMessageCallback
#
#		self._state = None
#		self._jobData = None
#		self._gcodeData = None
#		self._sdUploadData = None
#		self._currentZ = None
#		self._machinePosition = None
#		self._workPosition = None
#		self._progress = None
#
#		self._offsets = {}
#
#		self._changeEvent = threading.Event()
#		self._stateMutex = threading.Lock()
#
#		self._lastUpdate = time.time()
#		self._worker = threading.Thread(target=self._work)
#		self._worker.daemon = True
#		self._worker.start()
#
#	def reset(self, state=None, jobData=None, progress=None, currentZ=None, machinePosition=None, workPosition=None):
#		self.setState(state)
#		self.setJobData(jobData)
#		self.setProgress(progress)
#		self.setMachinePosition(machinePosition)
#		self.setWorkPosition(workPosition)
#		self.setCurrentZ(currentZ)
#
#	def addTemperature(self, temperature):
#		self._addTemperatureCallback(temperature)
#		self._changeEvent.set()
#
#	def setWorkPosition(self, workPosition):
#		self._workPosition = workPosition
#		self._changeEvent.set()
#
#	def setMachinePosition(self, machinePosition):
#		self._machinePosition = machinePosition
#		self._changeEvent.set()
#
#	def addLog(self, log):
#		self._addLogCallback(log)
#		self._changeEvent.set()
#
#	def addMessage(self, message):
#		self._addMessageCallback(message)
#		self._changeEvent.set()
#
#	def setCurrentZ(self, currentZ):
#		self._currentZ = currentZ
#		self._changeEvent.set()
#
#	def setState(self, state):
#		with self._stateMutex:
#			self._state = state
#			self._changeEvent.set()
#
#	def setJobData(self, jobData):
#		self._jobData = jobData
#		self._changeEvent.set()
#
#	def setProgress(self, progress):
#		self._progress = progress
#		self._changeEvent.set()
#
#	def setTempOffsets(self, offsets):
#		self._offsets = offsets
#		self._changeEvent.set()
#
#	def _work(self):
#		while True:
#			self._changeEvent.wait()
#
#			with self._stateMutex:
#				now = time.time()
#				delta = now - self._lastUpdate
#				additionalWaitTime = self._ratelimit - delta
#				if additionalWaitTime > 0:
#					time.sleep(additionalWaitTime)
#
#				data = self.getCurrentData()
#				self._updateCallback(data)
#				self._lastUpdate = time.time()
#				self._changeEvent.clear()
#
#	def getCurrentData(self):
#		return {
#			"state": self._state,
#			"job": self._jobData,
#			"machinePosition": self._machinePosition,
#			"workPosition": self._workPosition,
#			"currentZ": self._currentZ,
#			"progress": self._progress,
#			"offsets": self._offsets
#		}
#
#
#class TimeEstimationHelper(object):
#
#	STABLE_THRESHOLD = 0.1
#	STABLE_COUNTDOWN = 250
#	STABLE_ROLLING_WINDOW = 250
#
#	def __init__(self):
#		import collections
#		self._distances = collections.deque([], self.__class__.STABLE_ROLLING_WINDOW)
#		self._totals = collections.deque([], self.__class__.STABLE_ROLLING_WINDOW)
#		self._sum_total = 0
#		self._count = 0
#		self._stable_counter = None
#
#	def is_stable(self):
#		return self._stable_counter is not None and self._stable_counter >= self.__class__.STABLE_COUNTDOWN
#
#	def update(self, newEstimate):
#			old_average_total = self.average_total
#
#			self._sum_total += newEstimate
#			self._totals.append(newEstimate)
#			self._count += 1
#
#			if old_average_total:
#				self._distances.append(abs(self.average_total - old_average_total))
#
#			if -1.0 * self.__class__.STABLE_THRESHOLD < self.average_distance < self.__class__.STABLE_THRESHOLD:
#				if self._stable_counter is None:
#					self._stable_counter = 0
#				else:
#					self._stable_counter += 1
#			else:
#				self._stable_counter = None
#
#	@property
#	def average_total(self):
#		if not self._count:
#			return None
#		else:
#			return self._sum_total / self._count
#
#	@property
#	def average_total_rolling(self):
#		if not self._count or self._count < self.__class__.STABLE_ROLLING_WINDOW:
#			return None
#		else:
#			return sum(self._totals) / len(self._totals)
#
#	@property
#	def average_distance(self):
#		if not self._count or self._count < self.__class__.STABLE_ROLLING_WINDOW + 1:
#			return None
#		else:
#			return sum(self._distances) / len(self._distances)
#=======
		pass
#>>>>>>> upstream/maintenance

class UnknownScript(Exception):
	def __init__(self, name, *args, **kwargs):
		self.name = name
