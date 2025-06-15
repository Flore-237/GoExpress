import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
  StatusBar,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import firestore from '@react-native-firebase/firestore';
import * as Animatable from 'react-native-animatable';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { ViewShotProperties, captureRef } from 'react-native-view-shot';
import { ROUTES } from '../constants/routes';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import LinearGradient from 'react-native-linear-gradient';
import { getAgencyLogo } from '../utils/agencyUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width, height } = Dimensions.get('window');

// Types pour les paramètres de route
type RootStackParamList = {
  Ticket: {
    ticketData?: {
      agencyName: string;
      logoUrl: string;
      departure: string;
      destination: string;
      departureTime: string;
      departureDate: string;
      seatType: string;
      numberOfSeats: number;
      totalPrice: number;
      seats: Array<{ number: string }>;
      fullName: string;
      email: string;
      phone: string;
      gender: string;
      reservationId: string;
      paymentMethod: string;
      confirmedAt: Date;
    };
    tickets?: Array<{
      agencyName: string;
      logoUrl: string;
      departure: string;
      destination: string;
      departureTime: string;
      departureDate: string;
      seatType: string;
      numberOfSeats: number;
      totalPrice: number;
      seats: Array<{ number: string }>;
      fullName: string;
      email: string;
      phone: string;
      gender: string;
      reservationId: string;
      paymentMethod: string;
    }>;
    reservationId?: string;
  };
};

type TicketScreenRouteProp = RouteProp<RootStackParamList, 'Ticket'>;

