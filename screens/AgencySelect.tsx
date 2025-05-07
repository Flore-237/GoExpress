import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';

const Agency_select = () => {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const agenciesRef = await firestore().collection('agencies').get();
        const agenciesData = agenciesRef.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          ...doc.data()
        }));
        setAgencies(agenciesData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des agences:', error);
        setLoading(false);
      }
    };

    fetchAgencies();
  }, []);

  const handleAgencySelect = (agency) => {
    navigation.navigate('AgencyDetails', { 
      agencyId: agency.id, 
      agencyName: agency.name 
    });
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-back-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Logo & Title */}
        <View style={styles.agencyCard}>
          <Image
            source={require('../assets/images/LogoBlanc.png')}
            style={styles.agencyLogo}
            resizeMode="contain"
          />
          <Text style={styles.agencyCardTitle}>Choisir une agence</Text>
        </View>

        {/* Agency Cards */}
        <ScrollView style={styles.agencyList}>
          {agencies.map((agency) => (
            <TouchableOpacity
              key={agency.id}
              style={styles.agencyItem}
              onPress={() => handleAgencySelect(agency)}
            >
              <View style={styles.agencyCardContent}>
                <Image
                  source={
                    agency.id === 'general_express_voyage'
                      ? require('../assets/images/GeneraleExpress.png')
                      : agency.id === 'bucca_voyage'
                      ? require('../assets/images/BucaVoyage.jpg')
                      : require('../assets/images/touristique.jpg')
                  }
                  style={styles.agencyImage}
                  resizeMode="cover"
                />
                <View style={styles.verticalDivider} />
                <Text style={styles.agencyName}>{agency.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  agencyCard: {
    backgroundColor: '#3d56f0',
    borderRadius: 10,
    paddingVertical: 25,
    paddingHorizontal: 20,
    margin: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agencyLogo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  agencyCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  agencyList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  agencyItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  agencyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agencyImage: {
    width: 90,
    height: 60,
    borderRadius: 10,
  },
  verticalDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 15,
  },
  agencyName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
});

export default Agency_select;
