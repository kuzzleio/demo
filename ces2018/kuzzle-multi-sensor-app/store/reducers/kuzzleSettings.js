const kuzzleSettings = (state = {}, action) => {
  console.log("kuzzleSettings: \n\tstate: ", state, "\n\taction: ", action)
  switch (action.type) {
    case 'SET_KUZZLE_SETTINGS':
      return {
        ...state,
        hostname: action.hostname,
        port: action.port
      }
    case 'SET_USER_CREDENTIALS':
      return {
        ...state,
        user: action.user,
        password: action.password
      }
    default:
      return state
  }
}

export default kuzzleSettings