// Types pour les données utilisateur
interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const TicketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<TicketScreenRouteProp>();
  const { user } = useAuth();
  const viewShotRef = useRef<ViewShot>(null);
  
  const { ticketData, tickets, reservationId } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  
  // État pour les données du ticket
  const [ticket, setTicket] = useState({
    agencyName: '',
    logoUrl: '',
    departure: '',
    destination: '',
    departureTime: '',
    departureDate: '',
    seatType: '',
    numberOfSeats: 0,
    totalPrice: 0,
    seats: [] as Array<{ number: string }>,
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    reservationId: '',
    paymentMethod: '',
    confirmedAt: null as Date | null,
    qrData: '',
    ticketNumber: ''
  });

  // Récupération des données de réservation
  useEffect(() => {
    const fetchTicketData = async () => {
      if (tickets && tickets.length > 0) {
        const currentTicket = tickets[currentTicketIndex];
        setTicket({
          agencyName: currentTicket.agencyName || 'Agence inconnue',
          logoUrl: currentTicket.logoUrl || 'https://via.placeholder.com/60',
          departure: currentTicket.departure || '',
          destination: currentTicket.destination || '',
          departureTime: currentTicket.departureTime || '',
          departureDate: currentTicket.departureDate || '',
          seatType: currentTicket.seatType || '',
          numberOfSeats: currentTicket.numberOfSeats || currentTicket.seats?.length || 0,
          totalPrice: currentTicket.totalPrice || 0,
          seats: currentTicket.seats || [],
          fullName: currentTicket.fullName || '',
          email: currentTicket.email || '',
          phone: currentTicket.phone || '',
          gender: currentTicket.gender || '',
          reservationId: currentTicket.reservationId || '',
          paymentMethod: currentTicket.paymentMethod || '',
          confirmedAt: new Date(),
          qrData: `TICKET-${currentTicket.reservationId}-${Date.now()}`,
          ticketNumber: `TK${currentTicket.reservationId.slice(-6).toUpperCase()}`
        });
        setIsLoading(false);
      } else if (ticketData) {
        const userData = user as UserData | null;
        setTicket({
          agencyName: ticketData.agencyName || 'Agence inconnue',
          logoUrl: ticketData.logoUrl || 'https://via.placeholder.com/60',
          departure: ticketData.departure || '',
          destination: ticketData.destination || '',
          departureTime: ticketData.departureTime || '',
          departureDate: ticketData.departureDate || '',
          seatType: ticketData.seatType || '',
          numberOfSeats: ticketData.numberOfSeats || ticketData.seats?.length || 0,
          totalPrice: ticketData.totalPrice || 0,
          seats: ticketData.seats || [],
          fullName: ticketData.fullName || `${userData?.firstName || ''} ${userData?.lastName || ''}`,
          email: ticketData.email || userData?.email || '',
          phone: ticketData.phone || userData?.phone || '',
          gender: ticketData.gender || '',
          reservationId: ticketData.reservationId || reservationId || '',
          paymentMethod: ticketData.paymentMethod || '',
          confirmedAt: ticketData.confirmedAt || new Date(),
          qrData: `TICKET-${ticketData.reservationId || reservationId}-${Date.now()}`,
          ticketNumber: `TK${(ticketData.reservationId || reservationId || '').slice(-6).toUpperCase()}`
        });
        setIsLoading(false);
      } else if (reservationId) {
        const unsubscribe = firestore()
          .collection('reservations')
          .doc(reservationId)
          .onSnapshot(doc => {
            if (doc.exists) {
              const data = doc.data();
              const userData = user as UserData | null;
              setTicket({
                agencyName: data?.nomAgence || 'Agence inconnue',
                logoUrl: data?.logoAgence || 'https://via.placeholder.com/60',
                departure: data?.villeDepart || data?.departure || '',
                destination: data?.villeArrivee || data?.destination || '',
                departureTime: data?.heureDepart || '',
                departureDate: data?.dateVoyage || data?.departureDate || '',
                seatType: data?.seatType || data?.typePlace || '',
                numberOfSeats: data?.numberOfSeats || data?.seats?.length || 0,
                totalPrice: data?.prixTotal || data?.totalPrice || 0,
                seats: data?.seats || [],
                fullName: data?.passengerInfo ? 
                  `${data.passengerInfo.firstName || ''} ${data.passengerInfo.lastName || ''}` :
                  `${userData?.firstName || ''} ${userData?.lastName || ''}`,
                email: data?.passengerInfo?.email || userData?.email || '',
                phone: data?.paymentPhone || data?.passengerInfo?.phone || userData?.phone || '',
                gender: data?.passengerInfo?.gender || '',
                reservationId: reservationId,
                paymentMethod: data?.paymentMethod || '',
                confirmedAt: data?.confirmedAt?.toDate() || new Date(),
                qrData: `TICKET-${reservationId}-${Date.now()}`,
                ticketNumber: `TK${reservationId.slice(-6).toUpperCase()}`
              });
              setIsLoading(false);
            }
          });

        return () => unsubscribe();
      }
    };

    fetchTicketData();
  }, [ticketData, tickets, reservationId, currentTicketIndex, user]);

  // Formatage de la date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'd MMMM yyyy', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  // Formatage du prix
  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `${Number(numPrice).toLocaleString('fr-FR')} FCFA`;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Permission de stockage",
            message: "L'application a besoin d'accéder à votre stockage pour sauvegarder le ticket.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const saveTicketToGallery = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission refusée', 'Impossible de sauvegarder le ticket sans permission de stockage.');
        return;
      }

      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        const timestamp = new Date().getTime();
        const fileName = `ticket_${timestamp}.png`;
        const filePath = `${RNFS.PicturesDirectoryPath}/${fileName}`;

        await RNFS.copyFile(uri, filePath);
        Alert.alert('Succès', 'Ticket sauvegardé dans la galerie');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le ticket');
    }
  };

  const shareTicket = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        await Share.open({
          url: uri,
          type: 'image/png',
          title: 'Partager le ticket',
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le ticket');
    }
  };

  const handleNextTicket = () => {
    if (tickets && currentTicketIndex < tickets.length - 1) {
      setCurrentTicketIndex(currentTicketIndex + 1);
    }
  };

  const handlePreviousTicket = () => {
    if (currentTicketIndex > 0) {
      setCurrentTicketIndex(currentTicketIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Chargement du billet...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
      
      <LinearGradient
        colors={['#4169E1', '#5A7BF0']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Billet {tickets ? `${currentTicketIndex + 1}/${tickets.length}` : ''}
          </Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <ViewShot ref={viewShotRef} style={styles.ticketContainer}>
          <View style={styles.ticket}>
            <View style={styles.ticketHeader}>
              <Image
                source={getAgencyLogo(ticket.reservationId.split('-')[0])}
                style={styles.agencyLogo}
                defaultSource={require('../assets/images/GoExpress.png')}
              />
              <Text style={styles.agencyName}>{ticket.agencyName}</Text>
              <Text style={styles.ticketNumber}>Billet N° {ticket.ticketNumber}</Text>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeInfo}>
                <Text style={styles.cityName}>{ticket.departure}</Text>
                <View style={styles.directionContainer}>
                  <Icon name="arrow-forward" size={24} color="#1976D2" />
                </View>
                <Text style={styles.cityName}>{ticket.destination}</Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  {formatDate(ticket.departureDate)} à {ticket.departureTime}
                </Text>
              </View>
              <View style={styles.dateTimeContainer}>
                <Text style={styles.dateTimeText}>
                  Méthode de paiement : {ticket.paymentMethod === 'OM' ? 'Orange Money' : ticket.paymentMethod === 'MoMo' ? 'Mobile Money' : ticket.paymentMethod}
                </Text>
              </View>
            </View>

            <View style={styles.seatInfoContainer}>
              <Text style={styles.seatInfoTitle}>Détails des places</Text>
              <View style={styles.seatDetails}>
                <Text style={styles.seatType}>{ticket.seatType}</Text>
                <Text style={styles.seatNumbers}>
                  Places: {ticket.seats.map(seat => seat.number).join(', ')}
                </Text>
              </View>
            </View>

            <View style={styles.passengerInfoContainer}>
              <Text style={styles.passengerInfoTitle}>Informations Passager</Text>
              <View style={styles.passengerDetails}>
                <Text style={styles.passengerName}>{ticket.fullName}</Text>
                <Text style={styles.passengerContact}>{ticket.email}</Text>
                <Text style={styles.passengerContact}>{ticket.phone}</Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={ticket.qrData}
                size={120}
                color="#1976D2"
                backgroundColor="white"
              />
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Prix total</Text>
              <Text style={styles.priceValue}>{formatPrice(ticket.totalPrice)}</Text>
            </View>
          </View>
        </ViewShot>

        {tickets && tickets.length > 1 && (
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, currentTicketIndex === 0 && styles.disabledButton]}
              onPress={handlePreviousTicket}
              disabled={currentTicketIndex === 0}
            >
              <Icon name="chevron-back" size={24} color={currentTicketIndex === 0 ? '#ccc' : '#1976D2'} />
              <Text style={[styles.navButtonText, currentTicketIndex === 0 && styles.disabledButtonText]}>
                Précédent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, currentTicketIndex === tickets.length - 1 && styles.disabledButton]}
              onPress={handleNextTicket}
              disabled={currentTicketIndex === tickets.length - 1}
            >
              <Text style={[styles.navButtonText, currentTicketIndex === tickets.length - 1 && styles.disabledButtonText]}>
                Suivant
              </Text>
              <Icon name="chevron-forward" size={24} color={currentTicketIndex === tickets.length - 1 ? '#ccc' : '#1976D2'} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={saveTicketToGallery}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="download-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Sauvegarder</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={shareTicket}
          >
            <Icon name="share-social-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    backgroundColor: '#1976D2',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  ticketContainer: {
    padding: 15,
  },
  ticket: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  agencyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  agencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 5,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#666',
  },
  routeContainer: {
    marginBottom: 20,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  directionContainer: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 20,
  },
  dateTimeContainer: {
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
  },
  seatInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  seatInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  seatDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatType: {
    fontSize: 14,
    color: '#666',
  },
  seatNumbers: {
    fontSize: 14,
    color: '#666',
  },
  passengerInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  passengerInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  passengerDetails: {
    gap: 5,
  },
  passengerName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  passengerContact: {
    fontSize: 14,
    color: '#666',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 150,
    justifyContent: 'center',
  },
  downloadButton: {
    backgroundColor: '#1976D2',
  },
  shareButton: {
    backgroundColor: '#4169E1',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  navButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  navButtonText: {
    color: '#4169E1',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#CCC',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#ccc',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default TicketScreen;