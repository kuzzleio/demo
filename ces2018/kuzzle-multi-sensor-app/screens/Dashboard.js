import React, { Component } from 'react'
import { View, Text, FlatList, Dimensions, StyleSheet, Switch, Vibration, Button, TouchableOpacity, Alert, PushNotificationIOS } from 'react-native'
import { TriangleColorPicker, fromHsv } from 'react-native-color-picker'
import { styles, lightblue, orange, green } from '../styles/styles'
import { store } from '../App'
import Kuzzle from 'kuzzle-sdk/dist/kuzzle.js'
import SLIcon from 'react-native-vector-icons/SimpleLineIcons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
Kuzzle.prototype.bluebird = require('bluebird')


// screen sizing
const { width, height } = Dimensions.get('window')
// orientation must fixed
const SCREEN_WIDTH = width < height ? width : height;

// item size
const PRODUCT_ITEM_HEIGHT = 255;
const PRODUCT_ITEM_OFFSET = 5;
const PRODUCT_ITEM_MARGIN = PRODUCT_ITEM_OFFSET * 2;

const KUZZLE_CONN_STATE = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  ERROR: 2,
  CONNECTED: 3,
}

export default class Dashboard extends Component {
  constructor(props) {
    super(props)
    this.state = {
      kuzzle_conn: KUZZLE_CONN_STATE.DISCONNECTED,
      btn_state: {},
      my_devices: [],
      rfid_tags: null,
      rgb_light: {},
      light_level: undefined,
      light_threshold: 80
    }
    this.deviceKey = 0
    this.kuzzleSettings = store.getState().kuzzleSettings
    this.deviceSettings = store.getState().deviceSettings
  }

  componentDidMount() {
    console.log('Dashboard: componentDidMount...')
    this.unsubscribeStore = store.subscribe(this.onStoreUpdated)
    this.kuzzle_connect(this.kuzzleSettings)
  }

