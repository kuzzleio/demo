import {combineReducers} from 'redux'
import kuzzleSettings from './kuzzleSettings'
import deviceSettings from './deviceSettings'


const reducers = combineReducers({
  kuzzleSettings,
  deviceSettings
})

export default reducers

