import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';

const DetailReservation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agencyInfo, departureCity, destinationCity, selectedSeats, classType } = route.params || {};
  
  const [formData, setFormData] = useState({
    passenger1: {
      nom: '',
      prenom: '',
      age: '',
      gender: 'Masculin',
    },
    passenger2: {
      nom: '',
      prenom: '',
      age: '',
      gender: 'Masculin',
    },
  });

  const handleGenderSelect = (passengerKey, gender) => {
    setFormData({
      ...formData,
      [passengerKey]: {
        ...formData[passengerKey],
        gender,
      },
    });
  };

  const handleInputChange = (passengerKey, field, value) => {
    setFormData({
      ...formData,
      [passengerKey]: {
        ...formData[passengerKey],
        [field]: value,
      },
    });
  };

  const handleReservation = () => {
    navigation.navigate('PaymentConfirmation', {
      agencyInfo,
      departureCity,
      destinationCity,
      selectedSeats,
      classType,
      passengerInfo: formData,
    });
  };

  const getAgencyLogo = () => {
    if (agencyInfo && agencyInfo.id === 'bucca_voyage') {
      return require('../assets/images/BucaLogo.jpg'); // Notez le 'B' majuscule
    } else if (agencyInfo && agencyInfo.id === 'general_express_voyage') {
      return require('../assets/images/generaleLogo.jpg');
    } else if (agencyInfo && agencyInfo.id === 'touristique_express_voyage') {
      return require('../assets/images/touristique.jpg');
    }
    return require('../assets/images/logo.png');
  };
  const numberOfSeats = selectedSeats ? selectedSeats.length : 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la réservation</Text>
        <Image source={require('../assets/images/logo.png')} style={styles.logo} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.journeyCard}>
          <View style={styles.agencyHeader}>
            <Image source={getAgencyLogo()} style={styles.agencyLogo} />
            <Text style={styles.agencyName}>{agencyInfo ? agencyInfo.name : 'Buca Voyage'}</Text>
            <Text style={styles.departureTime}>{agencyInfo ? agencyInfo.departureTime : '14h00'}</Text>
          </View>

          <View style={styles.journeyInfo}>
            <View style={styles.cityContainer}>
              <Text style={styles.city}>{departureCity || 'Douala'}</Text>
              <View style={styles.swapIconContainer}>
                <Feather name="arrow-right" size={20} color="#fff" />
              </View>
              <Text style={styles.city}>{destinationCity || 'Yaoundé'}</Text>
            </View>

            <View style={styles.seatInfoContainer}>
              <Text style={styles.seatInfo}>
                {numberOfSeats} {numberOfSeats > 1 ? 'places' : 'place'} {classType || 'classique'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.passengerSection}>
          <Text style={styles.sectionTitle}>Informations du voyageur</Text>
          
          <View style={styles.passengerForm}>
            <Text style={styles.passengerLabel}>Passager 1</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={formData.passenger1.nom}
              onChangeText={(text) => handleInputChange('passenger1', 'nom', text)}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={formData.passenger1.prenom}
              onChangeText={(text) => handleInputChange('passenger1', 'prenom', text)}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Âge"
              keyboardType="numeric"
              value={formData.passenger1.age}
              onChangeText={(text) => handleInputChange('passenger1', 'age', text)}
            />
            
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Sexe</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.passenger1.gender === 'Masculin' && styles.genderButtonSelected,
                  ]}
                  onPress={() => handleGenderSelect('passenger1', 'Masculin')}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.passenger1.gender === 'Masculin' && styles.genderButtonTextSelected,
                    ]}
                  >
                    Masculin
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.passenger1.gender === 'Feminin' && styles.genderButtonSelected,
                  ]}
                  onPress={() => handleGenderSelect('passenger1', 'Feminin')}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.passenger1.gender === 'Feminin' && styles.genderButtonTextSelected,
                    ]}
                  >
                    Feminin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {numberOfSeats > 1 && (
            <View style={styles.passengerForm}>
              <Text style={styles.passengerLabel}>Passager 2</Text>
              
              <TextInput
                style={styles.input}
                placeholder="Nom"
                value={formData.passenger2.nom}
                onChangeText={(text) => handleInputChange('passenger2', 'nom', text)}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Prénom"
                value={formData.passenger2.prenom}
                onChangeText={(text) => handleInputChange('passenger2', 'prenom', text)}
              />
              
              <TextInput
                style={styles.input}
                placeholder="Âge"
                keyboardType="numeric"
                value={formData.passenger2.age}
                onChangeText={(text) => handleInputChange('passenger2', 'age', text)}
              />
              
              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Sexe</Text>
                <View style={styles.genderOptions}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.passenger2.gender === 'Masculin' && styles.genderButtonSelected,
                    ]}
                    onPress={() => handleGenderSelect('passenger2', 'Masculin')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        formData.passenger2.gender === 'Masculin' && styles.genderButtonTextSelected,
                      ]}
                    >
                      Masculin
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.passenger2.gender === 'Feminin' && styles.genderButtonSelected,
                    ]}
                    onPress={() => handleGenderSelect('passenger2', 'Feminin')}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        formData.passenger2.gender === 'Feminin' && styles.genderButtonTextSelected,
                      ]}
                    >
                      Feminin
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.reserveButton} onPress={handleReservation}>
          <Text style={styles.reserveButtonText}>Réserver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  agencyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  departureTime: {
    fontSize: 14,
    color: '#555',
  },
  journeyInfo: {
    padding: 15,
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  city: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  swapIconContainer: {
    backgroundColor: '#5e17eb',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  seatInfoContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  seatInfo: {
    fontSize: 14,
    color: '#5e17eb',
  },
  passengerSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  passengerForm: {
    marginBottom: 20,
  },
  passengerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderContainer: {
    marginBottom: 15,
  },
  genderLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderButtonSelected: {
    backgroundColor: '#5e17eb',
    borderColor: '#5e17eb',
  },
  genderButtonText: {
    color: '#000',
  },
  genderButtonTextSelected: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  reserveButton: {
    backgroundColor: '#5e17eb',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DetailReservation;