# coding=utf-8
from __future__ import absolute_import

__author__ = "Mr Beam Team <info@mrbeam.org>"
__license__ = "GNU Affero General Public License http://www.gnu.org/licenses/agpl.html"
__copyright__ = "Copyright (C) 2015 The Mr Beam Project - Released under terms of the AGPLv3 License"

import logging
import logging.handlers
import os
import flask
import socket

import octoprint.plugin
import octoprint.util
from octoprint.util import dict_merge
import octoprint.settings

default_settings = {
	"agreed_to_safety_notes": False
}
s = octoprint.plugin.plugin_settings("lasersafetynotes", defaults=default_settings)

class LaserSafetyNotesPlugin(octoprint.plugin.SettingsPlugin,
				octoprint.plugin.StartupPlugin,
				octoprint.plugin.BlueprintPlugin,
				octoprint.plugin.AssetPlugin,
                 octoprint.plugin.TemplatePlugin):

	
	def __init__(self):
		pass

	##~~ StartupPlugin API
	def on_startup(self, host, port):
		pass

	##~~ AssetPlugin API
	
	def get_assets(self):
		return {
			"js": ["js/laserSafetyNotes.js"],
			"less": [],
			"css": []
		}

	##~~ SettingsPlugin API

	def on_settings_load(self):
		cfg = dict(
			has_agreed = s.get(["agreed_to_safety_notes"]),
		)
		return cfg

	def on_settings_save(self, data):
		if "has_agreed" in data:
			has_agreed = data["has_agreed"] in octoprint.settings.valid_boolean_trues
			s.set_boolean(["agreed_to_safety_notes"], has_agreed)

	##~~ TemplatePlugin API

	def get_template_vars(self):
		clazz = "show"
		if(s.get(["agreed_to_safety_notes"])):
			clazz = "hide"
		d = dict(has_agreed_class = clazz)
		return d

	def get_template_folder(self):
		#import os
		#return os.path.join(os.path.dirname(os.path.realpath(__file__)), "templates")
		return os.path.join(self._basefolder, "templates")

	def get_template_configs(self):
		return [dict(type = 'generic', custom_bindings=False)]
	
	##~~ BlueprintPlugin API

	#def get_blueprint(self):
	#	global blueprint
	#	return blueprint


__plugin_name__ = "lasersafetynotes"
__plugin_version__ = "0.1"
__plugin_implementation__ = LaserSafetyNotesPlugin()
