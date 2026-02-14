#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
from setuptools import setup, find_packages
import versioneer

# Ensure src is in path for octoprint_setuptools
sys.path.insert(0, os.path.join(os.path.dirname(os.path.realpath(__file__)), "src"))
import octoprint_setuptools

# Runtime baseline for this fork
PYTHON_REQUIRES = ">=3.10,<4"

# Requirements for setup.py
SETUP_REQUIRES = ["markdown>=3.7,<4"]

# Modernized requirements for Python 3.10+
# Pinned to versions compatible with Python 3.13 (removes 'imp' and 'pathtools' dependencies)
INSTALL_REQUIRES = [
    "OctoPrint-FileCheck>=2021.2.23",
    "OctoPrint-FirmwareCheck>=2021.10.11",
    "OctoPrint-PiSupport>=2021.10.28",

    "markupsafe>=2.1.5,<3",
    "markdown>=3.7,<4",
    "wrapt>=1.17.2,<1.18",

    "flask>=2.2.5,<2.3",     # Downgraded from 3.0.3
    "werkzeug>=2.3.8,<3.0",  # Downgraded to match Flask 2.2
    "Jinja2>=3.1.2,<4",
    "itsdangerous>=2.1.2,<3",

    "Flask-Login>=0.6.3,<0.7",
    "Flask-Babel>=4.0.0,<5",
    "Flask-Assets>=2.1.0,<3",
    "cachelib>=0.13.0,<0.14",

    "tornado>=6.2,<7",       # Missing: Required for the web server
    "future>=1.0.0,<2",      # Missing: Required for legacy Py3 compatibility imports
    "frozendict>=2.4.4,<3",  # Missing: Required by internal logic

    "feedparser>=6.0.10,<7",
    "unidecode>=1.3.8,<2",
    "regex>=2024.5.15", # Helps resolve those SyntaxWarnings in the vendor folder

    "PyYAML>=6.0.1,<7",
    "pyserial>=3.5,<4",
    "netaddr>=1.3.0,<1.4",
    "watchdog>=4.0.2,<5",     # Fixes the Python 3.12/3.13 'imp' crash
    "sarge==0.1.7.post1",
    "netifaces>=0.11,<1",
    "pylru>=1.2,<2",
    "pkginfo>=1.12,<2",
    "requests>=2.32.0,<3",
    "semantic_version>=2.10,<3",
    "psutil>=6.1.1,<7",
    "Click>=8.1.8,<8.3",
    "websocket-client>=1.8,<1.9",
    "emoji>=2.14.1,<3",
    "sentry-sdk>=2.20.0,<3",
    "filetype>=1.2.0,<2",
    "zipstream-new>=1.1.8,<1.2",
    "blinker>=1.9,<2",
    "zeroconf>=0.132.0,<1",
]

# Development & Test dependencies
EXTRA_REQUIRES = {
    "develop": [
        "pytest>=7.4.4,<8",
        "pytest-doctest-custom>=1.0.0,<2",
        "mock>=5.1.0,<6",
        "ddt>=1.7.1,<2",
        "pre-commit>=3.5.0,<5",
        "nodeenv>=1.9.1,<2",
    ],
    "docs": [
        "sphinx>=7.2.6,<8",
        "sphinx-rtd-theme>=2.0.0,<3",
        "sphinxcontrib-httpdomain>=1.8.1,<2",
        "sphinx-autodoc-typehints>=1.25.2,<2",
    ],
}

def params():
    name = "OctoPrint"
    version = versioneer.get_version()
    cmdclass = versioneer.get_cmdclass()

    description = "The snappy web interface for your 3D printer (Mr Beam Fork)"
    long_description = "OctoPrint provides a responsive web interface for controlling 3D printers and Laser Cutters."

    classifiers = [
        "Development Status :: 5 - Production/Stable",
        "Environment :: Web Environment",
        "Framework :: Flask",
        "Intended Audience :: Education",
        "Intended Audience :: Manufacturing",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: GNU Affero General Public License v3",
        "Natural Language :: English",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Programming Language :: Python :: Implementation :: CPython",
        "Topic :: Printing",
    ]

    author = "Gina Häußge / Mr Beam"
    author_email = "support@mr-beam.org"
    url = "https://github.com/mrbeam/mrb3-octoPrint"
    license = "GNU Affero General Public License v3"

    packages = find_packages(where="src")
    package_dir = {"": "src"}

    package_data = {
        "octoprint": octoprint_setuptools.package_data_dirs(
            "src/octoprint", ["static", "templates", "plugins", "translations"]
        ) + ["util/piptestballoon/setup.py"]
    }

    return dict(
        name=name,
        version=version,
        cmdclass=cmdclass,
        python_requires=PYTHON_REQUIRES,
        setup_requires=SETUP_REQUIRES,
        install_requires=INSTALL_REQUIRES,
        extras_require=EXTRA_REQUIRES,
        description=description,
        long_description=long_description,
        classifiers=classifiers,
        author=author,
        author_email=author_email,
        url=url,
        license=license,
        packages=packages,
        package_dir=package_dir,
        package_data=package_data,
        include_package_data=True,
        zip_safe=False,
        entry_points={
            "console_scripts": [
                "octoprint = octoprint:main",
            ],
        },
    )

if __name__ == "__main__":
    setup(**params())
