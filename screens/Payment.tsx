import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import firestore from '@react-native-firebase/firestore';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../constants/routes';

const { width } = Dimensions.get('window');

const ReservationScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { reservationData, reservationId } = route.params || {};
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Passenger info state
  const [passengerInfo, setPassengerInfo] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: 'Masculin'
  });

  // Voyage info state with real-time updates
  const [voyageInfo, setVoyageInfo] = useState({
    agencyName: '',
    logoUrl: '',
    departure: '',
    destination: '',
    departureTime: '',
    departureDate: '',
    seatType: '',
    numberOfSeats: 0,
    totalPrice: 0,
    seats: [],
    reservationId: ''
  });

  // Fetch reservation data in real-time
  useEffect(() => {
    if (!reservationId) return;

    const unsubscribe = firestore()
      .collection('reservations')
      .doc(reservationId)
      .onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          setVoyageInfo({
            agencyName: data.nomAgence || 'Agence inconnue',
            logoUrl: data.logoAgence || 'https://via.placeholder.com/60',
            departure: data.villeDepart || data.departure || '',
            destination: data.villeArrivee || data.destination || '',
            departureTime: data.heureDepart || '',
            departureDate: data.dateVoyage || data.departureDate || '',
            seatType: data.seatType || data.typePlace || '',
            numberOfSeats: data.numberOfSeats || data.seats?.length || 0,
            totalPrice: data.prixTotal || data.totalPrice || 0,
            seats: data.seats || [],
            reservationId: reservationId
          });
        }
      });

    return () => unsubscribe();
  }, [reservationId]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatPrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${Number(numPrice).toLocaleString('fr-FR')} FCFA`;
  };

  const handleEditPassengerInfo = () => {
    setShowEditModal(true);
  };

  const savePassengerInfo = () => {
    setShowEditModal(false);
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
    setPaymentPhone('');
  };

  const simulatePayment = async () => {
    setIsProcessing(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsProcessing(false);
        resolve(true);
      }, 2000);
    });
  };

  const getCurrentUserId = async () => {
    try {
      // Essayer d'abord de récupérer depuis le contexte
      if (user?.uid || user?.id) {
        return user.uid || user.id;
      }

      // Sinon essayer AsyncStorage
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.uid || parsedData.id;
      }

      // En dernier recours, utiliser l'email comme identifiant
      if (user?.email) {
        return user.email;
      }

      throw new Error('Impossible de récupérer l\'ID utilisateur');
    } catch (error) {
      console.error('Erreur récupération ID utilisateur:', error);
      return null;
    }
  };

  // Ajoutez cette fonction pour réinitialiser les champs
  const resetFormFields = () => {
    setSelectedPaymentMethod('');
    setPaymentPhone('');
    setPassengerInfo({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'Masculin'
    });
  };

  // Modifiez la fonction confirmReservation
  const confirmReservation = async () => {
    if (!selectedPaymentMethod || !paymentPhone) {
      Alert.alert('Erreur', 'Veuillez sélectionner un mode de paiement et entrer votre numéro');
      return;
    }

    setIsLoading(true);

    try {
      await simulatePayment();

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non identifié');
      }

      await firestore().collection('reservations').doc(reservationId).update({
        userId: userId,
        userEmail: user?.email || '',
        statut: 'confirmé',
        statutPaiement: 'confirmé',
        paymentMethod: selectedPaymentMethod,
        paymentPhone: paymentPhone,
        passengerInfo: {
          ...passengerInfo,
          userId: userId,
          email: user?.email || passengerInfo.email
        },
        confirmedAt: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      const ticketData = {
        ...voyageInfo,
        userId: userId,
        userEmail: user?.email || '',
        fullName: `${passengerInfo.firstName} ${passengerInfo.lastName}`,
        email: passengerInfo.email,
        phone: paymentPhone,
        pieceIdentite: passengerInfo.pieceIdentite || 'Non spécifié',
        seatType: voyageInfo.seatType,
        seats: voyageInfo.seats,
        totalPrice: voyageInfo.totalPrice,
        paymentMethod: selectedPaymentMethod,
        reservationId: reservationId
      };

      // Réinitialiser les champs après la réservation réussie
      resetFormFields();

      // Afficher la boîte de dialogue de succès
      Alert.alert(
        'Paiement Réussi !',
        'Votre réservation a été confirmée avec succès.',
        [
          {
            text: 'Voir mon billet',
            style: 'default',
            onPress: () => {
              navigation.navigate('Ticket', {
                ticketData: ticketData,
                reservationId: reservationId
              });
            }
          }
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        'Erreur',
        error.message === 'Utilisateur non identifié' 
          ? 'Vous devez être connecté pour effectuer une réservation.'
          : 'Une erreur est survenue lors du paiement.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier les informations</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prénom *</Text>
              <TextInput
                style={styles.textInput}
                value={passengerInfo.firstName}
                onChangeText={(text) => setPassengerInfo(prev => ({ ...prev, firstName: text }))}
                placeholder="Votre prénom"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom *</Text>
              <TextInput
                style={styles.textInput}
                value={passengerInfo.lastName}
                onChangeText={(text) => setPassengerInfo(prev => ({ ...prev, lastName: text }))}
                placeholder="Votre nom"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={passengerInfo.email}
                onChangeText={(text) => setPassengerInfo(prev => ({ ...prev, email: text }))}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone *</Text>
              <TextInput
                style={styles.textInput}
                value={passengerInfo.phone}
                onChangeText={(text) => setPassengerInfo(prev => ({ ...prev, phone: text }))}
                placeholder="655 78 38 79"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sexe *</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderOption, passengerInfo.gender === 'Masculin' && styles.selectedGender]}
                  onPress={() => setPassengerInfo(prev => ({ ...prev, gender: 'Masculin' }))}
                >
                  <Text style={[styles.genderText, passengerInfo.gender === 'Masculin' && styles.selectedGenderText]}>
                    Masculin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, passengerInfo.gender === 'Féminin' && styles.selectedGender]}
                  onPress={() => setPassengerInfo(prev => ({ ...prev, gender: 'Féminin' }))}
                >
                  <Text style={[styles.genderText, passengerInfo.gender === 'Féminin' && styles.selectedGenderText]}>
                    Féminin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveButton} onPress={savePassengerInfo}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la réservation</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.processingText}>Traitement du paiement...</Text>
            <Text style={styles.processingSubtext}>Veuillez patienter</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Reservation Card */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.mainCard}>
          {/* Agency Header */}
          <View style={styles.agencyHeader}>
            <Image
              source={{ uri: voyageInfo.logoUrl }}
              style={styles.agencyLogo}
              defaultSource={{ uri: 'https://via.placeholder.com/60' }}
            />
            <Text style={styles.agencyName}>{voyageInfo.agencyName}</Text>
          </View>

          {/* Voyage Details */}
          <View style={styles.routeContainer}>
            <View style={styles.routeInfo}>
              <Text style={styles.departureText}>{voyageInfo.departure}</Text>
              <View style={styles.routeLine}>
                <View style={styles.routeDot} />
                <View style={styles.routeDivider} />
                <View style={styles.routeDot} />
              </View>
              <Text style={styles.destinationText}>{voyageInfo.destination}</Text>
            </View>

            <View style={styles.timeDateContainer}>
              <View style={styles.timeContainer}>
                <Icon name="time-outline" size={18} color="#666" />
                <Text style={styles.timeText}>{voyageInfo.departureTime}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Icon name="calendar-outline" size={18} color="#666" />
                <Text style={styles.dateText}>{formatDate(voyageInfo.departureDate)}</Text>
              </View>
            </View>
          </View>

          {/* Seats Info */}
          <View style={styles.seatsInfoContainer}>
            <View style={styles.seatTypeContainer}>
              <MaterialCommunityIcons name="seat" size={20} color="#666" />
              <Text style={styles.seatTypeText}>{voyageInfo.seatType}</Text>
            </View>
            <View style={styles.seatsNumberContainer}>
              <Text style={styles.seatsNumberText}>
                {voyageInfo.numberOfSeats} {voyageInfo.numberOfSeats > 1 ? 'places' : 'place'}
              </Text>
              <Text style={styles.seatsNumbers}>
                {voyageInfo.seats.map(seat => seat.number).join(', ')}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Total Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.totalText}>Total à payer</Text>
            <Text style={styles.priceText}>{formatPrice(voyageInfo.totalPrice)}</Text>
          </View>
        </Animatable.View>

        {/* Passenger Info */}
        <Animatable.View animation="fadeInUp" duration={800} delay={100} style={styles.passengerCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informations passager</Text>
            <TouchableOpacity onPress={handleEditPassengerInfo}>
              <Text style={styles.editText}>Modifier</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.passengerInfoContainer}>
            <View style={styles.passengerInfoRow}>
              <Text style={styles.passengerInfoLabel}>Nom complet</Text>
              <Text style={styles.passengerInfoValue}>
                {passengerInfo.firstName} {passengerInfo.lastName}
              </Text>
            </View>
            <View style={styles.passengerInfoRow}>
              <Text style={styles.passengerInfoLabel}>Email</Text>
              <Text style={styles.passengerInfoValue}>{passengerInfo.email}</Text>
            </View>
            <View style={styles.passengerInfoRow}>
              <Text style={styles.passengerInfoLabel}>Téléphone</Text>
              <Text style={styles.passengerInfoValue}>{passengerInfo.phone}</Text>
            </View>
            <View style={styles.passengerInfoRow}>
              <Text style={styles.passengerInfoLabel}>Sexe</Text>
              <Text style={styles.passengerInfoValue}>{passengerInfo.gender}</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Payment Method */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          
          <View style={styles.paymentMethodsContainer}>
            <TouchableOpacity 
              style={[styles.paymentMethod, selectedPaymentMethod === 'OM' && styles.selectedPaymentMethod]}
              onPress={() => handlePaymentMethodSelect('OM')}
            >
              <MaterialCommunityIcons name="cellphone" size={24} color="#FF6600" />
              <Text style={styles.paymentMethodText}>Orange Money</Text>
              {selectedPaymentMethod === 'OM' && (
                <Icon name="checkmark-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentMethod, selectedPaymentMethod === 'MOMO' && styles.selectedPaymentMethod]}
              onPress={() => handlePaymentMethodSelect('MOMO')}
            >
              <MaterialCommunityIcons name="cellphone" size={24} color="#FFCC00" />
              <Text style={styles.paymentMethodText}>MTN Mobile Money</Text>
              {selectedPaymentMethod === 'MOMO' && (
                <Icon name="checkmark-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          </View>

          {selectedPaymentMethod && (
            <View style={styles.phoneInputContainer}>
              <Text style={styles.phoneInputLabel}>
                Numéro {selectedPaymentMethod === 'OM' ? 'Orange Money' : 'Mobile Money'} *
              </Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Ex: 655783879"
                keyboardType="phone-pad"
                value={paymentPhone}
                onChangeText={setPaymentPhone}
              />
            </View>
          )}
        </Animatable.View>
      </ScrollView>

      {/* Confirm Button */}
      <Animatable.View animation="fadeInUp" duration={800} delay={300} style={styles.confirmButtonContainer}>
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={confirmReservation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirmer et payer</Text>
          )}
        </TouchableOpacity>
      </Animatable.View>

      {/* Edit Modal */}
      {renderEditModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4169E1',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  agencyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  agencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeContainer: {
    marginBottom: 15,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  departureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  routeDivider: {
    width: 40,
    height: 1,
    backgroundColor: '#ddd',
  },
  timeDateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 5,
    color: '#666',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 5,
    color: '#666',
  },
  seatsInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seatTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatTypeText: {
    marginLeft: 5,
    color: '#666',
  },
  seatsNumberContainer: {
    alignItems: 'flex-end',
  },
  seatsNumberText: {
    color: '#666',
  },
  seatsNumbers: {
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    color: '#666',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  passengerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editText: {
    color: '#007aff',
    fontSize: 14,
  },
  passengerInfoContainer: {
    marginTop: 5,
  },
  passengerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  passengerInfoLabel: {
    color: '#666',
  },
  passengerInfoValue: {
    fontWeight: '500',
    color: '#333',
  },
  paymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodsContainer: {
    marginTop: 10,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  paymentMethodText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  selectedPaymentMethod: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0FFF0',
  },
  checkIcon: {
    marginLeft: 10,
  },
  phoneInputContainer: {
    marginTop: 15,
  },
  phoneInputLabel: {
    marginBottom: 5,
    color: '#666',
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  confirmButtonContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: '#4169E1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 10,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    marginTop: 5,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    marginBottom: 5,
    color: '#666',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  genderContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  genderOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginRight: 10,
    alignItems: 'center',
  },
  selectedGender: {
    borderColor: '#007aff',
    backgroundColor: '#4169E1',
  },
  genderText: {
    color: '#666',
  },
  selectedGenderText: {
    color: '#007aff',
    fontWeight: '600',
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#007aff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ReservationScreen;