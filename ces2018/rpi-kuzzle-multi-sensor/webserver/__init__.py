from http.server import *
from http import HTTPStatus
import urllib.parse as uparse
import airspeed
from ruamel.yaml import YAML
import os
import subprocess
import json
import dbus

config_path = None
config = None


class AdminHTTPRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def do_POST(self):
        if self.path == '/setup':
            content_length = int(self.headers['Content-Length'])
            c = self.rfile.read(content_length)
            args = uparse.parse_qsl(c)
            args = dict([(x[0].decode('utf-8'), x[1].decode('utf-8')) for x in args])
            apply_config(args)

            self.send_response(301)
            self.send_header("Location", "http://" + self.headers["Host"] + '/admin')
            self.end_headers()

    def do_GET(self):
        if self.path == "/admin":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/html")

            admin_template = load_admin_template()
            body = admin_template.merge({'config': config, 'device': {'uid': 'an_uid'}})

            self.send_header("Content-length", len(body))
            self.end_headers()

            self.wfile.write(bytes(body, 'utf-8'))

        elif self.path == "/":
            self.send_response(301)
            self.send_header("Location", "http://" + self.headers["Host"] + '/dashboard')
            self.end_headers()

        elif self.path == "/dashboard":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/html")

            dashboard_template = load_dashboard_template()
            body = dashboard_template.merge({'config': json.dumps(config), 'device': device})

            self.send_header("Content-length", len(body))
            self.end_headers()

            self.wfile.write(bytes(body, 'utf-8'))
        elif self.path == "/logs":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/plain")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()

            with subprocess.Popen(
                    ['journalctl', '-u', 'kuzzle-sensor-firmware', '-f', '-n', '100'],
                    stdout=subprocess.PIPE,
                    universal_newlines=True
            ) as p:

                try:
                    l = p.stdout.readline()
                    while l:
                        nbchar = '%X' % len(l)
                        self.wfile.write(bytes(nbchar + '\r\n', 'utf-8'))
                        self.wfile.write(bytes(l + '\r\n', 'utf-8'))
                        l = p.stdout.readline()

                    self.wfile.write(bytes('0\r\n', 'utf-8'))
                    self.wfile.write(bytes('\r\n', 'utf-8'))
                except BrokenPipeError as e:
                    print('connection closed by client...')
        elif self.path == "/reboot":
            content = bytes('<html><body><H1>Device rebooting...</H1></HTML></BODY>', 'utf-8')
            l = len(content)
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-type", "text/html")
            self.send_header("Content-length", "{}".format(l))
            self.end_headers()
            self.wfile.write(content)

            subprocess.Popen(['reboot'], stdout=subprocess.PIPE, universal_newlines=True)
        else:
            super().do_GET()


yaml = YAML()
config_update_event = None
server_address = ('', 80)
AdminHTTPRequestHandler.protocol_version = 'HTTP/1.1'
httpd = HTTPServer(server_address, AdminHTTPRequestHandler)


def restart_firmware():
    sysbus = dbus.SystemBus()
    systemd1 = sysbus.get_object('org.freedesktop.systemd1', '/org/freedesktop/systemd1')
    manager = dbus.Interface(systemd1, 'org.freedesktop.systemd1.Manager')
    job = manager.RestartUnit('kuzzle-sensor-firmware.service', 'fail')


def apply_config(args):
    if 'kport' in args.keys():
        config['kuzzle']['port'] = args['kport']
    if 'khost' in args.keys():
        config['kuzzle']['host'] = args['khost']

    with open(config_path, mode='w') as f:
        yaml.dump(config, f)

    restart_firmware()


def start_admin_server(device_info, config_path):
    global device

    globals()['config_path'] = config_path
    globals()['config'] = load_config()
    device = device_info

    server_path = os.path.dirname(__file__)
    os.chdir(server_path)
    httpd.serve_forever()


def shutdown_admin_server():
    httpd.shutdown()


def load_admin_template():
    with open('admin.html.vm') as f:
        content = f.read()
    return airspeed.Template(content)


def load_dashboard_template():
    with open('dashboard.html.vm') as f:
        content = f.read()
    return airspeed.Template(content)


def load_config():
    with open(config_path) as f:
        config_str = f.read()
    return yaml.load(config_str)
