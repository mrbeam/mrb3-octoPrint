# coding=utf-8
from __future__ import absolute_import
__author__ = "Florian Becker <florian@mr-beam.org> based on work by Gina Häußge and David Braam"
__license__ = "GNU Affero General Public License http://www.gnu.org/licenses/agpl.html"
__copyright__ = "Copyright (C) 2013 David Braam - Released under terms of the AGPLv3 License"

import os
import threading
import logging
import glob
import time
import serial
import re

from yaml import load as yamlload
from yaml import dump as yamldump
from subprocess import call as subprocesscall

import octoprint.plugin

from octoprint.events import eventManager, Events
from octoprint.settings import settings, default_settings
from octoprint.util import get_exception_string, RepeatedTimer, CountedEvent, sanitize_ascii

### MachineCom #########################################################################################################
class MachineCom(object):
	STATE_NONE = 0
	STATE_OPEN_SERIAL = 1
	STATE_DETECT_SERIAL = 2
	STATE_CONNECTING = 3
	STATE_OPERATIONAL = 4
	STATE_PRINTING = 5
	STATE_PAUSED = 6
	STATE_CLOSED = 7
	STATE_ERROR = 8
	STATE_CLOSED_WITH_ERROR = 9
	STATE_LOCKED = 10
	STATE_HOMING = 11
	STATE_FLASHING = 12

	def __init__(self, port=None, baudrate=None, callbackObject=None, printerProfileManager=None):
		self._logger = logging.getLogger(__name__)
		self._serialLogger = logging.getLogger("SERIAL")

		if port is None:
			port = settings().get(["serial", "port"])
		if baudrate is None:
			settingsBaudrate = settings().getInt(["serial", "baudrate"])
			if settingsBaudrate is None:
				baudrate = 0
			else:
				baudrate = settingsBaudrate
		if callbackObject is None:
			callbackObject = MachineComPrintCallback()

		self._port = port
		self._baudrate = baudrate
		self._callback = callbackObject
		self._printerProfileManager = printerProfileManager

		self._state = self.STATE_NONE
		self._errorValue = "Unknown Error"
		self._serial = None
		self._currentFile = None
		self._clear_to_send = CountedEvent(max=10, name="comm.clear_to_send")
		self._long_running_command = False
		self._status_timer = None

		# hooks
		self._pluginManager = octoprint.plugin.plugin_manager()
		self._serial_factory_hooks = self._pluginManager.get_hooks("octoprint.comm.transport.serial.factory")

		self._state_parse_dict = {self.STATE_NONE:self._state_none_handle,
								self.STATE_CONNECTING:self._state_connecting_handle,
								self.STATE_LOCKED:self._state_locked_handle,
								self.STATE_HOMING:self._state_homing_handle,
								self.STATE_OPERATIONAL:self._state_operational_handle}

		# monitoring thread
		self._monitoring_active = True
		self.monitoring_thread = threading.Thread(target=self._monitor_loop, name="comm._monitoring_thread")
		self.monitoring_thread.daemon = True
		self.monitoring_thread.start()

		# sending thread
		self._sending_active = True
		self.sending_thread = threading.Thread(target=self._send_loop, name="comm.sending_thread")
		self.sending_thread.daemon = True
		self.sending_thread.start()

	def _monitor_loop(self):
		pause_triggers = convert_pause_triggers(settings().get(["printerParameters", "pauseTriggers"]))

		#Open the serial port.
		if not self._openSerial():
			return

		self._log("Connected to: %s, starting monitor" % self._serial)
		self._changeState(self.STATE_CONNECTING)
		self._timeout = get_new_timeout("communication")

		supportWait = settings().getBoolean(["feature", "supportWait"])

		while self._monitoring_active:
			try:
				line = self._readline()
				if line is None:
					break
				if line.strip() is not "":
					self._timeout = get_new_timeout("communication")

				# parse line depending on state
				self._state_parse_dict[self._state](self, line)

				return






				# # GRBL Position update
				# if self._grbl :
				# 	if(self._state == self.STATE_HOMING and 'ok' in line):
				# 		self._changeState(self.STATE_OPERATIONAL)
				# 		self._onHomingDone();
				#
				# 	# TODO check if "Alarm" is enough
				# 	if("Alarm lock" in line):
				# 		self._changeState(self.STATE_LOCKED)
				# 	if("['$H'|'$X' to unlock]" in line):
				# 		self._changeState(self.STATE_LOCKED)
				#
				# 	# TODO maybe better in _gcode_X_sent ...
				# 	if("Idle" in line and (self._state == self.STATE_LOCKED)   ):
				# 		self._changeState(self.STATE_OPERATIONAL)
				#
				# 	# TODO highly experimental. needs testing.
				# 	if("Hold" in line and self._state == self.STATE_PRINTING):
				# 		self._changeState(self.STATE_PAUSED)
				# 	#if("Run" in line and self._state == self.STATE_PAUSED):
				# 	#	self._changeState(self.STATE_PRINTING)
				#
				# 	if 'MPos:' in line:
				# 		self._update_grbl_pos(line)
				#
				# 	if("ALARM: Hard/soft limit" in line):
				# 		errorMsg = "Machine Limit Hit. Please reset the machine and do a homing cycle"
				# 		self._log(errorMsg)
				# 		self._errorValue = errorMsg
				# 		eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
				# 		eventManager().fire(Events.LIMITS_HIT, {"error": self.getErrorString()})
				# 		self._openSerial()
				# 		self._changeState(self.STATE_CONNECTING)
				#
				# 	if("Invalid gcode" in line and self._state == self.STATE_PRINTING):
				# 		# TODO Pause machine instead of resetting it.
				# 		errorMsg = line
				# 		self._log(errorMsg)
				# 		self._errorValue = errorMsg
				# 		#						self._changeState(self.STATE_ERROR)
				# 		eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
				# 		self._openSerial()
				# 		self._changeState(self.STATE_CONNECTING)
				#
				# 	if("Grbl" in line and self._state == self.STATE_PRINTING):
				# 		errorMsg = "Machine reset."
				# 		self._log(errorMsg)
				# 		self._errorValue = errorMsg
				# 		self._changeState(self.STATE_LOCKED)
				# 		eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
				#
				# 	if("Grbl" in line):
				# 		versionMatch = re.search("Grbl (?P<grbl>.+?)(_(?P<git>[0-9a-f]{7})(?P<dirty>-dirty)?)? \[.+\]", line)
				# 		if(versionMatch):
				# 			versionDict = versionMatch.groupdict()
				# 			self._writeGrblVersionToFile(versionDict)
				# 			if self._compareGrblVersion(versionDict) is False:
				# 				self._flashGrbl()
				#
				# 	if("error:" in line):
				# 		self.handle_grbl_error(line)
				#
				# 	#				##~~ SD file list
				# 	#				# if we are currently receiving an sd file list, each line is just a filename, so just read it and abort processing
				# 	#				if self._sdFileList and not "End file list" in line:
				# 	#					preprocessed_line = line.strip().lower()
				# 	#					fileinfo = preprocessed_line.rsplit(None, 1)
				# 	#					if len(fileinfo) > 1:
				# 	#						# we might have extended file information here, so let's split filename and size and try to make them a bit nicer
				# 	#						filename, size = fileinfo
				# 	#						try:
				# 	#							size = int(size)
				# 	#						except ValueError:
				# 	#							# whatever that was, it was not an integer, so we'll just use the whole line as filename and set size to None
				# 	#							filename = preprocessed_line
				# 	#							size = None
				# 	#					else:
				# 	#						# no extended file information, so only the filename is there and we set size to None
				# 	#						filename = preprocessed_line
				# 	#						size = None
				# 	#
				# 	#					if valid_file_type(filename, "machinecode"):
				# 	#						if filter_non_ascii(filename):
				# 	#							self._logger.warn("Got a file from printer's SD that has a non-ascii filename (%s), that shouldn't happen according to the protocol" % filename)
				# 	#						else:
				# 	#							if not filename.startswith("/"):
				# 	#								# file from the root of the sd -- we'll prepend a /
				# 	#								filename = "/" + filename
				# 	#							self._sdFiles.append((filename, size))
				# 	#						continue
				#
				# ##~~ process oks
				# if line.strip().startswith("ok") or (self.isPrinting() and supportWait and line.strip().startswith("wait")):
				# 	self._clear_to_send.set()
				# 	self._long_running_command = False
				#
				# #				##~~ Temperature processing
				# #				if ' T:' in line or line.startswith('T:') or ' T0:' in line or line.startswith('T0:') or ' B:' in line or line.startswith('B:'):
				# #					if not disable_external_heatup_detection and not line.strip().startswith("ok") and not self._heating:
				# #						self._logger.debug("Externally triggered heatup detected")
				# #						self._heating = True
				# #						self._heatupWaitStartTime = time.time()
				# #					self._processTemperatures(line)
				# #					self._callback.on_comm_temperature_update(self._temp, self._bedTemp)
				# #
				# #				elif supportRepetierTargetTemp and ('TargetExtr' in line or 'TargetBed' in line):
				# #					matchExtr = self._regex_repetierTempExtr.match(line)
				# #					matchBed = self._regex_repetierTempBed.match(line)
				# #
				# #					if matchExtr is not None:
				# #						toolNum = int(matchExtr.group(1))
				# #						try:
				# #							target = float(matchExtr.group(2))
				# #							if toolNum in self._temp.keys() and self._temp[toolNum] is not None and isinstance(self._temp[toolNum], tuple):
				# #								(actual, oldTarget) = self._temp[toolNum]
				# #								self._temp[toolNum] = (actual, target)
				# #							else:
				# #								self._temp[toolNum] = (None, target)
				# #							self._callback.on_comm_temperature_update(self._temp, self._bedTemp)
				# #						except ValueError:
				# #							pass
				# #					elif matchBed is not None:
				# #						try:
				# #							target = float(matchBed.group(1))
				# #							if self._bedTemp is not None and isinstance(self._bedTemp, tuple):
				# #								(actual, oldTarget) = self._bedTemp
				# #								self._bedTemp = (actual, target)
				# #							else:
				# #								self._bedTemp = (None, target)
				# #							self._callback.on_comm_temperature_update(self._temp, self._bedTemp)
				# #						except ValueError:
				# #							pass
				#
				# #				#If we are waiting for an M109 or M190 then measure the time we lost during heatup, so we can remove that time from our printing time estimate.
				# #				if 'ok' in line and self._heatupWaitStartTime:
				# #					self._heatupWaitTimeLost = self._heatupWaitTimeLost + (time.time() - self._heatupWaitStartTime)
				# #					self._heatupWaitStartTime = None
				# #					self._heating = False
				#
				# #				##~~ SD Card handling
				# #				elif 'SD init fail' in line or 'volume.init failed' in line or 'openRoot failed' in line:
				# #					self._sdAvailable = False
				# #					self._sdFiles = []
				# #					self._callback.on_comm_sd_state_change(self._sdAvailable)
				# #				elif 'Not SD printing' in line:
				# #					if self.isSdFileSelected() and self.isPrinting():
				# #						# something went wrong, printer is reporting that we actually are not printing right now...
				# #						self._sdFilePos = 0
				# #						self._changeState(self.STATE_OPERATIONAL)
				# #				elif 'SD card ok' in line and not self._sdAvailable:
				# #					self._sdAvailable = True
				# #					self.refreshSdFiles()
				# #					self._callback.on_comm_sd_state_change(self._sdAvailable)
				# #				elif 'Begin file list' in line:
				# #					self._sdFiles = []
				# #					self._sdFileList = True
				# #				elif 'End file list' in line:
				# #					self._sdFileList = False
				# #					self._callback.on_comm_sd_files(self._sdFiles)
				# #				elif 'SD printing byte' in line and self.isSdPrinting():
				# #					# answer to M27, at least on Marlin, Repetier and Sprinter: "SD printing byte %d/%d"
				# #					match = self._regex_sdPrintingByte.search(line)
				# #					self._currentFile.setFilepos(int(match.group(1)))
				# #					self._callback.on_comm_progress()
				# #				elif 'File opened' in line and not self._ignore_select:
				# #					# answer to M23, at least on Marlin, Repetier and Sprinter: "File opened:%s Size:%d"
				# #					match = self._regex_sdFileOpened.search(line)
				# #					if self._sdFileToSelect:
				# #						name = self._sdFileToSelect
				# #						self._sdFileToSelect = None
				# #					else:
				# #						name = match.group(1)
				# #					self._currentFile = PrintingSdFileInformation(name, int(match.group(2)))
				# #				elif 'File selected' in line:
				# #					if self._ignore_select:
				# #						self._ignore_select = False
				# #					elif self._currentFile is not None:
				# #						# final answer to M23, at least on Marlin, Repetier and Sprinter: "File selected"
				# #						self._callback.on_comm_file_selected(self._currentFile.getFilename(), self._currentFile.getFilesize(), True)
				# #						eventManager().fire(Events.FILE_SELECTED, {
				# #							"file": self._currentFile.getFilename(),
				# #							"origin": self._currentFile.getFileLocation()
				# #						})
				# #				elif 'Writing to file' in line:
				# #					# anwer to M28, at least on Marlin, Repetier and Sprinter: "Writing to file: %s"
				# #					self._changeState(self.STATE_PRINTING)
				# #					self._clear_to_send.set()
				# #					line = "ok"
				# #				elif 'Done printing file' in line and self.isSdPrinting():
				# #					# printer is reporting file finished printing
				# #					self._sdFilePos = 0
				# #					self._callback.on_comm_print_job_done()
				# #					self._changeState(self.STATE_OPERATIONAL)
				# #					eventManager().fire(Events.PRINT_DONE, {
				# #						"file": self._currentFile.getFilename(),
				# #						"filename": os.path.basename(self._currentFile.getFilename()),
				# #						"origin": self._currentFile.getFileLocation(),
				# #						"time": self.getPrintTime()
				# #					})
				# #					if self._sd_status_timer is not None:
				# #						try:
				# #							self._sd_status_timer.cancel()
				# #						except:
				# #							pass
				# #				elif 'Done saving file' in line:
				# #					self.refreshSdFiles()
				# #				elif 'File deleted' in line and line.strip().endswith("ok"):
				# #					# buggy Marlin version that doesn't send a proper \r after the "File deleted" statement, fixed in
				# #					# current versions
				# #					self._clear_to_send.set()
				#
				# ##~~ Message handling
				# elif line.strip() != '' \
				# 		and line.strip() != 'ok' and not line.startswith("wait") \
				# 		and not line.startswith('Resend:') \
				# 		and line != 'echo:Unknown command:""\n' \
				# 		and line != "Unsupported statement" \
				# 		and self.isOperational():
				# 	self._callback.on_comm_message(line)
				#
				# ##~~ Parsing for feedback commands
				# if feedback_controls and feedback_matcher and not "_all" in feedback_errors:
				# 	try:
				# 		self._process_registered_message(line, feedback_matcher, feedback_controls, feedback_errors)
				# 	except:
				# 		# something went wrong while feedback matching
				# 		self._logger.exception("Error while trying to apply feedback control matching, disabling it")
				# 		feedback_errors.append("_all")
				#
				# ##~~ Parsing for pause triggers
				#
				# if pause_triggers and not self.isStreaming():
				# 	if "enable" in pause_triggers.keys() and pause_triggers["enable"].search(line) is not None:
				# 		self.setPause(True)
				# 	elif "disable" in pause_triggers.keys() and pause_triggers["disable"].search(line) is not None:
				# 		self.setPause(False)
				# 	elif "toggle" in pause_triggers.keys() and pause_triggers["toggle"].search(line) is not None:
				# 		self.setPause(not self.isPaused())
				#
				#
				# ### Operational
				# elif self._state == self.STATE_OPERATIONAL or self._state == self.STATE_PAUSED:
				# 	if "ok" in line:
				# 		# if we still have commands to process, process them
				# 		if self._resendSwallowNextOk:
				# 			self._resendSwallowNextOk = False
				# 		elif self._resendDelta is not None:
				# 			self._resendNextCommand()
				# 		elif self._sendFromQueue():
				# 			pass
				#
				# 	# resend -> start resend procedure from requested line
				# 	elif line.lower().startswith("resend") or line.lower().startswith("rs"):
				# 		self._handleResendRequest(line)
				#
				# ### Printing
				# elif self._state == self.STATE_PRINTING:
				# 	if line == "" and time.time() > self._timeout:
				# 		if not self._long_running_command:
				# 			self._log("Communication timeout during printing, forcing a line")
				# 			self._sendCommand("?")
				# 			self._clear_to_send.set()
				# 		else:
				# 			self._logger.debug("Ran into a communication timeout, but a command known to be a long runner is currently active")
				#
				# 	if "ok" in line or (supportWait and "wait" in line):
				# 		# a wait while printing means our printer's buffer ran out, probably due to some ok getting
				# 		# swallowed, so we treat it the same as an ok here teo take up communication again
				# 		if self._resendSwallowNextOk:
				# 			self._resendSwallowNextOk = False
				#
				# 		elif self._resendDelta is not None:
				# 			self._resendNextCommand()
				#
				# 		else:
				# 			if self._sendFromQueue():
				# 				pass
				# 			elif not self.isSdPrinting():
				# 				self._sendNext()
				#
				# 	elif line.lower().startswith("resend") or line.lower().startswith("rs"):
				# 		self._handleResendRequest(line)
			except:
				self._logger.exception("Something crashed inside the serial connection loop, please report this in OctoPrint's bug tracker:")

				errorMsg = "See octoprint.log for details"
				self._log(errorMsg)
				self._errorValue = errorMsg
				self._changeState(self.STATE_ERROR)
				eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
		self._log("Connection closed, closing down monitor")

	def _send_loop(self):
		pass

	def _openSerial(self):
		def default(_, port, baudrate, read_timeout):
			if port is None or port == 'AUTO':
				# no known port, try auto detection
				self._changeState(self.STATE_DETECT_SERIAL)
				ser = self._detectPort(True)
				if ser is None:
					self._errorValue = 'Failed to autodetect serial port, please set it manually.'
					self._changeState(self.STATE_ERROR)
					eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
					self._log("Failed to autodetect serial port, please set it manually.")
					return None
				port = ser.port

			# connect to regular serial port
			self._log("Connecting to: %s" % port)
			if baudrate == 0:
				baudrates = baudrateList()
				ser = serial.Serial(str(port), 115200 if 115200 in baudrates else baudrates[0], timeout=read_timeout, writeTimeout=10000, parity=serial.PARITY_ODD)
			else:
				ser = serial.Serial(str(port), baudrate, timeout=read_timeout, writeTimeout=10000, parity=serial.PARITY_ODD)
			ser.close()
			ser.parity = serial.PARITY_NONE
			ser.open()
			return ser

		serial_factories = self._serial_factory_hooks.items() + [("default", default)]
		for name, factory in serial_factories:
			try:
				serial_obj = factory(self, self._port, self._baudrate, settings().getFloat(["serial", "timeout", "connection"]))
			except (OSError, serial.SerialException):
				exception_string = get_exception_string()
				self._errorValue = "Connection error, see Terminal tab"
				self._changeState(self.STATE_ERROR)
				eventManager().fire(Events.ERROR, {"error": self.getErrorString()})
				self._log("Unexpected error while connecting to serial port: %s %s (hook %s)" % (self._port, exception_string, name))
				if "failed to set custom baud rate" in exception_string.lower():
					self._log("Your installation does not support custom baudrates (e.g. 250000) for connecting to your printer. This is a problem of the pyserial library that OctoPrint depends on. Please update to a pyserial version that supports your baudrate or switch your printer's firmware to a standard baudrate (e.g. 115200). See https://github.com/foosel/OctoPrint/wiki/OctoPrint-support-for-250000-baud-rate-on-Raspbian")
				return False
			if serial_obj is not None:
				# first hook to succeed wins, but any can pass on to the next
				self._changeState(self.STATE_OPEN_SERIAL)
				self._serial = serial_obj
				self._clear_to_send.clear()
				return True
		return False

	def _readline(self):
		if self._serial is None:
			return None
		try:
			ret = self._serial.readline()
			if('ok' in ret or 'error' in ret):
				if(len(self.acc_line_lengths) > 0):
					#print('buffer',sum(self.acc_line_lengths), 'deleting after ok', self.acc_line_lengths[0])
					del self.acc_line_lengths[0]  # Delete the commands character count corresponding to the last 'ok'
		except serial.SerialException:
			self._log("Unexpected error while reading serial port: %s" % (get_exception_string()))
			self._errorValue = get_exception_string()
			self.close(True)
			return None
		if ret == '': return ''
		try:
			self._log("Recv: %s" % sanitize_ascii(ret))
		except ValueError as e:
			self._log("WARN: While reading last line: %s" % e)
			self._log("Recv: %r" % ret)
		return ret

	def _state_none_handle(self, line):
		pass

	def _state_connecting_handle(self, line):
		if line.startswith("Grbl"):
			versionMatch = re.search("Grbl (?P<grbl>.+?)(_(?P<git>[0-9a-f]{7})(?P<dirty>-dirty)?)? \[.+\]", line)
			if(versionMatch):
				versionDict = versionMatch.groupdict()
				self._writeGrblVersionToFile(versionDict)
				if self._compareGrblVersion(versionDict) is False:
					self._flashGrbl()
			self._onConnected(self.STATE_LOCKED)

	def _state_locked_handle(self, line):
		pass

	def _state_homing_handle(self, line):
		if line.startswith("ok"):
			self._changeState(self.STATE_OPERATIONAL)

	def _state_operational_handle(self, line):
		pass

	# internal state management
	def _changeState(self, newState):
		if self._state == newState:
			return

		if newState == self.STATE_PRINTING:
			if self._status_timer is not None:
				self._status_timer.cancel()
		elif newState == self.STATE_OPERATIONAL:
			if self._status_timer is not None:
				self._status_timer.cancel()
			self._status_timer = RepeatedTimer(1, self._poll_status, run_first=True)
			self._status_timer.start()

		if newState == self.STATE_CLOSED or newState == self.STATE_CLOSED_WITH_ERROR:
			if self._currentFile is not None:
				self._currentFile.close()
			self._log("entered state closed / closed with error. reseting character counter.")
			self.acc_line_lengths = []

		oldState = self.getStateString()
		self._state = newState
		self._log('Changing monitoring state from \'%s\' to \'%s\'' % (oldState, self.getStateString()))
		self._callback.on_comm_state_change(newState)

	def _onConnected(self, nextState):
		self._serial.timeout = settings().getFloat(["serial", "timeout", "communication"])

		if(nextState is None):
			self._changeState(self.STATE_LOCKED)
		else:
			self._changeState(nextState)

		payload = dict(port=self._port, baudrate=self._baudrate)
		eventManager().fire(Events.CONNECTED, payload)

	def _detectPort(self, close):
		self._log("Serial port list: %s" % (str(serialList())))
		for p in serialList():
			try:
				self._log("Connecting to: %s" % (p))
				serial_obj = serial.Serial(p)
				if close:
					serial_obj.close()
				return serial_obj
			except (OSError, serial.SerialException) as e:
				self._log("Error while connecting to %s: %s" % (p, str(e)))
		return None

	def _poll_status(self):
		if self.isOperational() and not self._long_running_command:
			self.sendCommand("?", cmd_type="status_poll")

	def _log(self, message):
		self._callback.on_comm_log(message)
		self._serialLogger.debug(message)

	def _compareGrblVersion(self, versionDict):
		cwd = os.path.dirname(__file__)
		with open(cwd + "/../grbl/grblVersionRequirement.yml", 'r') as infile:
			grblReqDict = yamlload(infile)
		requiredGrblVer = str(grblReqDict['grbl']) + '_' + str(grblReqDict['git'])
		if grblReqDict['dirty'] is True:
			requiredGrblVer += '-dirty'
		actualGrblVer = str(versionDict['grbl']) + '_' + str(versionDict['git'])
		if versionDict['dirty'] is not(None):
			actualGrblVer += '-dirty'
		# compare actual and required grbl version
		self._requiredGrblVer = requiredGrblVer
		self._actualGrblVer = actualGrblVer
		print repr(requiredGrblVer)
		print repr(actualGrblVer)
		if requiredGrblVer != actualGrblVer:
			self._log("unsupported grbl version detected...")
			self._log("required: " + requiredGrblVer)
			self._log("detected: " + actualGrblVer)
			return False
		else:
			return True

	def _flashGrbl(self):
		self._changeState(self.STATE_FLASHING)
		self._serial.close()
		cwd = os.path.dirname(__file__)
		pathToGrblHex = cwd + "/../grbl/grbl.hex"

		# TODO check if avrdude is installed.
		# TODO log in logfile as well, not only to the serial monitor (use self._logger.info()... )
		params = ["avrdude", "-patmega328p", "-carduino", "-b" + str(self._baudrate), "-P" + str(self._port), "-D", "-Uflash:w:" + pathToGrblHex]
		rc = subprocesscall(params)

		if rc is False:
			self._log("successfully flashed new grbl version")
			self._openSerial()
			self._changeState(self.STATE_CONNECTING)
		else:
			self._log("error during flashing of new grbl version")
			self._errorValue = "avrdude returncode: %s" % rc
			self._changeState(self.STATE_CLOSED_WITH_ERROR)

	@staticmethod
	def _writeGrblVersionToFile(versionDict):
		if versionDict['dirty'] == '-dirty':
			versionDict['dirty'] = True
		versionDict['lastConnect'] = time.time()
		versionFile = os.path.join(settings().getBaseFolder("logs"), 'grbl_Version.yml')
		with open(versionFile, 'w') as outfile:
			outfile.write(yamldump(versionDict, default_flow_style=True))

	def sendCommand(self, cmd, cmd_type=None):
		pass

	def getStateString(self):
		if self._state == self.STATE_NONE:
			return "Offline"
		if self._state == self.STATE_OPEN_SERIAL:
			return "Opening serial port"
		if self._state == self.STATE_DETECT_SERIAL:
			return "Detecting serial port"
		if self._state == self.STATE_CONNECTING:
			return "Connecting"
		if self._state == self.STATE_OPERATIONAL:
			return "Operational"
		if self._state == self.STATE_PRINTING:
			return "Printing"
		if self._state == self.STATE_PAUSED:
			return "Paused"
		if self._state == self.STATE_CLOSED:
			return "Closed"
		if self._state == self.STATE_ERROR:
			return "Error: %s" % (self.getErrorString())
		if self._state == self.STATE_CLOSED_WITH_ERROR:
			return "Error: %s" % (self.getErrorString())
		if self._state == self.STATE_LOCKED:
			return "Locked"
		if self._state == self.STATE_HOMING:
			return "Homing"
		if self._state == self.STATE_FLASHING:
			return "Flashing"
		return "?%d?" % (self._state)

	def isOperational(self):
		return self._state == self.STATE_OPERATIONAL or self._state == self.STATE_PRINTING or self._state == self.STATE_PAUSED

	def isPrinting(self):
		return self._state == self.STATE_PRINTING

	def isPaused(self):
		return self._state == self.STATE_PAUSED

	def getErrorString(self):
		return self._errorValue

	def close(self, isError = False):
		if self._status_timer is not None:
			try:
				self._status_timer.cancel()
				self._status_timer = None
			except AttributeError:
				pass

		self._monitoring_active = False
		self._sending_active = False

		printing = self.isPrinting() or self.isPaused()
		if self._serial is not None:
			if isError:
				self._changeState(self.STATE_CLOSED_WITH_ERROR)
			else:
				self._changeState(self.STATE_CLOSED)
			self._serial.close()
		self._serial = None

		if printing:
			payload = None
			if self._currentFile is not None:
				payload = {
					"file": self._currentFile.getFilename(),
					"filename": os.path.basename(self._currentFile.getFilename()),
					"origin": self._currentFile.getFileLocation()
				}
			eventManager().fire(Events.PRINT_FAILED, payload)
		eventManager().fire(Events.DISCONNECTED)

