export const setKuzzleSettings = (hostname, port) => {
  return {
    type: 'SET_KUZZLE_SETTINGS',
    
    hostname,
    port
  }
}

export const setUserCredentials = (user, password) => {
  console.log('user: "', user, '", password: "', password, '"')
  return {
    type: 'SET_USER_CREDENTIALS',
    user,
    password
  }
}

export const setDeviceSettings = (luminosityThreshold, rfidValidCard) => {
  return {
    type: 'SET_DEVICE_SETTINGS',
    
    luminosityThreshold,
    rfidValidCard
  }
}

