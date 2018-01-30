import spidev

"""
MCP3208 is as 12bits ADC from Microchip
Datasheet can be found here: http://ww1.microchip.com/downloads/en/DeviceDoc/21298c.pdf
"""


class MCP3208(object):
    SINGLE = 1
    DIFF = 0

    def __init__(self, v_ref=3.3, bus=0, device=0):
        self.bus = bus
        self.device = device
        self.spi = spidev.SpiDev()
        self.spi.open(self.bus, self.device)
        self.spi.mode = 0
        self.spi.max_speed_hz = 1000000
        self.spi.lsbfirst = False
        self.v_ref = v_ref

    def read_channel(self, mode: int, channel: int):
        assert 0 <= channel <= 7, "Channel must be 0 <= channel <= 7"
        assert mode in [MCP3208.SINGLE, MCP3208.DIFF], 'Mode must be one of Mcp3208.SINGLE or Mcp3208.DIFF'

        cmd = 0b100000 | mode << 4  # start bit + mode bit + one 0 bit for pad to make reply from Mcp3208 byte aligned
        cmd |= channel << 1

        resp = self.spi.xfer2([cmd, 0x00, 0x00])

        raw_measure = (resp[1] << 8) + resp[2]
        raw_measure = raw_measure >> 3
        voltage = float(raw_measure) / float(4096) * self.v_ref

        return voltage

    def __del__(self):
        self.spi.close()


if __name__ == '__main__':
    mcp3208 = MCP3208(5.2, device=0)
    print("With Vref = 5.2v")
    print("+---------+-------------+")
    print("| channel | Voltage (V) |")
    print("+---------+-------------+")
    for c in range(0, 8):
        print("| {:7} | {:11.3f} |".format(c, mcp3208.read_channel(MCP3208.SINGLE, c)))
        print("+---------+-------------+")
