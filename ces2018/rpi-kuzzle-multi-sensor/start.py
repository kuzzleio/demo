#!/usr/bin/python3

import argparse
import multiprocessing as mp

import sys
import os

import webserver
import firmware as f
from rpi_get_serial import rpi_get_serial

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Kuzzle IoT - multi sensor demo', prog="kuzzle-iot-demo-multi-device")

    parser.add_argument('--pihost',
                        default='localhost',
                        help='The host pi to witch the pigpio will connect if used in remote')
    parser.add_argument('--version', action='version', version='%(prog)s 1.0')

    cmd_args = parser.parse_args(sys.argv[1:])

    with mp.Manager() as manager:
        config_update_event = manager.Event()
        config_path = os.path.abspath('config.yaml')
        admin_server = mp.Process(target=webserver.start_admin_server, name="admin-server",
                                  args=(config_update_event, {'uid': rpi_get_serial()}, config_path))
        admin_server.start()

        while 1:
            firmware = mp.Process(target=f.startup, name='firmware',
                                  args=({"cmd_line": cmd_args, 'update_evt': config_update_event},))

            firmware.start()
            firmware.join()
