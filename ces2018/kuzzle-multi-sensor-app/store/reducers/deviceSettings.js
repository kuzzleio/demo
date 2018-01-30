const deviceSettings = (state = {}, action) => {
  console.log("deviceSettings: \n\tstate: ", state, "\n\taction: ", action)
  switch (action.type) {
    case 'SET_DEVICE_SETTINGS':
      return {
        ...state,
        luminosityThreshold: action.luminosityThreshold,
        rfidValidCard: action.rfidValidCard
      }
    default:
      return state
  }
}

export default deviceSettings