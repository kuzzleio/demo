import React, { Component } from 'react';
import { View, Text, TextInput, StyleSheet, Button } from 'react-native'
import { styles, orange } from '../styles/styles'

export default class Login extends Component {
  constructor(props) {
    super(props)
    this.state = {
      userName: this.props.userName,
      password: this.props.password
    }
  }

  render() {
    return (
      <View style={styles.framed}>
        <Text style={styles.card_header}>Login</Text>
        <Text />
        <View>
          <TextInput 
            style={styles.input} 
            autoCapitalize="none" 
            placeholder="user name" 
            value={this.state.userName} 
            onChangeText={(text) => this.setState({userName:text})}
          />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            secureTextEntry={true}
            placeholder="password"
            value={this.state.password}
          />
          <Button title="login" color={orange} onPress={() => this.props.onLogin(this.state)} />
          <Button title="sign-up" color={orange} onPress={this.props.onSignup} />
        </View>
      </View>
    )
  }
}