### MachineCom callback ################################################################################################
class MachineComPrintCallback(object):
	def on_comm_log(self, message):
		pass

	def on_comm_temperature_update(self, temp, bedTemp):
		pass

	def on_comm_state_change(self, state):
		pass

	def on_comm_message(self, message):
		pass

	def on_comm_progress(self):
		pass

	def on_comm_print_job_done(self):
		pass

	def on_comm_z_change(self, newZ):
		pass

	def on_comm_file_selected(self, filename, filesize, sd):
		pass

	def on_comm_sd_state_change(self, sdReady):
		pass

	def on_comm_sd_files(self, files):
		pass

	def on_comm_file_transfer_started(self, filename, filesize):
		pass

	def on_comm_file_transfer_done(self, filename):
		pass

	def on_comm_force_disconnect(self):
		pass

	def on_comm_pos_update(self, MPos, WPos):
		pass

def convert_pause_triggers(configured_triggers):
	triggers = {
		"enable": [],
		"disable": [],
		"toggle": []
	}
	for trigger in configured_triggers:
		if not "regex" in trigger or not "type" in trigger:
			continue

		try:
			regex = trigger["regex"]
			t = trigger["type"]
			if t in triggers:
				# make sure regex is valid
				re.compile(regex)
				# add to type list
				triggers[t].append(regex)
		except re.error:
			# invalid regex or something like this, we'll just skip this entry
			pass

	result = dict()
	for t in triggers.keys():
		if len(triggers[t]) > 0:
			result[t] = re.compile("|".join(map(lambda pattern: "({pattern})".format(pattern=pattern), triggers[t])))
	return result

def get_new_timeout(t):
	now = time.time()
	return now + get_interval(t)

def get_interval(t):
	if t not in default_settings["serial"]["timeout"]:
		return 0
	else:
		return settings().getFloat(["serial", "timeout", type])

def serialList():
	baselist = [glob.glob("/dev/ttyUSB*"),
			   + glob.glob("/dev/ttyACM*"),
			   + glob.glob("/dev/tty.usb*"),
			   + glob.glob("/dev/cu.*"),
			   + glob.glob("/dev/cuaU*"),
			   + glob.glob("/dev/rfcomm*")]

	additionalPorts = settings().get(["serial", "additionalPorts"])
	for additional in additionalPorts:
		baselist += glob.glob(additional)

	prev = settings().get(["serial", "port"])
	if prev in baselist:
		baselist.remove(prev)
		baselist.insert(0, prev)
	if settings().getBoolean(["devel", "virtualPrinter", "enabled"]):
		baselist.append("VIRTUAL")
	return baselist

def baudrateList():
	ret = [250000, 230400, 115200, 57600, 38400, 19200, 9600]
	prev = settings().getInt(["serial", "baudrate"])
	if prev in ret:
		ret.remove(prev)
		ret.insert(0, prev)
	return ret
