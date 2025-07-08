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
  Dimensions,
  Linking
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

// Configuration NotchPay
const NOTCHPAY_CONFIG = {
  apiKey: "pk.4ynuCkosXYPYNkQpQ4Jnw8GcfENZP4XWWgQV64Kun5Qxq2zWebgGhwxqMIOlw3gH7j0PAzoB1YCM2AbDNFiYELVa3ri6H6KWFyKqm0useQQij1JRNL2yIqN84sRrp",
  baseURL: "https://api.notchpay.co",
  merchantAccount: "655783879" // Compte de destination
};

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

interface PaymentData {
  email: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  callback: string;
  metadata: any;
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
  const [paymentReference, setPaymentReference] = useState('');

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

  // Générer une référence unique pour le paiement
  const generatePaymentReference = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    return `GOEXPRESS_${reservationId}_${timestamp}_${randomString}`;
  };

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

  // Validation du numéro de téléphone
  const validatePhoneNumber = (phone: string, method: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    
    if (method === 'OM') {
      // Orange Money: accepter tout numéro de 9 chiffres commençant par 6
      return /^6\d{8}$/.test(cleanPhone);
    } else if (method === 'MOMO') {
      // MTN Mobile Money: commence par 650, 651, 652, 653, 654, 680, 681, 682, 683, 684
      return /^(65[0-4]|68[0-4])\d{6}$/.test(cleanPhone);
    }
    return false;
  };

  // Initialiser le paiement NotchPay
  const initializeNotchPayPayment = async (paymentData: PaymentData) => {
    try {
      console.log('Initialisation du paiement NotchPay:', paymentData);
      
      const response = await fetch(`${NOTCHPAY_CONFIG.baseURL}/payments/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": NOTCHPAY_CONFIG.apiKey,
        },
        body: JSON.stringify({
          ...paymentData,
          // Ajouter les informations spécifiques pour le mobile money
          payment_method: selectedPaymentMethod === 'OM' ? 'orange_money' : 'mtn_momo',
          phone: paymentPhone,
          merchant_account: NOTCHPAY_CONFIG.merchantAccount
        }),
      });

      const result = await response.json();
      console.log('Réponse NotchPay:', result);

      if (result.status && result.authorization_url) {
        return result;
      } else {
        throw new Error(result.message || "Une erreur est survenue lors de l'initialisation du paiement");
      }
    } catch (error) {
      console.error('Erreur initialisation NotchPay:', error);
      throw error;
    }
  };

  // Vérifier le statut du paiement
  const checkPaymentStatus = async (reference: string) => {
    try {
      const response = await fetch(`${NOTCHPAY_CONFIG.baseURL}/payments/${reference}/status`, {
        method: "GET",
        headers: {
          "Authorization": NOTCHPAY_CONFIG.apiKey,
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur vérification statut:', error);
      return null;
    }
  };

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

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    setPaymentPhone('');
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
    // Validation des informations des passagers
    const allPassengersFilled = passengersInfo.every(passenger => 
      passenger.firstName.trim() && 
      passenger.lastName.trim() && 
      passenger.email.trim() && 
      passenger.phone.trim()
    );

    if (!allPassengersFilled) {
      Alert.alert('Erreur', 'Veuillez remplir les informations de tous les passagers');
      return;
    }

    // Validation de la méthode de paiement
    if (!selectedPaymentMethod) {
      Alert.alert('Erreur', 'Veuillez sélectionner une méthode de paiement');
      return;
    }

    // Validation du numéro de téléphone
    if (!paymentPhone.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (!validatePhoneNumber(paymentPhone, selectedPaymentMethod)) {
      const methodName = selectedPaymentMethod === 'OM' ? 'Orange Money' : 'MTN Mobile Money';
      const expectedPrefix = selectedPaymentMethod === 'OM' ? '655-659' : '650-654, 680-684';
      Alert.alert(
        'Numéro invalide', 
        `Le numéro ${methodName} doit commencer par ${expectedPrefix}`
      );
      return;
    }

    // Validation des emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = passengersInfo.filter(passenger => !emailRegex.test(passenger.email));
    if (invalidEmails.length > 0) {
      Alert.alert('Erreur', 'Veuillez entrer des adresses email valides pour tous les passagers');
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non identifié');
      }

      // Générer une référence unique pour le paiement
      const reference = generatePaymentReference();
      setPaymentReference(reference);

      // Mettre à jour la réservation avec les informations complètes
      await firestore().collection('reservations').doc(reservationId).update({
        userId: userId,
        userEmail: user?.email || '',
        statut: 'en attente de paiement',
        passengersInfo: passengersInfo,
        paymentMethod: selectedPaymentMethod,
        paymentPhone: paymentPhone,
        paymentReference: reference,
        paymentStatus: 'pending',
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      // Préparer les données de paiement
      const paymentData: PaymentData = {
        email: user?.email || passengersInfo[0].email,
        amount: voyageInfo.totalPrice,
        currency: "XAF",
        description: `Réservation GoExpress - ${voyageInfo.departure} vers ${voyageInfo.destination}`,
        reference: reference,
        callback: `https://goexpress.app/payment-callback/${reservationId}`,
        metadata: {
          reservationId: reservationId,
          userId: userId,
          numberOfSeats: voyageInfo.numberOfSeats,
          departure: voyageInfo.departure,
          destination: voyageInfo.destination,
          departureDate: voyageInfo.departureDate,
          departureTime: voyageInfo.departureTime,
          paymentMethod: selectedPaymentMethod,
          paymentPhone: paymentPhone,
          passengers: passengersInfo.map(p => `${p.firstName} ${p.lastName}`).join(', ')
        }
      };

      // Initialiser le paiement NotchPay
      const paymentResult = await initializeNotchPayPayment(paymentData);

      if (paymentResult.authorization_url) {
        // Debug : afficher l'URL de paiement
        console.log('URL de paiement reçue:', paymentResult.authorization_url);
        Alert.alert('Debug URL', paymentResult.authorization_url);
        // Ouvrir l'URL de paiement directement
        try {
          await Linking.openURL(paymentResult.authorization_url);
          // Surveiller le statut du paiement
          startPaymentStatusMonitoring(reference);
        } catch (e) {
          throw new Error("Impossible d'ouvrir l'URL de paiement");
        }
      } else {
        throw new Error('URL de paiement non reçue');
      }

    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        'Erreur',
        error.message || 'Une erreur est survenue lors du traitement de votre réservation.'
      );
      setIsProcessing(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Surveiller le statut du paiement
  const startPaymentStatusMonitoring = (reference: string) => {
    const checkStatus = async () => {
      try {
        const statusResult = await checkPaymentStatus(reference);
        
        if (statusResult?.status === 'success') {
          // Paiement réussi
          await handlePaymentSuccess(reference);
          return true;
        } else if (statusResult?.status === 'failed') {
          // Paiement échoué
          await handlePaymentFailure(reference, statusResult.message);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Erreur vérification statut:', error);
        return false;
      }
    };

    // Vérifier toutes les 5 secondes pendant 5 minutes maximum
    const interval = setInterval(async () => {
      const completed = await checkStatus();
      if (completed) {
        clearInterval(interval);
      }
    }, 5000);

    // Arrêter après 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (isProcessing) {
        setIsProcessing(false);
        Alert.alert(
          'Timeout',
          'Le paiement prend plus de temps que prévu. Veuillez vérifier votre compte ou contacter le support.'
        );
      }
    }, 300000); // 5 minutes
  };

  const handlePaymentSuccess = async (reference: string) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non identifié');
      }

      // Mettre à jour le statut de la réservation après paiement réussi
      await firestore().collection('reservations').doc(reservationId).update({
        statut: 'confirmé',
        statutPaiement: 'confirmé',
        paymentStatus: 'success',
        paymentReference: reference,
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
        paymentReference: reference,
        reservationId: `${reservationId}_${index + 1}`,
        ticketId: `TICKET_${reservationId}_${index + 1}_${Date.now()}`
      }));

      setIsProcessing(false);

      // Afficher un message de succès
      Alert.alert(
        'Paiement réussi',
        'Votre réservation a été confirmée avec succès !',
        [
          {
            text: 'Voir mes tickets',
            onPress: () => {
              navigation.replace(ROUTES.TICKET, {
                tickets: tickets
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erreur lors de la génération des tickets:', error);
      setIsProcessing(false);
      Alert.alert(
        'Erreur',
        'Le paiement a réussi mais une erreur est survenue lors de la génération des tickets. Veuillez contacter le support.'
      );
    }
  };

  const handlePaymentFailure = async (reference: string, message: string) => {
    try {
      // Mettre à jour le statut de la réservation
      await firestore().collection('reservations').doc(reservationId).update({
        statut: 'échec paiement',
        statutPaiement: 'échec',
        paymentStatus: 'failed',
        paymentReference: reference,
        paymentErrorMessage: message,
        failedAt: firestore.FieldValue.serverTimestamp()
      });

      setIsProcessing(false);

      Alert.alert(
        'Paiement échoué',
        message || 'Une erreur est survenue lors du paiement. Veuillez réessayer.',
        [
          {
            text: 'Réessayer',
            onPress: () => {
              setSelectedPaymentMethod('');
              setPaymentPhone('');
              setPaymentReference('');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut d\'échec:', error);
      setIsProcessing(false);
    }
  };

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
            <Text style={styles.processingSubtext}>Veuillez confirmer le paiement sur votre téléphone</Text>
            <TouchableOpacity 
              style={styles.cancelPaymentButton}
              onPress={() => {
                setIsProcessing(false);
                Alert.alert('Paiement annulé', 'Vous pouvez réessayer quand vous le souhaitez.');
              }}
            >
              <Text style={styles.cancelPaymentText}>Annuler</Text>
            </TouchableOpacity>
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
                >>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Section paiement */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Méthode de paiement</Text>
          
          <View style={styles.paymentMethodsContainer}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'OM' && styles.selectedPaymentMethod
              ]}
              onPress={() => handlePaymentMethodSelect('OM')}
            >
              <View style={styles.paymentMethodLeft}>
                <View style={styles.paymentMethodIcon}>
                  <MaterialCommunityIcons name="cellphone" size={24} color="#FF6B00" />
                </View>
                <View>
                  <Text style={styles.paymentMethodName}>Orange Money</Text>
                  <Text style={styles.paymentMethodDesc}>655, 656, 657, 658, 659</Text>
                </View>
              </View>
              <View style={styles.radioButton}>
                {selectedPaymentMethod === 'OM' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === 'MOMO' && styles.selectedPaymentMethod
              ]}
              onPress={() => handlePaymentMethodSelect('MOMO')}
            >
              <View style={styles.paymentMethodLeft}>
                <View style={styles.paymentMethodIcon}>
                  <MaterialCommunityIcons name="cellphone" size={24} color="#FFCC00" />
                </View>
                <View>
                  <Text style={styles.paymentMethodName}>MTN Mobile Money</Text>
                  <Text style={styles.paymentMethodDesc}>650, 651, 652, 653, 654, 680-684</Text>
                </View>
              </View>
              <View style={styles.radioButton}>
                {selectedPaymentMethod === 'MOMO' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          </View>

          {selectedPaymentMethod && (
            <Animatable.View animation="fadeInDown" duration={500} style={styles.phoneInputContainer}>
              <Text style={styles.phoneInputLabel}>
                Numéro {selectedPaymentMethod === 'OM' ? 'Orange Money' : 'MTN Mobile Money'}
              </Text>
              <TextInput
                style={styles.phoneInput}
                placeholder={selectedPaymentMethod === 'OM' ? "655XXXXXX" : "650XXXXXX"}
                value={paymentPhone}
                onChangeText={setPaymentPhone}
                keyboardType="phone-pad"
                maxLength={9}
              />
            </Animatable.View>
          )}
        </Animatable.View>

        {/* Section récapitulatif */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trajet</Text>
            <Text style={styles.summaryValue}>
              {voyageInfo.departure} → {voyageInfo.destination}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date et heure</Text>
            <Text style={styles.summaryValue}>
              {formatDate(voyageInfo.departureDate)} à {voyageInfo.departureTime}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Nombre de places</Text>
            <Text style={styles.summaryValue}>{voyageInfo.numberOfSeats}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type de place</Text>
            <Text style={styles.summaryValue}>{voyageInfo.seatType}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Numéros de place</Text>
            <Text style={styles.summaryValue}>
              {voyageInfo.seats.map(seat => seat.number).join(', ')}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelTotal}>Total à payer</Text>
            <Text style={styles.summaryValueTotal}>{formatPrice(voyageInfo.totalPrice)}</Text>
          </View>
        </Animatable.View>
      </ScrollView>

      {/* Bouton de confirmation */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isLoading && styles.disabledButton
          ]}
          onPress={confirmReservation}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              Confirmer et payer {formatPrice(voyageInfo.totalPrice)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  agencyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  departureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007aff',
  },
  routeDivider: {
    width: 30,
    height: 2,
    backgroundColor: '#007aff',
    marginHorizontal: 8,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1,
    textAlign: 'right',
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
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  seatsInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatTypeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  seatsNumberContainer: {
    alignItems: 'flex-end',
  },
  seatsNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  seatsNumbers: {
    fontSize: 12,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007aff',
  },
  passengerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 16,
  },
  passengerSection: {
    marginBottom: 16,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  editText: {
    fontSize: 14,
    color: '#007aff',
  },
  passengerInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  passengerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  passengerInfoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  passengerInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d1d1f',
    flex: 2,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  genderContainer: {
    marginBottom: 20,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  selectedGender: {
    backgroundColor: '#007aff',
    borderColor: '#007aff',
  },
  genderButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  selectedGenderText: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#007aff',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  saveButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodsContainer: {
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    borderColor: '#007aff',
    backgroundColor: '#f0f8ff',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007aff',
  },
  phoneInputContainer: {
    marginTop: 16,
  },
  phoneInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1d1d1f',
    flex: 1,
    textAlign: 'right',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1,
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007aff',
    flex: 1,
    textAlign: 'right',
  },
  bottomContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#007aff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d1d1f',
    marginTop: 12,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  cancelPaymentButton: {
    marginTop: 16,
    padding: 8,
  },
  cancelPaymentText: {
    fontSize: 14,
    color: '#ff3b30',
  },
});

export default PaymentScreen;