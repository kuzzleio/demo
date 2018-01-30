import os
import logging
import coloredlogs

log = logging.Logger('RPi')
coloredlogs.install(level=logging.DEBUG, logger=log)


def rpi_get_serial():
    if os.uname()[4] == 'armv7l':
        log.debug('Running on a RPi: Using CPU serial')
        with open('/proc/cpuinfo') as f:
            l = ""
            while not l.startswith('Serial'):
                l = f.readline()

            return l.split(":")[1][1:-1]
    else:
        log.debug('Not running on a RPi: Using alternative serial: %s', "0012345678")
        return "0012345678"
