import React from 'react'
import { AppStack } from './config/router'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { Text, View } from 'react-native'
import reducers from './store/reducers'
import { setKuzzleSettings, setUserCredentials } from './store/actions'
import { AsyncStorage } from 'react-native'



export var store;


export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      settingsLoaded: false
    }
  }

  /*
    componentDidMount()
  */
  componentDidMount() {
    console.log("component did mount, youhou!!!");
    this.loadSettings()

  }

  loadSettings = async () => {
    var user, password, host, port, luminosityThreshold, rfidValidCard
    try {
      user = await AsyncStorage.getItem("kuzzle-user")
      if (!user) user = 'demo1'
    }
    catch (error) {
      //
    }

    try {
      password = await AsyncStorage.getItem("kuzzle-password")
      if (!password)  password = undefined
    }
    catch (error) {
      //
    }

    try {
      hostname = await AsyncStorage.getItem("kuzzle-hostname")
      if (!hostname) hostname = 'localhost';
    }
    catch (error) {
      
    }

    try {
      port = await AsyncStorage.getItem("kuzzle-port")
      if (!port) port = 7512
    }
    catch (error) {
      //
    }

    try {
      luminosityThreshold = await AsyncStorage.getItem("luminosityThreshold")
      if (!luminosityThreshold) luminosityThreshold = 80
    }
    catch (error) {
      //
    }

    try {
      rfidValidCard = await AsyncStorage.getItem("rfidValidCard")
      if (!rfidValidCard) rfidValidCard = '9549B990'
    }
    catch (error) {
      //
      
    }

    kuzzleSettings = {
      hostname,
      port,
      user,
      port
    }

    deviceSettings = {
      rfidValidCard,
      luminosityThreshold
    }

    console.log('Got settings: ', kuzzleSettings, deviceSettings);

    console.log("Creating redux store...");
    store = createStore(
      reducers,
      {
        kuzzleSettings,
        deviceSettings
      })
    this.subscribeStore()
    this.setState({ settingsLoaded: true })
  }


  subscribeStore = () => {

    store.subscribe(async function () {
      console.log('store updated: ', store.getState().kuzzleSettings)
      kuzzleSettings = store.getState().kuzzleSettings
      deviceSettings = store.getState().deviceSettings
      var settings = []

      if (kuzzleSettings.hostname) {
        settings.push(["kuzzle-hostname", kuzzleSettings.hostname])
      }
      if (kuzzleSettings.port) {
        settings.push(["kuzzle-port", kuzzleSettings.port.toString()])
      }
      if (kuzzleSettings.user) {
        settings.push(["kuzzle-user", kuzzleSettings.user])
      }
      if (kuzzleSettings.password) {
        settings.push(["kuzzle-password", kuzzleSettings.password])
      }
      if (deviceSettings.luminosityThreshold) {
        settings.push(["luminosityThreshold", deviceSettings.luminosityThreshold.toString()])
      }
      if (deviceSettings.rfidValidCard) {
        settings.push(["rfidValidCard", deviceSettings.rfidValidCard])
      }


      try {
        console.log(settings)
        await AsyncStorage.multiSet(
          settings
        ).then(() => console.log('settings saved'))
      }
      catch (e) {
        console.log("Error saving settings: ", e);
        // console.log(e.stack)
      }
    })
  }

  render() {
    return this.state.settingsLoaded ? (
      <Provider store={store}>
        <AppStack />
      </Provider>
    ) : (<View style={{flex:1}}><Text>Loading...</Text></View>)
  }
}



