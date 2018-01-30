import React from 'react'
import { StackNavigator, HeaderBackButton } from 'react-navigation'
import { Text, Button, Alert } from 'react-native'


import Login from '../screens/Login'
import Dashboard from '../screens/Dashboard'
import KuzzleSettings from '../screens/Settings'

export const AppStackCards = StackNavigator({
  Login: {
    screen: Login,
    navigationOptions: {
      title: 'Kuzzle IoT',
    },
  },
  Dashboard: {
    screen: Dashboard,
    navigationOptions: {
      title: 'Dashboard',
    },
  },
})

export const AppStack = StackNavigator(
  {
    AppStackCards: {
      screen: AppStackCards,
    },
    Settings: {
      screen: KuzzleSettings,
      navigationOptions: ({navigation}) => ({
        headerLeft: <HeaderBackButton title='Back' onPress={() => navigation.dispatch({ type: 'Navigation/BACK' })} />,
        title: 'Settings',
        headerMode: 'float',
      })
    }
  }, {
    mode: 'modal',
    headerMode: 'none',
  })

