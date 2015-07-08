# coding=utf-8
from __future__ import absolute_import

__author__ = "Gina Häußge <osd@foosel.net>"
__license__ = "GNU Affero General Public License http://www.gnu.org/licenses/agpl.html"
__copyright__ = "Copyright (C) 2014 The OctoPrint Project - Released under terms of the AGPLv3 License"

import logging
import logging.handlers
import os
import flask
import socket

import octoprint.plugin
import octoprint.util
from octoprint.util import dict_merge
import octoprint.settings
from octoprint.server import NO_CONTENT


from .profile import LaserCutterProfileManager, InvalidProfileError, CouldNotOverwriteError

import copy
from octoprint.server.util.flask import restricted_access
from flask import Blueprint, request, jsonify, abort, current_app, session, make_response, url_for

default_settings = {
	"current_profile_id": "_mrbeam_junior"
}
s = octoprint.plugin.plugin_settings("lasercutterprofiles", defaults=default_settings)
static_folder = os.path.join(os.path.dirname(__file__), 'static')
blueprint = flask.Blueprint("plugin.lasercutterprofiles", __name__, static_folder=static_folder)
laserCutterProfileManager = LaserCutterProfileManager(s)

@blueprint.route("/profiles", methods=["GET"])
def laserCutterProfilesList():
	all_profiles = laserCutterProfileManager.get_all()
	return jsonify(dict(profiles=_convert_profiles(all_profiles)))

@blueprint.route("/profiles", methods=["POST"])
@restricted_access
def laserCutterProfilesAdd():
	if not "application/json" in request.headers["Content-Type"]:
		return make_response("Expected content-type JSON", 400)

	try:
		json_data = request.json
	except JSONBadRequest:
		return make_response("Malformed JSON body in request", 400)

	if not "profile" in json_data:
		return make_response("No profile included in request", 400)

	base_profile = laserCutterProfileManager.get_default()
	if "basedOn" in json_data and isinstance(json_data["basedOn"], basestring):
		other_profile = laserCutterProfileManager.get(json_data["basedOn"])
		if other_profile is not None:
			base_profile = other_profile

	if "id" in base_profile:
		del base_profile["id"]
	if "name" in base_profile:
		del base_profile["name"]
	if "default" in base_profile:
		del base_profile["default"]

	new_profile = json_data["profile"]
	make_default = False
	if "default" in new_profile:
		make_default = True
		del new_profile["default"]

	profile = dict_merge(base_profile, new_profile)
	try:
		saved_profile = laserCutterProfileManager.save(profile, allow_overwrite=False, make_default=make_default)
	except InvalidProfileError:
		return make_response("Profile is invalid", 400)
	except CouldNotOverwriteError:
		return make_response("Profile already exists and overwriting was not allowed", 400)
	#except Exception as e:
	#	return make_response("Could not save profile: %s" % e.message, 500)
	else:
		return jsonify(dict(profile=_convert_profile(saved_profile)))

@blueprint.route("/profiles/<string:identifier>", methods=["GET"])
def laserCutterProfilesGet(identifier):
	profile = laserCutterProfileManager.get(identifier)
	if profile is None:
		return make_response("Unknown profile: %s" % identifier, 404)
	else:
		return jsonify(_convert_profile(profile))

@blueprint.route("/profiles/<string:identifier>", methods=["DELETE"])
@restricted_access
def laserCutterProfilesDelete(identifier):
	laserCutterProfileManager.remove(identifier)
	return NO_CONTENT

@blueprint.route("/profiles/<string:identifier>", methods=["PATCH"])
@restricted_access
def laserCutterProfilesUpdate(identifier):
	if not "application/json" in request.headers["Content-Type"]:
		return make_response("Expected content-type JSON", 400)

	try:
		json_data = request.json
	except JSONBadRequest:
		return make_response("Malformed JSON body in request", 400)

	if not "profile" in json_data:
		return make_response("No profile included in request", 400)

	profile = laserCutterProfileManager.get(identifier)
	if profile is None:
		profile = laserCutterProfileManager.get_default()

	new_profile = json_data["profile"]
	new_profile = dict_merge(profile, new_profile)

	make_default = False
	if "default" in new_profile:
		make_default = True
		del new_profile["default"]

	new_profile["id"] = identifier

	try:
		saved_profile = laserCutterProfileManager.save(new_profile, allow_overwrite=True, make_default=make_default)
	except InvalidProfileError:
		return make_response("Profile is invalid", 400)
	except CouldNotOverwriteError:
		return make_response("Profile already exists and overwriting was not allowed", 400)
	#except Exception as e:
	#	return make_response("Could not save profile: %s" % e.message, 500)
	else:
		return jsonify(dict(profile=_convert_profile(saved_profile)))

def _convert_profiles(profiles):
	result = dict()
	for identifier, profile in profiles.items():
		result[identifier] = _convert_profile(profile)
	return result

def _convert_profile(profile):
	default = laserCutterProfileManager.get_default()["id"]
	current = laserCutterProfileManager.get_current_or_default()["id"]

	converted = copy.deepcopy(profile)
	converted["resource"] = url_for(".laserCutterProfilesGet", identifier=profile["id"], _external=True)
	converted["default"] = (profile["id"] == default)
	converted["current"] = (profile["id"] == current)
	return converted




class LaserCutterProfilesPlugin(octoprint.plugin.SettingsPlugin,
				octoprint.plugin.StartupPlugin,
				octoprint.plugin.BlueprintPlugin,
				octoprint.plugin.AssetPlugin,
                 octoprint.plugin.TemplatePlugin):

	global laserCutterProfileManager
	
	def __init__(self):
		pass

	##~~ StartupPlugin API
	def on_startup(self, host, port):
		pass

	##~~ AssetPlugin API
	
	def get_assets(self):
		return dict(
			js=["js/lasercutterprofiles.js"],
			less=[],
			css=[]
		)

	##~~ SettingsPlugin API

	def on_settings_load(self):
		cfg = dict(
			current_profile_id=s.get(["current_profile_id"]),
		)
		return cfg

	def on_settings_save(self, data):
		if "workingAreaWidth" in data and data["workingAreaWidth"]:
			s.set(["workingAreaWidth"], data["workingAreaWidth"])
		if "zAxis" in data:
			zAxis = data["zAxis"] in octoprint.settings.valid_boolean_trues
			s.setBoolean(["zAxis"], zAxis)
		selectedProfile = laserCutterProfileManager.get_current_or_default()
		s.set(["current_profile_id"], selectedProfile['id'])

	##~~ TemplatePlugin API

	def get_template_vars(self):
		d = dict()
		return d

	def get_template_folder(self):
		import os
		return os.path.join(os.path.dirname(os.path.realpath(__file__)), "templates")

	def get_template_configs(self):
		return [dict(type = 'settings', name = "Machine Profiles")]
	
	##~~ BlueprintPlugin API

	def get_blueprint(self):
		global blueprint
		return blueprint

def _sanitize_name(name):
	if name is None:
		return None

	if "/" in name or "\\" in name:
		raise ValueError("name must not contain / or \\")

	import string
	valid_chars = "-_.() {ascii}{digits}".format(ascii=string.ascii_letters, digits=string.digits)
	sanitized_name = ''.join(c for c in name if c in valid_chars)
	sanitized_name = sanitized_name.replace(" ", "_")
	return sanitized_name.lower()

__plugin_name__ = "lasercutterprofiles"
__plugin_version__ = "0.1"
__plugin_implementation__ = LaserCutterProfilesPlugin()
