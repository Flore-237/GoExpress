import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const FeaturesScreen3 = ({ onNext }) => {
  const navigation = useNavigation();

  const handleStart = () => {
    // Utilisez la prop onNext passée par OnboardingNavigator
    onNext();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Créez votre compte</Text>
        <Text style={styles.subtitle}>
          et commencez à réserver vos billets de bus en toute simplicité.
        </Text>

        <Image
          source={require('../assets/images/unbord3.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleStart}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  image: {
    width: width * 0.8,
    height: 250,
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
});

export default FeaturesScreen3;