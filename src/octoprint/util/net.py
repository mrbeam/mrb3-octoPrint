from __future__ import absolute_import, division, print_function, unicode_literals

__license__ = "GNU Affero General Public License http://www.gnu.org/licenses/agpl.html"
__copyright__ = "Copyright (C) 2018 The OctoPrint Project - Released under terms of the AGPLv3 License"

import io
import logging
import os
import socket
import sys

import netaddr
import netifaces
import requests
import werkzeug.http

_cached_check_v6 = None


def check_v6():
    global _cached_check_v6

    def f():
        if not socket.has_ipv6:
            return False

        try:
            socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        except Exception:
            # "[Errno 97] Address family not supported by protocol" or anything else really...
            return False
        return True

    if _cached_check_v6 is None:
        _cached_check_v6 = f()
    return _cached_check_v6


HAS_V6 = check_v6()

if hasattr(socket, "IPPROTO_IPV6") and hasattr(socket, "IPV6_V6ONLY"):
    # Dual stack support, hooray!
    IPPROTO_IPV6 = socket.IPPROTO_IPV6
    IPV6_V6ONLY = socket.IPV6_V6ONLY
else:
    if sys.platform == "win32":
        # Python 2.7 on Windows lacks IPPROTO_IPV6, but supports the socket options just fine, let's redefine it
        IPPROTO_IPV6 = 41
        IPV6_V6ONLY = 27
    else:
        # Whatever we are running on here, we don't want to use V6 on here due to lack of dual stack support
        HAS_V6 = False


def get_lan_ranges(additional_private=None):
    import netaddr
    import netifaces
    import socket

    # 1. Use the clean, version-agnostic list of defaults
    subnets = [
        netaddr.IPNetwork("127.0.0.0/8"),
        netaddr.IPNetwork("10.0.0.0/8"),
        netaddr.IPNetwork("172.16.0.0/12"),
        netaddr.IPNetwork("192.168.0.0/16"),
        netaddr.IPNetwork("169.254.0.0/16"),
        netaddr.IPNetwork("::1/128"),
        netaddr.IPNetwork("fe80::/10"),
        netaddr.IPNetwork("fc00::/7"),
    ]

    if additional_private is None or not isinstance(additional_private, (list, tuple)):
        additional_private = []

    # 2. Add subnets from all local network interfaces
    for interface in netifaces.interfaces():
        try:
            addrs = netifaces.ifaddresses(interface)
            for family in (socket.AF_INET, socket.AF_INET6):
                for address in addrs.get(family, ()):
                    try:
                        addr = strip_interface_tag(address["addr"])
                        mask = address["netmask"]
                        if "/" in mask:
                            _, mask = mask.split("/")
                        subnets.append(netaddr.IPNetwork("{}/{}".format(addr, mask)))
                    except Exception:
                        continue
        except (ValueError, KeyError):
            continue

    # 3. Add user-defined additional private ranges
    for additional in additional_private:
        try:
            subnets.append(netaddr.IPNetwork(additional))
        except Exception:
            continue

    return subnets

def is_lan_address(address, additional_private=None):
    if address is None:
        return True

    import netaddr
    try:
        # Convert input to IPAddress and normalize mapped IPv4 (::ffff:x.x.x.x)
        ip = netaddr.IPAddress(strip_interface_tag(address))
        if ip.is_ipv4_mapped():
            ip = ip.ipv4()
    except Exception:
        return False

    subnets = get_lan_ranges(additional_private=additional_private)
    for subnet in subnets:
        # Crucial: comparing IPAddress object against IPNetwork object
        if ip in subnet:
            return True
    return False

def sanitize_address(address):
    address = unmap_v4_as_v6(address)
    address = strip_interface_tag(address)
    return address


def strip_interface_tag(address):
    if "%" in address:
        # interface comment, e.g. "fe80::457f:bbee:d579:1063%wlan0"
        address = address[: address.find("%")]
    return address


def unmap_v4_as_v6(address):
    if address.lower().startswith("::ffff:") and "." in address:
        # ipv6 mapped ipv4 address, unmap
        address = address[len("::ffff:") :]
    return address


def interface_addresses(family=None, interfaces=None):
    """
    Retrieves all of the host's network interface addresses.
    """

    import netifaces

    if not family:
        family = netifaces.AF_INET

    if interfaces is None:
        interfaces = netifaces.interfaces()

    for interface in interfaces:
        try:
            ifaddresses = netifaces.ifaddresses(interface)
        except Exception:
            continue
        if family in ifaddresses:
            for ifaddress in ifaddresses[family]:
                address = netaddr.IPAddress(ifaddress["addr"])
                if not address.is_link_local() and not address.is_loopback():
                    yield ifaddress["addr"]


def address_for_client(host, port, timeout=3.05, addresses=None, interfaces=None):
    """
    Determines the address of the network interface on this host needed to connect to the indicated client host and port.
    """

    if addresses is None:
        addresses = interface_addresses(interfaces=interfaces)

    for address in addresses:
        try:
            if server_reachable(host, port, timeout=timeout, proto="udp", source=address):
                return address
        except Exception:
            continue


def server_reachable(host, port, timeout=3.05, proto="tcp", source=None):
    """
    Checks if a server is reachable

    Args:
            host (str): host to check against
            port (int): port to check against
            timeout (float): timeout for check
            proto (str): ``tcp`` or ``udp``
            source (str): optional, socket used for check will be bound against this address if provided

    Returns:
            boolean: True if a connection to the server could be opened, False otherwise
    """

    import socket

    if proto not in ("tcp", "udp"):
        raise ValueError("proto must be either 'tcp' or 'udp'")

    try:
        sock = socket.socket(
            socket.AF_INET, socket.SOCK_DGRAM if proto == "udp" else socket.SOCK_STREAM
        )
        sock.settimeout(timeout)
        if source is not None:
            sock.bind((source, 0))
        sock.connect((host, port))
        return True
    except Exception:
        return False


def resolve_host(host):
    import socket

    from octoprint.util import to_unicode

    try:
        return [to_unicode(x[4][0]) for x in socket.getaddrinfo(host, 80)]
    except Exception:
        return []


def download_file(url, folder, max_length=None):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()

        filename = None
        if "Content-Disposition" in r.headers.keys():
            _, options = werkzeug.http.parse_options_header(
                r.headers["Content-Disposition"]
            )
            filename = options.get("filename")
        if filename is None:
            filename = url.split("/")[-1]

        assert len(filename) > 0

        # TODO check content-length against safety limit

        path = os.path.abspath(os.path.join(folder, filename))
        assert path.startswith(folder)

        with io.open(path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return path
