# coding=utf-8
from __future__ import absolute_import, division, print_function

__license__ = 'GNU Affero General Public License http://www.gnu.org/licenses/agpl.html'
__copyright__ = "Copyright (C) 2017 The OctoPrint Project - Released under terms of the AGPLv3 License"

import requests
import logging
import base64
<<<<<<< HEAD

from ..exceptions import ConfigurationInvalid
=======
>>>>>>> 77753ca02602d3a798d6b0a22535e6fd69ff448a

BRANCH_HEAD_URL = "https://api.bitbucket.org/2.0/repositories/{user}/{repo}/commit/{branch}"

logger = logging.getLogger("octoprint.plugins.softwareupdate.version_checks.bitbucket_commit")


def _get_latest_commit(user, repo, branch, api_user=None, api_password=None):
<<<<<<< HEAD
	url = BRANCH_HEAD_URL.format(user=user, repo=repo, branch=branch)
	headers = {}
	if api_user is not None and api_password is not None:
		headers['authorization'] = 'Basic {}'.format(
			base64.b64encode(b"{user}:{pw}".format(user=api_user, pw=api_password)))
	r = requests.get(url, headers=headers)
=======
	from ..exceptions import NetworkError

	url = BRANCH_HEAD_URL.format(user=user, repo=repo, branch=branch)
	headers = {}
	if api_user is not None and api_password is not None:
		auth_value = base64.b64encode(b"{user}:{pw}".format(user=api_user, pw=api_password))
		headers["authorization"] = "Basic {}".format(auth_value)

	try:
		r = requests.get(url, headers=headers, timeout=(3.05, 30))
	except requests.ConnectionError as exc:
		raise NetworkError(cause=exc)
>>>>>>> 77753ca02602d3a798d6b0a22535e6fd69ff448a

	if not r.status_code == requests.codes.ok:
		return None

	reference = r.json()
	if not "hash" in reference:
		return None

	return reference["hash"]


def get_latest(target, check, online=True):
	from ..exceptions import ConfigurationInvalid

	if "user" not in check or "repo" not in check:
		raise ConfigurationInvalid("Update configuration for %s of type bitbucket_commit needs all of user and repo" % target)

	branch = "master"
	if "branch" in check and check["branch"] is not None:
		branch = check["branch"]

<<<<<<< HEAD
	api_user = check["api_user"] if 'api_user' in check else None
	api_password = check["api_password"] if 'api_password' in check else None

	current = None
	if "current" in check:
		current = check["current"]

	remote_commit = _get_latest_commit(check["user"], check["repo"], branch, api_user, api_password)
=======
	api_user = check.get("api_user")
	api_password = check.get("api_password")

	current = check.get("current")
>>>>>>> 77753ca02602d3a798d6b0a22535e6fd69ff448a

	information = dict(
		local=dict(name="Commit {commit}".format(commit=current if current is not None else "unknown"), value=current),
		remote=dict(name="?", value="?"),
		needs_online=not check.get("offline", False)
	)
	if not online and information["needs_online"]:
		return information, True

	remote_commit = _get_latest_commit(check["user"], check["repo"], branch, api_user, api_password)
	remote_name = "Commit {commit}".format(commit=remote_commit) if remote_commit is not None else "-"

	information["remote"] = dict(name=remote_name, value=remote_commit)
	is_current = (current is not None and current == remote_commit) or remote_commit is None

	logger.debug("Target: %s, local: %s, remote: %s" % (target, current, remote_commit))

	return information, is_current

