import logging
from typing import *

import coloredlogs
import RPi.GPIO as GPIO
import sys
import os
import serial
import subprocess
import time

"""
This class handles the Pn532 NFC module
"""


class Pn532(object):
    ACK = bytes([0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00])
    NACK = bytes([0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00])

    CMD_DIAGNOSE = 0x01
    CMD_GET_FIRMWARE_VERSION = 0x02
    CMD_SET_PARAMETERS = 0x12
    CMD_SAM_CONFIGURATION = 0x14
    CMD_RF_CONFIGURATION = 0x32
    CMD_IN_LIST_PASSIVE_TARGET = 0x4A
    CMD_IN_AUTO_POLL = 0x60

    LOG = logging.getLogger('PN532')

    def __init__(self, serial_port: str = '/dev/serial0', state_callback: callable = None):

        self.serial_port = serial_port
        self.state_callback = state_callback

        self.serial = None
        self.serial = serial.Serial(self.serial_port, 115200)
        self.LOG.info('Pn532 using serial port is: %s: %s', self.serial_port,
                      '[OPENED]' if self.serial.is_open else '[CLOSED]')

        coloredlogs.install(logger=Pn532.LOG,
                            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                            level=logging.DEBUG,
                            stream=sys.stdout)

        self.LOG.setLevel(logging.DEBUG)
        os.environ['LIBNFC_DEVICE'] = 'pn532_uart:/dev/serial0'
        subprocess.run(['nfc-list'])

    def cancel_command(self):
        """
        Cancel any pending operation on the Pn532
        :return:
        """
        self.serial_write(self.ACK)

    def version_check(self):
        fw_version = None
        self.LOG.debug("Get PN532 firmware revision: GetFirmwareVersion")
        if self._write_frame(Pn532.CMD_GET_FIRMWARE_VERSION, prefix='getFirmwareVerion'):

            frame = self._read_frame()

            self.LOG.debug('Firmware version recv frame: %s', self.hex_dump('', frame))
            fw_version = self.parse_firmware_version(frame)

            if fw_version:
                self.LOG.info('Found PN53 version: %d.%d', fw_version['Ver'], fw_version['Rev'])
            else:
                self.LOG.error('Failed to get version from PN532')

        return fw_version

    def check_communication(self):
        pass

    def set_parameters(self, flags: int):
        assert 0x00 <= flags <= 0xFF, "flag is out of range"

        if self._write_frame(self.CMD_SET_PARAMETERS, bytes([flags]), prefix='setParameter'):
            resp = self._read_frame()

    def sam_configuration(self):
        self.LOG.info('>SAMConfiguration')
        if self._write_frame(self.CMD_SAM_CONFIGURATION, bytes([0x01, 0x17, 0x00]), prefix="SAMConfiguration"):
            resp = self._read_frame()
            self.LOG.info('<SAMConfiguration')

    @staticmethod
    def hex_dump(b, sep=' ', prefix=None):
        _str = "{:13}: ".format(prefix) if prefix else ""

        for a in b:
            _str += "%02X%s" % (a, sep)

        Pn532.LOG.debug(_str)
        return _str

    @staticmethod
    def _frame(cmd: int, data: bytes = None) -> bytes:
        frame = bytes([0x00, 0x00, 0xFF, ])

        l = 2 if not data else len(data) + 2
        lcs = (-l) & 0xFF
        frame += bytes([l, lcs, 0xD4, cmd])
        if data:
            frame += data

        s = (0xD4 + cmd + (sum(data) if data else 0)) & 0xFF
        dcs = (-s) & 0xFF
        frame += bytes([dcs, 0x00])

        return frame

    def _write_frame(self, cmd: int, data: bytes = None, prefix=None):
        ack = False
        while not ack:
            self.serial_write(self._frame(cmd, data))
            ack = self._check_ack()

            if ack is None:
                self.LOG.warning("Cmd hasn't been ACKed...resending same cmd")
            else:
                if ack:
                    self.LOG.debug("%s: ACK", prefix)
                else:
                    self.LOG.warning("%s: NACK", prefix)
        return True  # TODO: return False after failling for some time

    def _check_ack(self):
        frame = self.serial_read_ack()
        if frame is None:
            return None

        if frame == Pn532.ACK:
            return True
        else:
            self.LOG.error(self.hex_dump(frame, prefix='NACK frame'))
            return False

    @staticmethod
    def parse_firmware_version(frame):
        if frame and bytes(frame[:6]) == b"\x00\x00\xff\x06\xfa\xd5":
            IC = frame[7]
            ver = frame[8]
            rev = frame[9]
            support = frame[10]
            return {'IC': IC, 'Ver': ver, 'Rev': rev, 'Support': support}
        else:
            Pn532.LOG.critical("Invalid firmware version frame: %s", frame)
            return None

    def parse_card_id(self, frame: bytes) -> Optional[Dict[str, Any]]:
        self.hex_dump(frame, prefix='InAutoPoll response')
        data = frame[7:]
        nb_cards = data[0]

        Pn532.LOG.debug("Nb card: %d", nb_cards)
        if nb_cards == 0:
            return None

        card_type = data[1]
        card_len = data[2]
        card_data = data[3:card_len + 3]
        SENS_RES = card_data[1:3]
        SEL_RES = card_data[3]
        NFCID_len = card_data[4]
        NFCID = card_data[5:5 + NFCID_len]

        if nb_cards != 1:
            Pn532.LOG.warning('Not reading second card info...')

        return {'SENS_RES': SENS_RES, 'SEL_RES': SENS_RES, 'NFCID': NFCID}

    def serial_write(self, frame):
        self.hex_dump(frame, prefix='Write frame')
        self.serial.write(frame)

    def _read_frame(self):
        preamble = self.serial_read()
        startcode = self.serial_read(2)
        lenght = self.serial_read()
        lcs = self.serial_read()
        tfi = self.serial_read()
        data = self.serial_read(int.from_bytes(lenght, byteorder='big') - 1)
        dcs = self.serial_read()
        postamble = self.serial_read()

        self.hex_dump(preamble, prefix='PREAMBLE', )
        self.hex_dump(startcode, prefix='START CODE')
        self.hex_dump(lenght, prefix='LEN')
        self.hex_dump(lcs, prefix='LCS')
        self.hex_dump(tfi, prefix='TFI')
        self.hex_dump(data, prefix='DATA[]')
        self.hex_dump(dcs, prefix='DCS')
        self.hex_dump(postamble, prefix='POSTAMBLE')

        if int.from_bytes(tfi, byteorder='little') == 0x7f:
            self.LOG.error("Syntax error frame!")

        return preamble + startcode + lenght + lcs + tfi + data + dcs + postamble

    def serial_read(self, count: int = 1):
        return self.serial.read(count)

    def serial_read_ack(self):
        self.serial.timeout = 0.030
        f = self.serial_read(6)
        self.serial.timeout = None
        return f

    def start_polling(self):
        Pn532.LOG.debug("Start polling for RFID cards...")

        self.serial_write(
            bytes([0x55, 0x55, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
        time.sleep(2)
        self.cancel_command()
        time.sleep(2)
        self.sam_configuration()

        if self.version_check():
            self.LOG.info('Found a Pn532 RFID/NFC module, starting card polling...')
        else:
            self.LOG.error('No Pn532 RFID/NFC found, exiting NFC/RFID card polling...')
            return

        polling_data = [
            0x64,  # PollNr : Number of polling [0x1-0xFE] or 0xFF for endless polling
            0x01,  # Number of 150ms periods
            0x10  # Type 1
        ]

        in_list_passive_target_data = [0x01, 0x00, ]

        while 1:
            self._write_frame(Pn532.CMD_IN_AUTO_POLL, bytes(polling_data), prefix='InAutoPoll')
            frame = self._read_frame()
            if frame:
                Pn532.LOG.debug(self.hex_dump(frame))
                card = self.parse_card_id(frame)

                if card:
                    self.LOG.info('Card ID: 0x%04x entering field', int.from_bytes(card["NFCID"], byteorder='little'))
                    if self.state_callback:
                        self.state_callback({'card_id': self.hex_dump(card["NFCID"], ''), 'in_field': True})
                    in_field = True
                else:
                    in_field = False

                while in_field:

                    if self._write_frame(self.CMD_RF_CONFIGURATION, bytes([0x05, 0x00, 0x01, 0x02]),
                                         prefix='RfConfiguration'):
                        frame = self._read_frame()
                        self.LOG.debug(self.hex_dump(frame))

                    if self._write_frame(self.CMD_IN_LIST_PASSIVE_TARGET,
                                         bytes(in_list_passive_target_data) + card["NFCID"],
                                         prefix='InListPassive'):

                        frame = self._read_frame()
                        self.LOG.debug(self.hex_dump(frame))

                        in_field_cards_count = frame[7]
                        in_field = in_field_cards_count != 0

                        if not in_field:
                            self.LOG.info('Card ID: 0x%04x leaving field',
                                          int.from_bytes(card["NFCID"], byteorder='little'))
                            if self.state_callback:
                                self.state_callback({'card_id': self.hex_dump(card["NFCID"], ''), 'in_field': False})


if __name__ == '__main__':
    print("Press <Ctrl>+C to exit program...")
    pn532 = Pn532(state_callback=print)

    try:
        v = pn532.version_check()
        # pn532.set_parameters(0x14)
        if v:
            pn532.start_polling()
    except KeyboardInterrupt:
        pass
