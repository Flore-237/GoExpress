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
import NotchPayPayment from '../components/NotchPayPayment';

const { width } = Dimensions.get('window');

interface RouteParams {
  reservationData: any;
  reservationId: string;
}

interface PassengerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
}

const PaymentScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const { reservationData, reservationId } = params;
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  // État pour les informations des passagers
  const [passengersInfo, setPassengersInfo] = useState<PassengerInfo[]>([]);

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

  // Initialiser les informations des passagers
  useEffect(() => {
    if (voyageInfo.numberOfSeats > 0) {
      const initialPassengers = Array(voyageInfo.numberOfSeats).fill(null).map((_, index) => {
        if (index === 0) {
          // Premier passager : informations de l'utilisateur connecté
          return {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            gender: 'Masculin'
          };
        }
        // Autres passagers : champs vides
        return {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          gender: 'Masculin'
        };
      });
      setPassengersInfo(initialPassengers);
    }
  }, [voyageInfo.numberOfSeats, user]);

  useEffect(() => {
    console.log('=== DEBUG PAYMENT SCREEN ===');
    console.log('Paramètres route:', params);
    console.log('reservationId:', reservationId);
    console.log('reservationData:', reservationData);
    console.log('============================');
  }, [params, reservationId, reservationData]);

  // Fetch reservation data in real-time
  useEffect(() => {
    if (!reservationId) {
      console.warn('Aucun reservationId fourni');
      return;
    }

    console.log('Écoute des changements pour reservationId:', reservationId);

    const unsubscribe = firestore()
      .collection('reservations')
      .doc(reservationId)
      .onSnapshot(doc => {
        console.log('Document snapshot reçu:', doc.exists);
        
        if (doc.exists) {
          const data = doc.data() as { [key: string]: any } || {};
          console.log('Données de la réservation:', data);
          
          const newVoyageInfo = {
            agencyName: data.nomAgence || data.agencyName || 'Agence inconnue',
            logoUrl: data.logoAgence || data.logoUrl || 'https://via.placeholder.com/60',
            departure: data.villeDepart || data.departure || data.origin || '',
            destination: data.villeArrivee || data.destination || '',
            departureTime: data.heureDepart || data.departureTime || '',
            departureDate: data.dateVoyage || data.departureDate || '',
            seatType: data.seatType || data.typePlace || '',
            numberOfSeats: data.numberOfSeats || data.seats?.length || 0,
            totalPrice: data.prixTotal || data.totalPrice || 0,
            seats: data.seats || [],
            reservationId: reservationId
          };
          
          console.log('Voyage info mis à jour:', newVoyageInfo);
          setVoyageInfo(newVoyageInfo);
        } else {
          console.error('Document de réservation non trouvé pour ID:', reservationId);
        }
      }, error => {
        console.error('Erreur lors de l\'écoute de la réservation:', error);
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

  const handleEditPassengerInfo = (index: number) => {
    setCurrentPassengerIndex(index);
    setShowEditModal(true);
  };

  const savePassengerInfo = (updatedInfo: PassengerInfo) => {
    const newPassengersInfo = [...passengersInfo];
    newPassengersInfo[currentPassengerIndex] = updatedInfo;
    setPassengersInfo(newPassengersInfo);
    setShowEditModal(false);
  };

  const handlePaymentMethodSelect = (method: string) => {
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
      if (user?.uid || user?.id) {
        return user.uid || user.id;
      }

      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        return parsedData.uid || parsedData.id;
      }

      if (user?.email) {
        return user.email;
      }

      throw new Error('Impossible de récupérer l\'ID utilisateur');
    } catch (error) {
      console.error('Erreur récupération ID utilisateur:', error);
      return null;
    }
  };

  const confirmReservation = async () => {
    // Vérifier que tous les passagers ont leurs informations remplies
    const allPassengersFilled = passengersInfo.every(passenger => 
      passenger.firstName && passenger.lastName && passenger.email && passenger.phone
    );

    if (!allPassengersFilled) {
      Alert.alert('Erreur', 'Veuillez remplir les informations de tous les passagers');
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de paiement');
      return;
    }

    if (!paymentPhone) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    setIsLoading(true);

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non identifié');
      }

      // Mettre à jour la réservation avec les informations de tous les passagers et le paiement
      await firestore().collection('reservations').doc(reservationId).update({
        userId: userId,
        userEmail: user?.email || '',
        statut: 'en attente de paiement',
        passengersInfo: passengersInfo,
        paymentMethod: selectedPaymentMethod,
        paymentPhone: paymentPhone,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      // Simuler le succès du paiement pour le développement/test
      await handlePaymentSuccess();

      // Ancien code pour NotchPayPayment (mis en commentaire)
      // setShowPayment(true);

    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        'Erreur',
        error.message === 'Utilisateur non identifié' 
          ? 'Vous devez être connecté pour effectuer une réservation.'
          : 'Une erreur est survenue lors du traitement de votre réservation.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non identifié');
      }

      // Mettre à jour le statut de la réservation après paiement réussi
      await firestore().collection('reservations').doc(reservationId).update({
        statut: 'confirmé',
        statutPaiement: 'confirmé',
        confirmedAt: firestore.FieldValue.serverTimestamp()
      });

      // Générer les tickets
      const tickets = passengersInfo.map((passenger, index) => ({
        ...voyageInfo,
        userId: userId,
        userEmail: user?.email || '',
        fullName: `${passenger.firstName} ${passenger.lastName}`,
        email: passenger.email,
        phone: passenger.phone,
        gender: passenger.gender,
        seatType: voyageInfo.seatType,
        seats: [voyageInfo.seats[index]],
        totalPrice: voyageInfo.totalPrice / voyageInfo.numberOfSeats,
        paymentMethod: selectedPaymentMethod,
        paymentPhone: paymentPhone,
        reservationId: `${reservationId}_${index + 1}`
      }));

      // Naviguer vers la page des tickets
      navigation.replace(ROUTES.TICKET, {
        tickets: tickets
      });
    } catch (error) {
      console.error('Erreur lors de la génération des tickets:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la génération des tickets.'
      );
    }
  };

  if (showPayment) {
    return (
      <NotchPayPayment
        amount={voyageInfo.totalPrice}
        email={user?.email || ''}
        description={`Réservation GoExpress - ${voyageInfo.departure} vers ${voyageInfo.destination}`}
        reservationId={reservationId}
        onSuccess={handlePaymentSuccess}
        onError={(error) => {
          console.error('Erreur de paiement:', error);
          Alert.alert(
            'Erreur de paiement',
            'Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer.'
          );
          setShowPayment(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#1d1d1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la réservation</Text>
        <View style={styles.placeholder} />
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.processingText}>Traitement du paiement...</Text>
            <Text style={styles.processingSubtext}>Veuillez patienter</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.content}>
        <Animatable.View animation="fadeInUp" duration={800} style={styles.mainCard}>
          <View style={styles.agencyHeader}>
            <Image
              source={{ uri: voyageInfo.logoUrl }}
              style={styles.agencyLogo}
              defaultSource={{ uri: 'https://via.placeholder.com/60' }}
            />
            <Text style={styles.agencyName}>{voyageInfo.agencyName}</Text>
          </View>

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

          <View style={styles.divider} />

          <View style={styles.priceContainer}>
            <Text style={styles.totalText}>Total à payer</Text>
            <Text style={styles.priceText}>{formatPrice(voyageInfo.totalPrice)}</Text>
          </View>
        </Animatable.View>

        {/* Liste des passagers */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.passengerCard}>
          <Text style={styles.sectionTitle}>Informations des passagers</Text>
          
          {passengersInfo.map((passenger, index) => (
            <View key={index} style={styles.passengerSection}>
              <View style={styles.passengerHeader}>
                <Text style={styles.passengerTitle}>Passager {index + 1}</Text>
                <TouchableOpacity onPress={() => handleEditPassengerInfo(index)}>
                  <Text style={styles.editText}>Modifier</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.passengerInfoContainer}>
                <View style={styles.passengerInfoRow}>
                  <Text style={styles.passengerInfoLabel}>Nom complet</Text>
                  <Text style={styles.passengerInfoValue}>
                    {passenger.firstName} {passenger.lastName}
                  </Text>
                </View>
                <View style={styles.passengerInfoRow}>
                  <Text style={styles.passengerInfoLabel}>Email</Text>
                  <Text style={styles.passengerInfoValue}>{passenger.email}</Text>
                </View>
                <View style={styles.passengerInfoRow}>
                  <Text style={styles.passengerInfoLabel}>Téléphone</Text>
                  <Text style={styles.passengerInfoValue}>{passenger.phone}</Text>
                </View>
                <View style={styles.passengerInfoRow}>
                  <Text style={styles.passengerInfoLabel}>Sexe</Text>
                  <Text style={styles.passengerInfoValue}>{passenger.gender}</Text>
                </View>
              </View>
            </View>
          ))}
        </Animatable.View>

        {/* Modal pour modifier les informations du passager */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Modifier les informations du passager {currentPassengerIndex + 1}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Prénom"
                value={passengersInfo[currentPassengerIndex]?.firstName}
                onChangeText={(text) => {
                  const newPassengersInfo = [...passengersInfo];
                  newPassengersInfo[currentPassengerIndex] = {
                    ...newPassengersInfo[currentPassengerIndex],
                    firstName: text
                  };
                  setPassengersInfo(newPassengersInfo);
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Nom"
                value={passengersInfo[currentPassengerIndex]?.lastName}
                onChangeText={(text) => {
                  const newPassengersInfo = [...passengersInfo];
                  newPassengersInfo[currentPassengerIndex] = {
                    ...newPassengersInfo[currentPassengerIndex],
                    lastName: text
                  };
                  setPassengersInfo(newPassengersInfo);
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={passengersInfo[currentPassengerIndex]?.email}
                onChangeText={(text) => {
                  const newPassengersInfo = [...passengersInfo];
                  newPassengersInfo[currentPassengerIndex] = {
                    ...newPassengersInfo[currentPassengerIndex],
                    email: text
                  };
                  setPassengersInfo(newPassengersInfo);
                }}
              />

              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                value={passengersInfo[currentPassengerIndex]?.phone}
                onChangeText={(text) => {
                  const newPassengersInfo = [...passengersInfo];
                  newPassengersInfo[currentPassengerIndex] = {
                    ...newPassengersInfo[currentPassengerIndex],
                    phone: text
                  };
                  setPassengersInfo(newPassengersInfo);
                }}
              />

              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Sexe:</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      passengersInfo[currentPassengerIndex]?.gender === 'Masculin' && styles.selectedGender
                    ]}
                    onPress={() => {
                      const newPassengersInfo = [...passengersInfo];
                      newPassengersInfo[currentPassengerIndex] = {
                        ...newPassengersInfo[currentPassengerIndex],
                        gender: 'Masculin'
                      };
                      setPassengersInfo(newPassengersInfo);
                    }}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      passengersInfo[currentPassengerIndex]?.gender === 'Masculin' && styles.selectedGenderText
                    ]}>Masculin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      passengersInfo[currentPassengerIndex]?.gender === 'Féminin' && styles.selectedGender
                    ]}
                    onPress={() => {
                      const newPassengersInfo = [...passengersInfo];
                      newPassengersInfo[currentPassengerIndex] = {
                        ...newPassengersInfo[currentPassengerIndex],
                        gender: 'Féminin'
                      };
                      setPassengersInfo(newPassengersInfo);
                    }}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      passengersInfo[currentPassengerIndex]?.gender === 'Féminin' && styles.selectedGenderText
                    ]}>Féminin</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Méthode de paiement */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.paymentCard}>
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

        <View style={styles.confirmButtonContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, isLoading && styles.disabledButton]}
            onPress={confirmReservation}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirmer la réservation</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editText: {
    color: '#007aff',
    fontSize: 14,
  },
  passengerSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  genderContainer: {
    marginBottom: 20,
  },
  genderLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedGender: {
    backgroundColor: '#4169E1',
    borderColor: '#4169E1',
  },
  genderButtonText: {
    color: '#333',
  },
  selectedGenderText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#4169E1',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default PaymentScreen;