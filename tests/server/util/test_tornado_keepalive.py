"""Regression coverage for WSGI fallback requests on persistent connections."""

from tornado.tcpclient import TCPClient
from tornado.testing import AsyncHTTPTestCase, gen_test
from tornado.web import Application

from octoprint.server.util.tornado import (
    CustomHTTPServer,
    UploadStorageFallbackHandler,
    WsgiInputContainer,
)


class FallbackKeepAliveTest(AsyncHTTPTestCase):
    def get_app(self):
        def application(environ, start_response):
            start_response("200 OK", [("Content-Type", "text/plain")])
            return [b"ok"]

        return Application(
            [
                (
                    r"/.*",
                    UploadStorageFallbackHandler,
                    {"fallback": WsgiInputContainer(application)},
                ),
            ]
        )

    def get_http_server(self):
        return CustomHTTPServer(self._app)

    @gen_test
    async def test_bodyless_requests_keep_connection_open(self):
        client = TCPClient()
        stream = await client.connect("127.0.0.1", self.get_http_port())
        try:
            for method in ("GET", "GET", "OPTIONS", "DELETE", "GET"):
                await stream.write(
                    (method + " / HTTP/1.1\r\nHost: localhost\r\n\r\n").encode("ascii")
                )
                headers = await stream.read_until(b"\r\n\r\n")
                self.assertTrue(headers.startswith(b"HTTP/1.1 200 OK\r\n"))
                self.assertEqual(await stream.read_bytes(2), b"ok")
        finally:
            stream.close()
            client.close()
