import React, { Component } from 'react'
import { View, Text, Alert, Button, TouchableOpacity } from 'react-native'
import LoginCmp from '../components/Login'
import { styles } from '../styles/styles'
import {store} from '../App'
import {setUserCredentials} from '../store/actions'
import SLIcon from 'react-native-vector-icons/SimpleLineIcons';

export default class Login extends Component {
  constructor(props) {
    super(props)
  }

  static navigationOptions = ({ navigation }) => {
    let headerRight = (
      <TouchableOpacity style={{ padding: 10 }} onPress={() => { navigation.navigate('Settings') }}>
        <SLIcon name="settings" size={28} color={'rgb(14,122,254)'} />
      </TouchableOpacity>
    )
    return { headerRight };
  }


  onLogin(credentials) {
    {
      console.log('onLogin:', credentials)
      store.dispatch(setUserCredentials(credentials.userName, credentials.password))
      this.props.navigation.navigate('Dashboard')
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <LoginCmp
          userName={store.getState().kuzzleSettings.user ? store.getState().kuzzleSettings.user:""}
          password={store.getState().kuzzleSettings.password  ? store.getState().kuzzleSettings.password : ""}
          onLogin={(credentials) => this.onLogin(credentials)}
          onSignup={() => { Alert.alert('Signup') }}
        />
      </View>
    )
  }
}