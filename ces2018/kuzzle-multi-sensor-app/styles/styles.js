import {StyleSheet} from 'react-native'

export const green = 'rgb(184,227,155)'
export const orange = 'rgb(223,125,109)'
export const darkbrown = 'rgb(35,31,32)'
export const lightbrown = 'rgb(75,63,73)'
export const lightblue = 'rgb(194,235,244)'

export const styles = StyleSheet.create({
  base_text: {
    fontFamily: 'Verdana',
  },
  app_title: {
    fontSize: 40
  },
  container: {
    // padding: 10,
    // paddingTop: 50,
    paddingTop:20,
    flex: 1,
    alignItems: 'flex-start',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  login_frame: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    height: 150,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-between',   
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,    
  },
  card_view: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    margin: 4,
    height: 150,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-between',   
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,  
    backgroundColor: '#bcd0e0' //'#617a8e'    
  },
  framed: {
    borderWidth: .5,
    borderColor: green,
    backgroundColor: '#FFFFFF',    
    padding: 10,
    margin: 4,
    // height: 150,
    
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-between',   
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,    
  },
  input: {
    height: 35,
    width: 300,
    borderWidth: 1,
    borderRadius: 5,
    margin: 4,
    padding: 6,
    borderColor: '#ccd',
    backgroundColor: '#ddd'
  },
  card_header: {
    color: '#000000',
    fontFamily: 'Verdana',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  button: {
    color: orange
  }
})
