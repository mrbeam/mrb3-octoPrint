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
