import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from './firebase';
import PassengerForm from '../screens/formulaire';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [showPassengerForm, setShowPassengerForm] = useState(true);
  const [formCompleted, setFormCompleted] = useState(false);
  
  const voyageData = route.params?.voyageData || {
    agencyId: 'bucca_voyage',
    agencyName: 'Bucca Voyage',
    departure: 'Douala',
    destination: 'Yaounde',
    departureTime: '14h00',
    seatType: 'classique',
    seatCount: 2,
    totalPrice: 10000,
    voyageId: 'voyage_sample',
    dateDepart: '2025-05-15',
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(userData);
            
            const initialPassengers = Array(voyageData.seatCount).fill().map((_, index) => ({
              firstName: index === 0 ? userData.firstName || '' : '',
              lastName: index === 0 ? userData.lastName || '' : '',
              age: '',
              gender: 'Masculin',
              phone: index === 0 ? userData.phone || '' : '',
              email: index === 0 ? userData.email || '' : '',
              cni: '',
            }));
            setPassengers(initialPassengers);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          Alert.alert('Erreur', 'Impossible de récupérer vos informations');
        }
      } else {
        Alert.alert('Erreur', 'Veuillez vous connecter pour réserver');
        navigation.navigate('Login');
      }
    };
    
    fetchUserData();
  }, []);

  useEffect(() => {
    const isFormComplete = passengers.every(passenger => 
      passenger.firstName && 
      passenger.lastName && 
      passenger.age && 
      passenger.gender && 
      passenger.phone
    );
    setFormCompleted(isFormComplete);
  }, [passengers]);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handlePassengerChange = (index, field, value) => {
    const updatedPassengers = [...passengers];
    updatedPassengers[index][field] = value;
    setPassengers(updatedPassengers);
  };

  const handlePassengerSelect = (index) => {
    setActivePassengerIndex(index);
  };

  const validatePassengerData = () => {
    for (let i = 0; i < passengers.length; i++) {
      const passenger = passengers[i];
      if (!passenger.firstName || !passenger.lastName || !passenger.age || !passenger.gender || !passenger.phone) {
        Alert.alert('Erreur', `Veuillez remplir toutes les informations obligatoires pour le passager ${i + 1}`);
        return false;
      }
      if (isNaN(passenger.age) || parseInt(passenger.age) <= 0) {
        Alert.alert('Erreur', `L'âge du passager ${i + 1} doit être un nombre valide`);
        return false;
      }
      if (!/^[0-9]{9,}$/.test(passenger.phone)) {
        Alert.alert('Erreur', `Le numéro de téléphone du passager ${i + 1} est invalide`);
        return false;
      }
    }
    return true;
  };

  const generateUniqueTicketCode = () => {
    return `TIK${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  };

  const handleSubmitReservation = async () => {
    if (!validatePassengerData()) {
      return;
    }

    setLoading(true);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        navigation.navigate('Login');
        return;
      }

      const ticketIds = [];
      const ticketData = [];
      
      for (let i = 0; i < passengers.length; i++) {
        const passenger = passengers[i];
        const ticketCode = generateUniqueTicketCode();
        
        const ticketRef = await addDoc(collection(db, 'tickets'), {
          userId: currentUser.uid,
          voyageId: voyageData.voyageId,
          agencyId: voyageData.agencyId,
          seatNumber: `${i + 1}${String.fromCharCode(65 + i)}`,
          prix: voyageData.totalPrice / voyageData.seatCount,
          typePlace: voyageData.seatType,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          fullName: `${passenger.firstName} ${passenger.lastName}`,
          telephone: passenger.phone,
          email: passenger.email || user?.email || '',
          departure: voyageData.departure,
          destination: voyageData.destination,
          dateDepart: voyageData.dateDepart,
          heureDepart: voyageData.departureTime,
          status: 'valid',
          createdAt: serverTimestamp(),
          ticketCode: ticketCode,
          age: passenger.age,
          gender: passenger.gender,
          cni: passenger.cni || '',
        });
        
        ticketIds.push(ticketRef.id);
        
        ticketData.push({
          id: ticketRef.id,
          ...passenger,
          seatNumber: `${i + 1}${String.fromCharCode(65 + i)}`,
          ticketCode: ticketCode
        });
      }

      const reservationRef = await addDoc(collection(db, 'reservations'), {
        userId: currentUser.uid,
        voyageId: voyageData.voyageId,
        agencyId: voyageData.agencyId,
        ticketIds: ticketIds,
        passengerCount: passengers.length,
        typePlace: voyageData.seatType,
        prixTotal: voyageData.totalPrice,
        statut: 'confirmé',
        dateReservation: new Date().toISOString().split('T')[0],
        heureReservation: new Date().toTimeString().split(' ')[0].substring(0, 5),
        createdAt: serverTimestamp(),
      });

      try {
        const voyageRef = doc(db, 'voyages', voyageData.voyageId);
        const voyageDoc = await getDoc(voyageRef);
        
        if (voyageDoc.exists()) {
          const voyageData = voyageDoc.data();
          const fieldToUpdate = voyageData.seatType.toLowerCase() === 'classique' 
            ? 'placesClassiqueDisponibles' 
            : 'placesVIPDisponibles';
            
          await updateDoc(voyageRef, {
            [fieldToUpdate]: Math.max(0, (voyageData[fieldToUpdate] || 0) - passengers.length)
          });
        }
      } catch (error) {
        console.error('Error updating voyage seats:', error);
      }

      await addDoc(collection(db, 'notifications'), {
        userId: currentUser.uid,
        titre: 'Réservation confirmée',
        message: `Votre réservation pour ${voyageData.departure}-${voyageData.destination} le ${voyageData.dateDepart} a été confirmée`,
        type: 'reservation',
        lue: false,
        dateCreation: new Date().toISOString().split('T')[0],
        heureCreation: new Date().toTimeString().split(' ')[0].substring(0, 5),
        createdAt: serverTimestamp(),
      });

      navigation.navigate('TicketScreen', { 
        ticketIds: ticketIds,
        voyageData: voyageData,
        ticketData: ticketData,
        reservationId: reservationRef.id
      });
      
    } catch (error) {
      console.error('Reservation error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la validation de votre réservation');
    } finally {
      setLoading(false);
    }
  };

  const renderPassengerSummary = () => {
    return (
      <View style={styles.passengerSummaryContainer}>
        <Text style={styles.passengerSummaryTitle}>Résumé des informations</Text>
        
        {passengers.map((passenger, index) => (
          <View key={index} style={styles.passengerSummaryCard}>
            <View style={styles.passengerSummaryHeader}>
              <Icon name="account" size={20} color="#2563EB" />
              <Text style={styles.passengerSummaryName}>
                {index === 0 ? "Vous" : `Passager ${index + 1}`}: {passenger.firstName} {passenger.lastName}
              </Text>
              <TouchableOpacity onPress={() => {
                setActivePassengerIndex(index);
                setShowPassengerForm(true);
              }}>
                <Icon name="pencil" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.passengerSummaryDetails}>
              <View style={styles.passengerSummaryItem}>
                <Text style={styles.passengerSummaryLabel}>Âge:</Text>
                <Text style={styles.passengerSummaryValue}>{passenger.age} ans</Text>
              </View>
              <View style={styles.passengerSummaryItem}>
                <Text style={styles.passengerSummaryLabel}>Genre:</Text>
                <Text style={styles.passengerSummaryValue}>{passenger.gender}</Text>
              </View>
              <View style={styles.passengerSummaryItem}>
                <Text style={styles.passengerSummaryLabel}>Téléphone:</Text>
                <Text style={styles.passengerSummaryValue}>{passenger.phone}</Text>
              </View>
            </View>
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.editAllButton}
          onPress={() => setShowPassengerForm(true)}
        >
          <Text style={styles.editAllButtonText}>Modifier les informations</Text>
          <Icon name="account-edit" size={18} color="#2563EB" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionToggle = () => {
    return (
      <View style={styles.sectionToggleContainer}>
        <TouchableOpacity 
          style={[styles.sectionToggleButton, showPassengerForm && styles.activeSectionToggle]}
          onPress={() => setShowPassengerForm(true)}
        >
          <Text style={[styles.sectionToggleText, showPassengerForm && styles.activeSectionToggleText]}>
            Formulaire
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sectionToggleButton, !showPassengerForm && styles.activeSectionToggle]}
          onPress={() => setShowPassengerForm(false)}
          disabled={!formCompleted}
        >
          <Text style={[
            styles.sectionToggleText, 
            !showPassengerForm && styles.activeSectionToggleText,
            !formCompleted && styles.disabledSectionToggleText
          ]}>
            Résumé
          </Text>
          {!formCompleted && <Icon name="lock" size={16} color="#A1A1AA" style={styles.lockIcon} />}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Validation de la réservation</Text>
            <Image 
              source={require('../assets/images/GoExpress.png')} 
              style={styles.headerLogo} 
            />
          </View>

          <View style={styles.ticketCard}>
            <Image 
              source={require('../assets/images/GoExpress.png')} 
              style={styles.agencyLogo} 
            />
            
            <View style={styles.routeContainer}>
              <Text style={styles.cityText}>{voyageData.departure}</Text>
              <View style={styles.arrowContainer}>
                <Icon name="arrow-right" size={24} color="#000" />
              </View>
              <Text style={styles.cityText}>{voyageData.destination}</Text>
            </View>
            
            <View style={styles.ticketDetailsRow}>
              <Text style={styles.agencyName}>{voyageData.agencyName}</Text>
              <Text style={styles.seatInfo}>{voyageData.seatCount} place{voyageData.seatCount > 1 ? 's' : ''} {voyageData.seatType}</Text>
            </View>
            
            <View style={styles.ticketDetailsRow}>
              <Text style={styles.departureTime}>{voyageData.dateDepart} • {voyageData.departureTime}</Text>
              <Text style={styles.priceText}>Prix total: {voyageData.totalPrice} FCFA</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations des passagers</Text>
            <Text style={styles.sectionSubtitle}>
              Remplissez les informations pour chaque passager
              <Text style={styles.requiredFields}> (champs avec * sont obligatoires)</Text>
            </Text>
            
            {renderSectionToggle()}
            
            {showPassengerForm ? (
              <PassengerForm 
                passengers={passengers}
                activePassengerIndex={activePassengerIndex}
                onPassengerChange={handlePassengerChange}
                onPassengerSelect={handlePassengerSelect}
              />
            ) : (
              renderPassengerSummary()
            )}
          </View>

          <TouchableOpacity 
            style={[styles.confirmButton, !formCompleted && styles.disabledConfirmButton]}
            onPress={handleSubmitReservation}
            disabled={loading || !formCompleted}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>Confirmer la réservation</Text>
                <Icon name="check" size={20} color="#fff" style={styles.confirmIcon} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerLogo: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  ticketCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 10,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  arrowContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
  },
  ticketDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  agencyName: {
    fontSize: 16,
    color: '#fff',
  },
  seatInfo: {
    fontSize: 14,
    color: '#fff',
  },
  departureTime: {
    fontSize: 14,
    color: '#fff',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 15,
  },
  requiredFields: {
    fontStyle: 'italic',
    fontSize: 13,
    color: '#94A3B8',
  },
  sectionToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 15,
    padding: 4,
  },
  sectionToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeSectionToggle: {
    backgroundColor: '#2563EB',
  },
  sectionToggleText: {
    fontWeight: '500',
    color: '#64748B',
  },
  activeSectionToggleText: {
    color: '#fff',
  },
  disabledSectionToggleText: {
    color: '#A1A1AA',
  },
  lockIcon: {
    marginLeft: 5,
  },
  passengerSummaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  passengerSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  passengerSummaryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  passengerSummaryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  passengerSummaryItem: {
    width: '50%',
    marginBottom: 5,
  },
  passengerSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  passengerSummaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  editAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
  },
  editAllButtonText: {
    color: '#2563EB',
    fontWeight: '500',
    marginRight: 5,
  },
  confirmButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  disabledConfirmButton: {
    backgroundColor: '#A1A1AA',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 10,
  },
  confirmIcon: {
    marginLeft: 5,
  },
});

export default PaymentScreen;