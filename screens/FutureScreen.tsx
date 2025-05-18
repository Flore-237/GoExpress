import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const FeaturesScreen = ({ onNext }) => {
  return (
    <View style={styles.screen}>
      <View style={styles.contentContainer}>
        <View style={styles.cloudsContainer}>
          <View style={[styles.cloud, { left: 20, top: 10 }]} />
          <View style={[styles.cloud, { left: 80, top: 30 }]} />
          <View style={[styles.cloud, { left: 140, top: 15 }]} />
        </View>
        
        <View style={styles.busImageContainer}>
          <Image 
            source={require('../assets/images/unbord1.png')} 
            style={styles.busImage}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.featureTitle}>Réservation facile</Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>🔒</Text>
            </View>
            <Text style={styles.featureText}>Paiement sécurisé</Text>
          </View>
          
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.iconText}>⏰</Text>
            </View>
            <Text style={styles.featureText}>Horaire en temps réel</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={onNext}
        >
          <Text style={styles.buttonText}>Suivant</Text>
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
  busImageContainer: {
    width: width * 0.7,
    height: 150,
    marginBottom: 30,
  },
  busImage: {
    width: '100%',
    height: '100%',
  },
  featureTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
  },
});

export default FeaturesScreen;