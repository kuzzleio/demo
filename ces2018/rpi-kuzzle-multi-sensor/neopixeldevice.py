import json

import asyncio

import sys

from neopixel import *
import time
from kuzzle.kuzzle import KuzzleIOT
from enum import Enum, unique
import logging
import coloredlogs
import asyncio

# LED strip configuration:
LED_COUNT = 8  # Number of LED pixels.
# LED_PIN        = 18      # GPIO pin connected to the pixels (18 uses PWM!).
LED_PIN = 21  # GPIO pin connected to the pixels (21 uses PCM).
# LED_PIN        = 10      # GPIO pin connected to the pixels (10 uses SPI /dev/spidev0.0).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 0  # DMA channel to use for generating signal (try 5)
LED_BRIGHTNESS = 255  # Set to 0 for darkest and 255 for brightest
LED_INVERT = False  # True to invert the signal (when using NPN transistor level shift)
LED_CHANNEL = 0  # set to '1' for GPIOs 13, 19, 41, 45 or 53
LED_STRIP = ws.WS2811_STRIP_GRB  # Strip type and colour ordering


@unique
class LightMode(Enum):
    SINGLE_COLOR = "single-color"
    COLOR_RAMP = "color-ramp"
    BLINK = "blink"
    CYCLE = "cycle"


class NeopixelDevice(Adafruit_NeoPixel):
    LOG = logging.getLogger('Neopixel')

    def __init__(self, led_count, led_pin, freq_hz=800000, dma_channel=5, invert=False,
                 brightness=255, pwm_channel=0, strip_type=ws.WS2811_STRIP_RGB):
        super().__init__(led_count, led_pin, freq_hz=freq_hz, dma=dma_channel, invert=invert, brightness=brightness,
                         channel=pwm_channel, strip_type=strip_type)

        self.cycle_offset = 0
        coloredlogs.install(logger=NeopixelDevice.LOG,
                            fmt='[%(thread)d] - %(asctime)s - %(name)s - %(levelname)s - %(message)s',
                            level=logging.DEBUG,
                            stream=sys.stdout)

        self.LOG.setLevel(logging.DEBUG)
        self.blink_state = 1

        self.LOG.info("Neopixel inside")

        self.event_loop = asyncio.get_event_loop()
        self.k = None
        self.led_count = led_count
        self.__state = {
            'on': True,
            'mode': LightMode.COLOR_RAMP.value,
            'ramp': [(0, 0, 0) for x in range(0, led_count)]
        }
        self.begin()

    def set_led_color(self, led_index, color):
        if type(color) in (tuple, list, dict):
            self.setPixelColorRGB(led_index, color[0], color[1], color[2])
        elif isinstance(color, int):
            self.setPixelColor(led_index, color)
        elif isinstance(color, str):
            self.setPixelColor(led_index, self.parse_color(color))

    def blink(self):
        if LightMode.BLINK.value not in self.state['mode'] or not self.state['on']:
            return

        self.LOG.debug('>>>BLINK<<<')
        self.blink_state = 0 if self.blink_state else 1

        if 'ramp' in self.state:
            for i, c in enumerate(self.state["ramp"]):
                if self.blink_state:
                    self.set_led_color(i, c)
                else:
                    self.set_led_color(i, 0)

        elif 'color' in self.state:
            for i in range(0, self.led_count+1):
                if self.blink_state:
                    self.set_led_color(i, self.state["color"])
                else:
                    self.set_led_color(i, 0)

        self.show()
        if LightMode.BLINK.value in self.state['mode']:
            self.event_loop.call_later(0.1, self.blink)

    def cycle(self):
        if LightMode.CYCLE.value not in self.state['mode'] or not self.state['on']:
            return

        self.LOG.debug('>>>Cycle<<<')
        self.cycle_offset += 1

        if 'ramp' in self.state:
            print('ramp, cycle_offset ', self.cycle_offset)
            ramp = self.state["ramp"]
            print(ramp)
            l = len(ramp)
            for i in range(0, self.led_count):
                c = ramp[(i + self.cycle_offset) % l]
                self.set_led_color(i, c)

        self.show()
        if LightMode.CYCLE.value in self.state['mode']:
            self.event_loop.call_later(0.1, self.cycle)


    @staticmethod
    def parse_color(color: str) -> int:
        if type(color) == str:
            if str(color).startswith('#'):
                color = color[1:]
            color = int(color, 16)

        return color

    def __apply_state(self):

        self.LOG.debug("Applying new state: %s", json.dumps(self.state, sort_keys=True))
        mode = self.state["mode"]

        if self.state['on']:
            if mode == LightMode.SINGLE_COLOR.value:
                color = self.state["color"]
                for i in range(0, self.led_count + 1):
                    self.set_led_color(i, color)
            elif mode == LightMode.COLOR_RAMP.value:
                ramp = self.state["ramp"]
                l = len(ramp)
                for i in range(0, self.led_count):
                    c = ramp[i % l]
                    self.set_led_color(i, c)
            elif mode == LightMode.BLINK.value:
                self.event_loop.call_later(0.3, self.blink)
            elif mode == LightMode.CYCLE.value:
                self.event_loop.call_later(0.3, self.cycle)

        else:
            for i in range(0, self.led_count + 1):
                self.set_led_color(i, 0)

        self.show()

    @property
    def state(self):
        return self.__state

    @state.setter
    def state(self, state: dict):
        self.__state.update(state)
        self.__apply_state()

    def publish_state(self):
        if self.k:
            self.k.publish_state(self.state)

    async def __on_new_state_task(self, state, is_partial):
        self.LOG.debug("__on_new_state_task")
        self.state = state
        self.publish_state()

    def on_new_state(self, state, is_partial):
        self.LOG.debug("on_new_state")
        self.event_loop.create_task(self.__on_new_state_task(state, is_partial))

    def on_kuzzle_connected(self, k):
        self.k = k
        self.k.publish_state(self.state)
        self.k.subscribe_state(self.on_new_state)


if __name__ == '__main__':
    neo = NeopixelDevice(LED_COUNT, LED_PIN, strip_type=ws.WS2811_STRIP_GRB)

    kuzzle_neo = KuzzleIOT('rgb_light_00000000c9591b74', 'Neopixel_8-linear', "192.168.0.17")

    # @formatter: off
    default_state = {
        "on": True,
        "mode": LightMode.COLOR_RAMP.value,
        "ramp": [
            (255, 0, 0),
            (127, 127, 0),
            (0, 255, 0),
            (0, 127, 127),
            (0, 0, 255),
            (127, 0, 127),
            (255, 127, 0),
            (255, 255, 255),
        ]
    }

    # @formatter:on

    neo.state = default_state

    t = kuzzle_neo.connect(neo.on_kuzzle_connected)
    asyncio.get_event_loop().run_until_complete(asyncio.gather(t))
    print("At this point should be connected")
    asyncio.get_event_loop().run_forever()
