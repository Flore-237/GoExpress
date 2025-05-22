import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const WelcomeScreen = ({ onNext }) => {
  return (
    <View style={styles.screen}>
      <View style={styles.contentContainer}>
        <Image 
          source={require('../assets/images/GoExpress.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.cloudsContainer}>
          <View style={[styles.cloud, { left: 20, top: 10 }]} />
          <View style={[styles.cloud, { left: 80, top: 30 }]} />
          <View style={[styles.cloud, { left: 140, top: 15 }]} />
        </View>
        <View style={styles.phoneContainer}>
          <View style={styles.phone}>
            <View style={styles.busIconContainer}>
              <Text style={styles.busIcon}>🚌</Text>
            </View>
          </View>
        </View>
        <Text style={styles.title}>BusEpress  </Text>
        <Text style={styles.subtitle}>Bienvenue!</Text>
      </View>
      
      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={onNext}
        >
          <Text style={styles.buttonText}>Commencer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'space-between',
    backgroundColor: '#3D56F0',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudsContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
  },
  cloud: {
    position: 'absolute',
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  button: {
    width: '80%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3D56F0',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  phoneContainer: {
    marginBottom: 30,
  },
  phone: {
    width: 100,
    height: 180,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
  },
  busIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#3D56F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  busIcon: {
    fontSize: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default WelcomeScreen;