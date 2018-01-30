import React, { Component } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { styles, orange } from '../styles/styles'
import { connect } from 'react-redux'
import { setKuzzleSettings, setDeviceSettings } from '../store/actions'
import PropTypes from 'prop-types'
import { store } from '../App'
import { Header } from 'react-navigation'


class Settings extends Component {
  constructor(props) {
    super(props)

    let kuzzleSettings = store.getState().kuzzleSettings;
    let deviceSettings = store.getState().deviceSettings;

    this.state = {
      hostname: (kuzzleSettings && kuzzleSettings.hostname)?kuzzleSettings.hostname:'localhost',
      port: (kuzzleSettings && kuzzleSettings.port)?kuzzleSettings.port:7512,
      luminosityThreshold: deviceSettings.luminosityThreshold,
      rfidValidCard: deviceSettings.rfidValidCard
    }
  }

  updateSettings = () => {
    if (this.state.hostname === '')
      return

    this.props.dispatchKuzzleSettings({
      hostname: this.state.hostname,
      port: this.state.port?this.state.port:7512,
    })
    this.props.dispatchDeviceSettings({
      luminosityThreshold: this.state.luminosityThreshold,
      rfidValidCard: this.state.rfidValidCard
    })
    this.props.navigation.goBack()
  }

  static navigationOptions = (navigation) => {
    return {
      header: () => { return ( <Header/>)}
    }
  }

  render() {
    return (
      <View style={[styles.container, { paddingTop: 25 }]}>
        <View style={styles.framed}>
          <Text style={styles.card_header}>Kuzzle Server</Text>
          <TextInput
            placeholder="kuzzle host"
            style={styles.input}
            value={this.state.hostname}
            keyboardType='url'
            onChangeText={(text) => this.setState({ hostname: text })}
          />
          <TextInput
            placeholder="kuzzle port"
            style={styles.input}
            value={this.state.port.toString()}
            keyboardType='numeric'
            onChangeText={(text) => this.setState({ port: parseInt(text)?parseInt(text):7512 })}
          />
          <TextInput
            placeholder="Luminosity Threshold"
            style={styles.input}
            value={this.state.luminosityThreshold.toString()}
            keyboardType='numeric'
            onChangeText={(text) => this.setState({ luminosityThreshold: parseInt(text)?parseInt(text):80 })}
          />
          <TextInput
            placeholder="RFID Valid Card ID"
            style={styles.input}
            value={this.state.rfidValidCard}
            onChangeText={(text) => this.setState({ rfidValidCard: text })}
          />
          <Button color={orange} onPress={this.updateSettings} title='apply' />
        </View>
      </View>
    )
  }
}

const mapStateToProps = state => {
  return {
  }
}

const mapDispatchToProps = dispatch => {
  console.log('mapDispatchToProps');
  return {
    dispatchKuzzleSettings: (settings) => {
      action = setKuzzleSettings(settings.hostname, settings.port)
      dispatch(action)
    },
    dispatchDeviceSettings: (settings) => {
      action = setDeviceSettings(settings.luminosityThreshold, settings.rfidValidCard)
      dispatch(action)
    },
  }
}

const KuzzleSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(Settings)

export default KuzzleSettings