  kuzzle_connect(k) {
    this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.CONNECTING })
    this.kuzzle = Kuzzle(k.hostname, { defaultIndex: 'iot', port: k.port,  }, (err) => {
      if (err) {
        console.log('Kuzzle connection error:', err.toString())
        this.setState({kuzzle_conn: KUZZLE_CONN_STATE.ERROR})
      } else {
        console.log('Connected to Kuzzle')
        this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.CONNECTED })
        this.kuzzle.setDefaultIndex('iot')
        this.device_state_col = this.kuzzle.collection('device-state')
        this.searchUserDevice(store.getState().kuzzleSettings.user)
      }
    })
  }

  onStoreUpdated = () => {
    var k = store.getState().kuzzleSettings
    if (k.hostname !== this.kuzzleSettings.hostname ||
      k.port !== this.kuzzleSettings.port ||
      k.user !== this.kuzzleSettings.user ||
      k.password !== this.kuzzleSettings.password) {
      console.log("kuzzleSettings changed, reconnecting...")
      this.kuzzleSettings = k
      this.kuzzle.disconnect()
      this.setState({ kuzzle_conn: KUZZLE_CONN_STATE.DISCONNECTED })
      this.setState({ my_devices: [] })
      this.kuzzle_connect(k)

    }

    this.deviceSettings = store.getState().deviceSettings
  
  }

  componentWillUnmount() {
    console.log('Dashboard: componentWillUnmount...')
    this.unsubscribeStore()
    this.kuzzle.disconnect()
  }

  static navigationOptions = ({ navigation }) => {
    let headerRight = (
      <TouchableOpacity style={{ padding: 10 }} onPress={() => { navigation.navigate('Settings') }}>
        <SLIcon name="settings" size={28} color={'rgb(14,122,254)'} />
      </TouchableOpacity>
    )
    return { headerRight };
  }

  searchUserDevice(user) {
    console.log('Searching for "', user, '" devices...')
    var device_info_col = this.kuzzle.collection('device-info')
    device_info_col.search({
      query: {
        bool: {
          must: [
            {
              term: { owner: user }
            }
          ]
        }
      }
    }, { size: 100 }, (err, res) => {
      if (err) {
        console.log(err)
      }
      else {
        res.getDocuments().forEach(e => {
          var d = e.content
          switch (d.device_type) {
            case 'button':
              this.addDevice('Buttons', d.device_id)
              this.subscribe_to_buttons(d.device_id)
              break
            case 'RFID_reader':
              this.addDevice('RFID', d.device_id)
              this.subscribe_to_rfid(d.device_id)
              break
            case 'motion-sensor':
              this.addDevice('Motion', d.device_id)
              this.subscribe_to_motion_sensor(d.device_id)
              break
            case 'light_sensor':
              this.addDevice('Luminosity', d.device_id)
              this.subscribe_to_light_level_sensor(d.device_id)
              break
            case 'neopixel-linear':
              this.addDevice('Color ramp', d.device_id)
              this.subscribe_to_rgb_light(d.device_id)
              break
            default:
              console.log('Unhandled device type: ', d.device_type)
              break
          }

        })
      }
    })
  }

  addDevice(title, device_id) {
    console.log('addDevice: ')
    this.deviceKey++
    this.setState((prevState) => { return { my_devices: [...prevState.my_devices, { key: this.deviceKey, title, device_id }] } })
    console.log('my_devices: ', this.state.my_devices)
  }

  rgb_light_switch(on, device_id) {
    this.rgb_light_publish_state({ on }, device_id)
  }

  rgb_light_set_color(color, device_id) {
    this.rgb_light_publish_state({
      mode: "single-color",
      color,
      on: true
    }, device_id)
  }

  rgb_light_publish_state(state, device_id) {
    var device_state = {
      partial_state: true,
      device_id,
      device_type:'neopixel-linear',
      state
    }
    console.log('RGB light partial state : ', device_state)

    this.kuzzle.collection('device-state')
      .createDocument(device_state, (err, res) => {
        if (err)
          console.log(err)
        else
          console.log('Document published')

        console.log(res);
      })
  }



  /*
   * Buttons
   */

  getButtonPressed() {
    if (this.state.btn_state && this.state.btn_state.button_0==='PRESSED') return 'Button 1'
    if (this.state.btn_state && this.state.btn_state.button_1==='PRESSED') return 'Button 2'
    if (this.state.btn_state && this.state.btn_state.button_2==='PRESSED') return 'Button 3'
    if (this.state.btn_state && this.state.btn_state.button_3==='PRESSED') return 'Button 4'
    return 'none';
  }

  getButtonIconStyle() {
    return [
      (this.getButtonPressed()!='none') && dashboard_styles.deviceIconOn
    ]
  }

  render_buttons(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <SLIcon name="grid" size={30} color="#000000" style={[dashboard_styles.device_icon,this.getButtonIconStyle()]}/>
        <View>
          <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
          <Text style={dashboard_styles.deviceValueText}>{this.getButtonPressed()}</Text>
        </View>
      </View>
    )
  }

  /*
   * Motion
   */

  render_motion(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <SLIcon name="energy" size={30} color="#000000" style={[dashboard_styles.device_icon,(this.state.motion_state && this.state.motion_state.motion) && dashboard_styles.deviceIconOn]}/>
        <View>
          <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
          <Text style={dashboard_styles.deviceValueText}>{(this.state.motion_state && this.state.motion_state.motion)?'Yes':'No'}</Text>
        </View>
      </View>
    )
  }


  /*
   * NFC/RFID
   */

  getNFCIconStyle() {
    if (this.state.rfid_tags) {
      switch (this.state.rfid_tags) {
        case this.deviceSettings.rfidValidCard:
          return dashboard_styles.deviceIconOn;
        break;
        default:
          return dashboard_styles.deviceIconRed;
      }
    }
    return dashboard_styles.deviceIconOff;
  }


  render_nfc(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
        <SLIcon name="shield" size={30} color="#000000" style={[dashboard_styles.device_icon,this.getNFCIconStyle()]}/>
        <View>
          <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
          <Text style={dashboard_styles.deviceValueText}>{this.state.rfid_tags?this.state.rfid_tags:'none'}</Text>
        </View>
      </View>
    )
  }


  /*
   * Light Level
   */

  render_light_level(item) {
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
      <FAIcon name="sun-o" size={30} color="#000000" style={[dashboard_styles.device_icon, this.state.light_level && this.state.light_level.level > parseInt(this.deviceSettings.luminosityThreshold) && dashboard_styles.deviceIconYellow]}/>
      <View>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <Text style={dashboard_styles.deviceValueText}>
          {this.state.light_level &&  this.state.light_level.level ? parseInt(this.state.light_level.level) + ' Lux' : 'NA'}
        </Text>
      </View>
      </View>
    )
  }


  /*
   * NEOPIXEL
   */

  neoPixelLightSwitch(device_id) {

    this.rgb_light_publish_state({
      on: !this.state.rgb_light.on
    }, device_id)

  }


  render_rgb_light(item) {
    var rgb_light = this.state.rgb_light
    return (
      <View style={[styles.framed, dashboard_styles.device]}>
      <TouchableOpacity onPress={() => {this.neoPixelLightSwitch(item.device_id)}}>
        <SLIcon name="bulb" size={30} color="#000000" style={[dashboard_styles.device_icon,this.state.rgb_light.on && dashboard_styles.deviceIconYellow]}/>
      </TouchableOpacity>
      <View>
        <Text style={[styles.card_header, dashboard_styles.headers]}>{item.title}</Text>
        <TriangleColorPicker style={{ flex: 1, width: 150,height: 150 }}
            onColorChange={color => this.rgb_light_set_color(fromHsv(color), item.device_id)} />
      </View>
    </View>
    )
  }


  /*
   * Global render
   */  

  render() {
    switch (this.state.kuzzle_conn) {
      case KUZZLE_CONN_STATE.CONNECTED:
        return (
          <View >
            <FlatList 
              data={this.state.my_devices}
              extraData={this.state}
              renderItem={
                ({ item }) => {
                  if (item.device_id.startsWith('buttons_'))
                    return this.render_buttons(item)
                  else if (item.device_id.startsWith('motion_'))
                    return this.render_motion(item)
                  else if (item.device_id.startsWith('rgb_light_'))
                    return this.render_rgb_light(item)
                  else if (item.device_id.startsWith('light_lvl_'))
                    return this.render_light_level(item)
                  else if (item.device_id.startsWith('NFC_'))
                    return this.render_nfc(item)
                }
              }
            />
          </View>
        )
      case KUZZLE_CONN_STATE.CONNECTING:
        return (
          <View style={styles.container}>
            <View style={styles.framed}>
              {/* <View style={[dashboard_styles.button, dashboard_styles.button_pressed]}> */}
              <Text style={dashboard_styles.info}>Connecting to Kuzzle...</Text>
              {/* </View> */}
            </View>
          </View>
        )
      case KUZZLE_CONN_STATE.DISCONNECTED:
      case KUZZLE_CONN_STATE.ERROR:
        return (
          <View style={styles.container}>
            <View style={styles.framed}>
              {/* <View style={[dashboard_styles.button, dashboard_styles.button_pressed]}> */}
              <Text style={dashboard_styles.info}>Disconnected from Kuzzle...</Text>
              {/* </View> */}
            </View>
          </View>
        )
    }
  }

  subscribe_to_buttons(device_id) {
    console.log('Subscribing to button events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ btn_state: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to button events')
      })
  }

  subscribe_to_motion_sensor(device_id) {
    console.log('Subscribing to motion sensor events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ motion_state: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to motion sensor events')
      })
  }

  subscribe_to_light_level_sensor(device_id) {
    console.log('Subscribing to light level sensor events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({ light_level: state })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to light level sensor events')
      })
  }

  subscribe_to_rfid(device_id) {
    console.log('Subscribing to RFID card events')
    this.device_state_col
      .subscribe({
        equals: {
          device_id
        }
      }, {
        subscribeToSelf: false
      }, (err, res) => {
        var state = res.document.content.state
        this.setState({rfid_tags:state.card_id});
        if (state.card_id && state.in_field) PushNotificationIOS.scheduleLocalNotification({fireDate:new Date().toISOString(),alertBody:"Someone with card "+state.card_id+" tried to enter",alertTitle:"Front door"});
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to RFID card events');
      })
  }

  subscribe_to_rgb_light(device_id) {
    console.log('Subscribing to RGB light events')
    this.device_state_col
      .subscribe({
        and: [
          {
            equals: {
              device_id
            }
          }
        ]
      }, {
        subscribeToSelf: true
      }, (err, res) => {
        var state = res.document.content.state
        //if on value is not set, then keep the previous information
        if (state.on == null) state.on = (this.state.rgb_light)?this.state.rgb_light.on:false;
        this.setState({ rgb_light: state }, () => {
        })
      })
      .onDone(() => {
        console.log('[DONE] Subscribing to RFID card events');
      })
  }

}
const dashboard_styles = StyleSheet.create({
  headers: {
    fontFamily: 'Verdana',
    fontWeight: 'bold',
    marginBottom: 15,
    fontSize: 16,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  device: {
    flex:1,
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  button: {
    padding: 5,
    justifyContent: 'center',
    margin: 4,
    width: 200,
    borderRadius: 5,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  button_released: {
    backgroundColor: '#433',
  },
  button_pressed: {
    backgroundColor: orange,
  },
  light_level: {
    fontSize: 30,
    fontWeight: 'bold',
    color: lightblue
  },
  info: {
    fontSize: 25,
    color: lightblue

  },
  button_text: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 20
  },
  device_icon: {
    width:50,
    height:50,
    paddingVertical:10,
    backgroundColor: "#a4b7c1",
    textAlign:'center',
    marginRight:4
  },
  deviceIconOn: {
    backgroundColor: 'green'
  },
  deviceIconOff: {

  },
  deviceIconRed: {
    backgroundColor: 'red'
  },
  deviceIconYellow: {
    backgroundColor: 'yellow'
  },
  deviceValueText: {
    fontSize:20
  }

})
