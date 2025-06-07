import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Share,
  Image
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import RNFetchBlob from 'rn-fetch-blob';
import ViewShot from 'react-native-view-shot';
import Mailer from 'react-native-mail';
import { ROUTES } from '../App';

const TicketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const viewShotRef = React.useRef();
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(null);

  // Récupérer les données avec des valeurs par défaut
  const { ticketData = {}, reservationId } = route.params || {};

  console.log('Données reçues dans TicketScreen:', { ticketData, reservationId });

  // Créer les tickets individuels à partir des données
  const createTicketsFromData = () => {
    if (!ticketData.passengers || ticketData.passengers.length === 0) {
      return [{
        reservationId: ticketData.reservationId || reservationId || 'N/A',
        fullName: ticketData.fullName || 'N/A',
        email: ticketData.email || 'N/A',
        phone: ticketData.phone || 'N/A',
        pieceIdentite: ticketData.pieceIdentite || 'N/A',
        placeNumber: ticketData.seatLabel || ticketData.placeNumber || 'N/A',
        typePlace: ticketData.seatType || 'Classique',
        prixTotal: ticketData.totalPrice || ticketData.pricePerSeat || 0
      }];
    }

    return ticketData.passengers.map((passenger, index) => ({
      reservationId: ticketData.reservationId || reservationId || 'N/A',
      fullName: passenger.fullName || 'N/A',
      email: passenger.email || 'N/A',
      phone: passenger.phone || 'N/A',
      pieceIdentite: passenger.pieceIdentite || 'N/A',
      placeNumber: passenger.seatLabel || `Siège ${index + 1}`,
      typePlace: ticketData.seatType || 'Classique',
      prixTotal: ticketData.pricePerSeat || (ticketData.totalPrice / ticketData.passengers.length) || 0
    }));
  };

  const tickets = createTicketsFromData();

  // Données du voyage normalisées
  const voyageData = {
    departure: ticketData.departure || 'Ville inconnue',
    destination: ticketData.destination || 'Ville inconnue',
    dateDepart: ticketData.departureDate || new Date().toISOString(),
    departureTime: ticketData.departureTime || 'N/A',
    agencyName: ticketData.agencyName || 'Agence inconnue',
    agencyLogo: 'assets/images/logo.png'
  };

  console.log('Tickets créés:', tickets);
  console.log('Données voyage:', voyageData);

  const handleGoToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN_TABS }],
    });
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
    if (!price) return '0 FCFA';
    return `${Number(price).toLocaleString('fr-FR')} FCFA`;
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          return true;
        }
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Permission de stockage",
            message: "L'application a besoin d'accéder au stockage pour enregistrer votre ticket.",
            buttonNeutral: "Demander plus tard",
            buttonNegative: "Annuler",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error("Erreur de permission:", err);
        return false;
      }
    }
    return true;
  };

  const captureTicket = async (ticketIndex = null) => {
    try {
      if (!viewShotRef.current) {
        throw new Error('Référence ViewShot non disponible');
      }

      const uri = await viewShotRef.current.capture();
      return uri;
    } catch (error) {
      console.error('Erreur capture:', error);
      throw error;
    }
  };

  const downloadSingleTicket = async (ticketIndex) => {
    try {
      setLoading(true);
      setSelectedTicketIndex(ticketIndex);

      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission refusée', 'Impossible de télécharger sans permission de stockage');
        return;
      }

      const uri = await captureTicket(ticketIndex);
      const ticket = tickets[ticketIndex] || {};
      const fileName = `ticket_${ticket.reservationId || ticketIndex}_${new Date().getTime()}.png`;
      
      const { dirs } = RNFetchBlob.fs;
      let filePath;
      
      if (Platform.OS === 'ios') {
        filePath = `${dirs.DocumentDir}/${fileName}`;
      } else {
        filePath = `${dirs.DownloadDir}/${fileName}`;
      }
      
      await RNFetchBlob.fs.writeFile(
        filePath, 
        uri.replace('data:image/png;base64,', ''), 
        'base64'
      );
      
      if (Platform.OS === 'ios') {
        await Share.share({
          url: `file://${filePath}`,
          title: 'Ticket de voyage'
        });
      } else {
        Alert.alert(
          'Succès',
          `Ticket téléchargé avec succès dans le dossier Téléchargements`,
          [
            {
              text: 'Ouvrir',
              onPress: () => {
                RNFetchBlob.android.actionViewIntent(filePath, 'image/png')
                  .catch(() => console.log('Impossible d\'ouvrir le fichier'));
              }
            },
            { text: 'OK' }
          ]
        );
      }
      
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      Alert.alert(
        'Erreur', 
        'Impossible de télécharger le ticket. Vérifiez les permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setSelectedTicketIndex(null);
    }
  };

  const downloadAllTickets = async () => {
    try {
      setLoading(true);
      
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission refusée', 'Impossible de télécharger sans permission de stockage');
        return;
      }

      for (let i = 0; i < tickets.length; i++) {
        await downloadSingleTicket(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      Alert.alert('Succès', `${tickets.length} ticket(s) téléchargé(s) avec succès`);
      
    } catch (error) {
      console.error('Erreur téléchargement multiple:', error);
      Alert.alert('Erreur', 'Erreur lors du téléchargement des tickets');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailWithTicket = async (ticketIndex = null) => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setLoading(true);
      
      const uri = await captureTicket(ticketIndex);
      const ticket = ticketIndex !== null ? tickets[ticketIndex] : tickets[0];
      const fileName = `ticket_${ticket.reservationId || 'voyage'}_${new Date().getTime()}.png`;
      
      const { dirs } = RNFetchBlob.fs;
      const filePath = `${dirs.CacheDir}/${fileName}`;
      
      await RNFetchBlob.fs.writeFile(
        filePath, 
        uri.replace('data:image/png;base64,', ''), 
        'base64'
      );
      
      const subject = ticketIndex !== null 
        ? `Votre billet de voyage ${voyageData.departure} - ${voyageData.destination}`
        : `Vos billets de voyage ${voyageData.departure} - ${voyageData.destination}`;
        
      const body = `Bonjour,<br><br>Voici votre${ticketIndex !== null ? '' : 's'} billet${ticketIndex !== null ? '' : 's'} pour le voyage de ${voyageData.departure} à ${voyageData.destination} prévu le ${formatDate(voyageData.dateDepart)} à ${voyageData.departureTime}.<br><br>Bon voyage!`;

      Mailer.mail({
        subject,
        recipients: [email],
        body,
        isHTML: true,
        attachment: {
          path: filePath,
          type: 'png',
          name: fileName
        }
      }, (error, event) => {
        setLoading(false);
        setEmailModalVisible(false);
        setEmail('');
        
        if (error) {
          console.error('Erreur mail:', error);
          Alert.alert(
            'Erreur d\'envoi', 
            'Impossible d\'envoyer l\'email. Vérifiez qu\'une application mail est configurée.',
            [
              {
                text: 'Télécharger à la place',
                onPress: () => ticketIndex !== null ? downloadSingleTicket(ticketIndex) : downloadAllTickets()
              },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Succès', 'Email envoyé avec succès!');
        }
      });
      
    } catch (error) {
      console.error('Erreur préparation email:', error);
      setLoading(false);
      Alert.alert('Erreur', 'Impossible de préparer l\'email');
    }
  };

  const handleShare = async () => {
    try {
      const uri = await captureTicket();
      
      if (Platform.OS === 'ios') {
        await Share.share({
          url: uri,
          title: 'Ticket de voyage'
        });
      } else {
        const fileName = `ticket_${new Date().getTime()}.png`;
        const { dirs } = RNFetchBlob.fs;
        const filePath = `${dirs.CacheDir}/${fileName}`;
        
        await RNFetchBlob.fs.writeFile(
          filePath, 
          uri.replace('data:image/png;base64,', ''), 
          'base64'
        );
        
        await Share.share({
          url: `file://${filePath}`,
          title: 'Ticket de voyage'
        });
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le billet');
    }
  };

  const renderSingleTicket = (ticket, index) => {
    if (!ticket) return null;

    return (
      <View key={`ticket-${index}`} style={styles.ticketContainer}>
        
        {/* Header moderne avec dégradé bleu */}
        <View style={styles.ticketHeader}>
          <View style={styles.headerGradient}>
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="airplane" size={24} color="#ffffff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.eTicketTitle}>E-BILLET</Text>
                <Text style={styles.companyName}>{voyageData.agencyName}</Text>
              </View>
            </View>
            <View style={styles.referenceBox}>
              <Text style={styles.refLabel}>REF</Text>
              <Text style={styles.refNumber}>{ticket.reservationId}</Text>
            </View>
          </View>
          
          {/* Perforations décoratives */}
          <View style={styles.perforations}>
            {[...Array(12)].map((_, i) => (
              <View key={i} style={styles.perforation} />
            ))}
          </View>
        </View>

        {/* Section voyage avec design moderne */}
        <View style={styles.journeySection}>
          <View style={styles.journeyCard}>
            <View style={styles.routeContainer}>
              <View style={styles.cityContainer}>
                <View style={styles.cityCodeContainer}>
                  <Text style={styles.cityCode}>{voyageData.departure.substring(0, 3).toUpperCase()}</Text>
                </View>
                <Text style={styles.cityName}>{voyageData.departure}</Text>
                <Text style={styles.locationLabel}>DÉPART</Text>
              </View>
              
              <View style={styles.routeLineContainer}>
                <View style={styles.routeDotStart} />
                <View style={styles.routePath}>
                  <MaterialCommunityIcons name="airplane" size={16} color="#3498db" style={styles.airplaneIcon} />
                </View>
                <View style={styles.routeDotEnd} />
              </View>
              
              <View style={styles.cityContainer}>
                <View style={styles.cityCodeContainer}>
                  <Text style={styles.cityCode}>{voyageData.destination.substring(0, 3).toUpperCase()}</Text>
                </View>
                <Text style={styles.cityName}>{voyageData.destination}</Text>
                <Text style={styles.locationLabel}>ARRIVÉE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Informations passager avec design carte */}
        <View style={styles.passengerSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-circle-outline" size={20} color="#3498db" />
            <Text style={styles.sectionTitle}>Informations du passager</Text>
          </View>
          
          <View style={styles.passengerCard}>
            <View style={styles.passengerRow}>
              <View style={styles.passengerField}>
                <Text style={styles.fieldLabel}>NOM COMPLET</Text>
                <Text style={styles.fieldValue}>{ticket.fullName}</Text>
              </View>
              <View style={styles.passengerField}>
                <Text style={styles.fieldLabel}>SIÈGE</Text>
                <Text style={[styles.fieldValue, styles.seatNumber]}>{ticket.placeNumber}</Text>
              </View>
            </View>
            
            <View style={styles.passengerRow}>
              <View style={styles.passengerField}>
                <Text style={styles.fieldLabel}>CONTACT</Text>
                <Text style={styles.fieldValue}>{ticket.phone}</Text>
              </View>
              <View style={styles.passengerField}>
                <Text style={styles.fieldLabel}>CLASSE</Text>
                <Text style={styles.fieldValue}>{ticket.typePlace}</Text>
              </View>
            </View>
            
            <View style={styles.passengerRowFull}>
              <Text style={styles.fieldLabel}>PIÈCE D'IDENTITÉ</Text>
              <Text style={styles.fieldValue}>{ticket.pieceIdentite}</Text>
            </View>
          </View>
        </View>

        {/* Détails du voyage en grille moderne */}
        <View style={styles.tripDetailsSection}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <View style={styles.detailIconContainer}>
                <MaterialCommunityIcons name="calendar-month" size={20} color="#e74c3c" />
              </View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(voyageData.dateDepart)}</Text>
            </View>
            
            <View style={styles.detailCard}>
              <View style={styles.detailIconContainer}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#f39c12" />
              </View>
              <Text style={styles.detailLabel}>Heure</Text>
              <Text style={styles.detailValue}>{voyageData.departureTime}</Text>
            </View>
          </View>
        </View>

        {/* Prix dans une section dédiée */}
        <View style={styles.priceSection}>
          <View style={styles.priceCard}>
            <MaterialCommunityIcons name="credit-card-outline" size={24} color="#27ae60" />
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>TARIF TOTAL</Text>
              <Text style={styles.priceAmount}>{formatPrice(ticket.prixTotal)}</Text>
            </View>
          </View>
        </View>

        {/* QR Code avec design moderne */}
        <View style={styles.qrSection}>
          <Text style={styles.qrTitle}>Code de validation</Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({
                ref: ticket.reservationId,
                name: ticket.fullName,
                seat: ticket.placeNumber,
                voyage: `${voyageData.departure}-${voyageData.destination}`,
                date: voyageData.dateDepart,
                time: voyageData.departureTime
              })}
              size={100}
              backgroundColor="white"
              color="#2c3e50"
            />
          </View>
          <Text style={styles.qrSubtitle}>Présentez ce code à l'embarquement</Text>
        </View>

        {/* Note importante avec design moderne */}
        <View style={styles.importantNotice}>
          <View style={styles.noticeHeader}>
            <MaterialCommunityIcons name="information-outline" size={18} color="#e67e22" />
            <Text style={styles.noticeTitle}>Important</Text>
          </View>
          <Text style={styles.noticeText}>
            Arrivée recommandée 30 minutes avant le départ. Munissez-vous d'une pièce d'identité valide.
          </Text>
        </View>

        {/* Actions individuelles avec design moderne */}
        <View style={styles.ticketActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.downloadBtn]} 
            onPress={() => downloadSingleTicket(index)}
            disabled={loading && selectedTicketIndex === index}
          >
            {loading && selectedTicketIndex === index ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="download" size={18} color="#fff" />
            )}
            <Text style={styles.actionBtnText}>Télécharger</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.shareBtn]} 
            onPress={() => {
              setSelectedTicketIndex(index);
              setEmailModalVisible(true);
            }}
            disabled={loading}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Partager</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={emailModalVisible}
      onRequestClose={() => {
        setEmailModalVisible(false);
        setSelectedTicketIndex(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Envoyer par email</Text>
            <TouchableOpacity 
              onPress={() => {
                setEmailModalVisible(false);
                setSelectedTicketIndex(null);
              }}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubtitle}>
            {selectedTicketIndex !== null 
              ? `Billet n°${selectedTicketIndex + 1}`
              : 'Tous les billets'
            }
          </Text>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#3498db" />
            <TextInput
              style={styles.emailInput}
              placeholder="Adresse email"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.cancelBtn]} 
              onPress={() => {
                setEmailModalVisible(false);
                setSelectedTicketIndex(null);
                setEmail('');
              }}
            >
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.sendBtn]} 
              onPress={() => sendEmailWithTicket(selectedTicketIndex)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
         </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header moderne */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoToHome} style={styles.headerBtn}>
          <MaterialCommunityIcons name="home-outline" size={24} color="#3498db" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vos Billets</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <MaterialCommunityIcons name="share-variant-outline" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>

      {/* Overlay de chargement */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Traitement en cours...</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Message de confirmation moderne */}
        <View style={styles.successBanner}>
          <View style={styles.successIconContainer}>
            <MaterialCommunityIcons name="check-circle" size={32} color="#27ae60" />
          </View>
          <View style={styles.successContent}>
            <Text style={styles.successTitle}>Réservation Confirmée</Text>
            <Text style={styles.successMessage}>Vos billets sont prêts pour le voyage</Text>
          </View>
        </View>

        {/* Conteneur des tickets */}
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.ticketsWrapper}>
            {tickets.map((ticket, index) => (
              <View key={`ticket-wrapper-${index}`}>
                {renderSingleTicket(ticket, index)}
                {index < tickets.length - 1 && <View style={styles.ticketDivider} />}
              </View>
            ))}
          </View>
        </ViewShot>

        {/* Actions globales pour plusieurs tickets */}
        {tickets.length > 1 && (
          <View style={styles.globalActions}>
            <Text style={styles.globalTitle}>Actions groupées</Text>
            <View style={styles.globalBtns}>
              <TouchableOpacity 
                style={[styles.globalBtn, styles.downloadAllBtn]} 
                onPress={downloadAllTickets}
                disabled={loading}
              >
                <MaterialCommunityIcons name="download-multiple" size={20} color="#fff" />
                <Text style={styles.globalBtnText}>Télécharger tout</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.globalBtn, styles.emailAllBtn]} 
                onPress={() => {
                  setSelectedTicketIndex(null);
                  setEmailModalVisible(true);
                }}
                disabled={loading}
              >
                <MaterialCommunityIcons name="email-multiple-outline" size={20} color="#fff" />
                <Text style={styles.globalBtnText}>Envoyer tout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bouton retour fixe */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.homeButton} onPress={handleGoToHome}>
          <MaterialCommunityIcons name="home" size={20} color="#fff" />
          <Text style={styles.homeButtonText}>Retour Accueil</Text>
        </TouchableOpacity>
      </View>

      {renderEmailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderLeftWidth: 5,
    borderLeftColor: '#27ae60',
  },
  successIconContainer: {
    marginRight: 16,
    padding: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 50,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 15,
    color: '#64748b',
  },
  ticketsWrapper: {
    marginBottom: 20,
  },
  ticketContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  ticketHeader: {
    position: 'relative',
  },
  headerGradient: {
    backgroundColor: '#3498db',
    backgroundImage: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
    logoContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  eTicketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  referenceBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  refNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  perforations: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  perforation: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  journeySection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  journeyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityContainer: {
    alignItems: 'center',
    flex: 1,
  },
  cityCodeContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cityCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3498db',
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  routeLineContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  routeDotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
    marginBottom: 4,
  },
  routePath: {
    width: 80,
    height: 2,
    backgroundColor: '#cbd5e1',
    position: 'relative',
  },
  airplaneIcon: {
    position: 'absolute',
    left: '50%',
    top: -8,
    transform: [{ rotate: '90deg' }],
  },
  routeDotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    marginTop: 4,
  },
  passengerSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  passengerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  passengerRowFull: {
    marginBottom: 0,
  },
  passengerField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  seatNumber: {
    color: '#3498db',
    fontWeight: '700',
  },
  tripDetailsSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  priceSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  priceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priceInfo: {
    marginLeft: 16,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#27ae60',
  },
  qrSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  importantNotice: {
    backgroundColor: '#fff9f0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e67e22',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 13,
    color: '#854d0e',
    lineHeight: 20,
  },
  ticketActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '48%',
  },
  downloadBtn: {
    backgroundColor: '#3498db',
  },
  shareBtn: {
    backgroundColor: '#10b981',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 24,
  },
  globalActions: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  globalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  globalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  globalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '48%',
  },
  downloadAllBtn: {
    backgroundColor: '#3b82f6',
  },
  emailAllBtn: {
    backgroundColor: '#8b5cf6',
  },
  globalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  homeButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
  },
  sendBtn: {
    backgroundColor: '#3498db',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
});

export default TicketScreen;