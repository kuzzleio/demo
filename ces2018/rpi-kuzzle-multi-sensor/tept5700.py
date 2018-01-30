import mcp3208

"""
This class handles the TEPT5700 ambient light sensor
"""


class Tept5700(object):
    # affine line parameters in log plan when Vce = 5v
    m = 1.0
    k = 1.3333333333333333

    def __init__(self, v_ce, rl):
        """

        :param v_ce: Tept57000 alimentation tension
        :param Rl: Load resistor
        """
        self.mcp3208 = mcp3208.MCP3208(5.2, 0, 0)
        self.v_ce = v_ce
        self.rl = rl

    def read_lux(self):
        voltage = self.mcp3208.read_channel(mcp3208.MCP3208.SINGLE, 7)
        i_ua = voltage / self.rl * 1000000.0
        lux = self.k * pow(i_ua, self.m)

        return voltage, lux


if __name__ == '__main__':
    import time
    tept = Tept5700(5.2, 10000)

    try:
        while 1:
            voltage, lux = tept.read_lux()
            print('{:7.03f}v => {:7.03f}lux'.format(voltage, lux))
            time.sleep(0.100)
    except KeyboardInterrupt as e:
        pass
