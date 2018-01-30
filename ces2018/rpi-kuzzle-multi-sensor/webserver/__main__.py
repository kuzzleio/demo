import utils
from . import *

if __name__ == '__main__':
    config_path = os.path.abspath('config.yaml')
    start_admin_server({'uid': utils.rpi_get_serial()}, config_path)
