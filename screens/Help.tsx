import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLORS } from '../constants/colors';

const Help = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('faq'); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [ticketId, setTicketId] = useState('');
  const [ticketStatus, setTicketStatus] = useState(null);
  const [categoryType, setCategoryType] = useState('Réservation');
  const [submitted, setSubmitted] = useState(false);
  const [userId, setUserId] = useState(null);

  const categories = [
    'Réservation', 
    'Paiement', 
    'Annulation', 
    'Modification de réservation',
    'Problème technique',
    'Autre'
  ];

  const faqList = [
    {
      id: 1,
      question: 'Comment réserver un billet de bus ?',
      answer: 'Pour réserver un billet de bus, vous pouvez soit choisir une agence dans la liste des agences disponibles, soit effectuer une recherche en fonction de votre itinéraire. Suivez ensuite les étapes pour sélectionner votre voyage, choisir votre type de siège (VIP ou Classique), et procéder au paiement.'
    },
    {
      id: 2,
      question: 'Quels modes de paiement sont acceptés ?',
      answer: 'Notre application accepte les paiements via Mobile Money et Orange Money. Assurez-vous que votre compte est actif et dispose de suffisamment de fonds pour effectuer la transaction.'
    },
    {
      id: 3,
      question: 'Comment puis-je annuler ma réservation ?',
      answer: 'Pour annuler une réservation, accédez à la section "Mes Réservations" dans votre profil, sélectionnez la réservation que vous souhaitez annuler, puis suivez les instructions. Veuillez noter que des frais d\'annulation peuvent s\'appliquer selon la politique de l\'agence et le délai avant le départ.'
    },
    {
      id: 4,
      question: 'Comment récupérer mon ticket ?',
      answer: 'Une fois votre réservation confirmée et payée, vous recevrez votre ticket par e-mail et/ou SMS selon vos préférences. Vous pouvez également consulter et télécharger vos tickets dans la section "Mes Tickets" de votre profil.'
    },
    {
      id: 5,
      question: 'Que faire si je n\'ai pas reçu mon ticket ?',
      answer: 'Si vous n\'avez pas reçu votre ticket après le paiement, vérifiez d\'abord votre dossier de spam/courrier indésirable. Si vous ne le trouvez pas, accédez à la section "Mes Réservations" pour voir si votre réservation est confirmée. Vous pouvez également nous contacter via le formulaire de contact en précisant les détails de votre problème.'
    },
    {
      id: 6,
      question: 'Comment modifier mes informations de contact ?',
      answer: 'Pour modifier vos informations personnelles, accédez à la section "Profil" depuis le menu principal. Vous pourrez y mettre à jour votre nom, adresse e-mail, numéro de téléphone et autres informations personnelles.'
    },
    {
      id: 7,
      question: 'Les prix incluent-ils les bagages ?',
      answer: 'Les politiques concernant les bagages varient selon les agences. Généralement, un bagage à main et un bagage enregistré standard sont inclus dans le prix du billet. Pour plus de détails, veuillez consulter les conditions spécifiques de l\'agence lors de votre réservation.'
    }
  ];

  useEffect(() => {
    setFaqs(faqList);
    const currentUser = auth().currentUser;
    if (currentUser) {
      setUserId(currentUser.uid);
      setEmail(currentUser.email || '');
      
      firestore().collection('users').doc(currentUser.uid).get()
        .then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            setName(userData.name || '');
          }
        })
        .catch(error => {
          console.error("Erreur lors de la récupération des données utilisateur :", error);
        });
    }
  }, []);

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleContactSubmit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide.');
      return;
    }

    setLoading(true);
    
    try {
      const supportTicketId = `support_${Date.now().toString(36)}`;
      
      await firestore().collection('support_tickets').doc(supportTicketId).set({
        name,
        email,
        category: categoryType,
        subject: subject || categoryType,
        message,
        status: 'ouvert',
        userId: userId || 'invité',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setSubmitted(true);
      setTicketId(supportTicketId);
      
      setTimeout(() => {
        if (!userId) {
          setName('');
          setEmail('');
        }
        setSubject('');
        setMessage('');
        setCategoryType('Réservation');
        setSubmitted(false);
      }, 5000);

    } catch (error) {
      console.error("Erreur lors de l'envoi du message :", error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketStatusCheck = async () => {
    if (!ticketId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de ticket.');
      return;
    }

    setLoading(true);
    
    try {
      const ticketDoc = await firestore().collection('support_tickets').doc(ticketId).get();
      
      if (ticketDoc.exists) {
        setTicketStatus(ticketDoc.data());
      } else {
        Alert.alert('Erreur', 'Aucun ticket trouvé avec cet identifiant.');
        setTicketStatus(null);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut :", error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    const phoneNumber = Platform.OS === 'android' ? 'tel:+237655783879' : 'telprompt:+237655783879';
    Linking.openURL(phoneNumber);
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@goexpress.com?subject=Demande d\'aide');
  };

  const renderFaqTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Questions fréquemment posées</Text>
      
      {faqs.map((faq) => (
        <TouchableOpacity 
          key={faq.id} 
          style={styles.faqItem}
          onPress={() => toggleFaq(faq.id)}
        >
          <View style={styles.faqHeader}>
            <Text style={styles.faqQuestion}>{faq.question}</Text>
            <Icon 
              name={expandedFaq === faq.id ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={24} 
              color="#4169E1" 
            />
          </View>
          
          {expandedFaq === faq.id && (
            <View style={styles.faqAnswer}>
              <Text style={styles.answerText}>{faq.answer}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContactTab = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.tabTitle}>Nous contacter</Text>
        
        {submitted ? (
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={60} color="#4CAF50" />
            <Text style={styles.successText}>Votre demande a été soumise avec succès!</Text>
            <Text style={styles.ticketIdText}>Numéro de référence: {ticketId}</Text>
            <Text style={styles.noteText}>Conservez ce numéro pour suivre l'état de votre demande.</Text>
          </View>
        ) : (
          <>
            <View style={styles.directContactContainer}>
              <Text style={styles.contactInfoTitle}>Contactez-nous directement</Text>
              <View style={styles.contactMethods}>
                <TouchableOpacity style={styles.contactMethod} onPress={handleCall}>
                  <View style={styles.contactIconContainer}>
                    <FontAwesome name="phone" size={24} color="#ffffff" />
                  </View>
                  <Text style={styles.contactMethodText}>Appeler le support</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.contactMethod} onPress={handleEmail}>
                  <View style={styles.contactIconContainer}>
                    <FontAwesome name="envelope" size={24} color="#ffffff" />
                  </View>
                  <Text style={styles.contactMethodText}>Envoyer un e-mail</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.formTitle}>Ou envoyez-nous un message</Text>
            
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Votre nom complet"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Votre adresse email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Catégorie</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => {
                    Alert.alert(
                      'Sélectionner une catégorie',
                      null,
                      categories.map(category => ({
                        text: category,
                        onPress: () => setCategoryType(category)
                      }))
                    );
                  }}
                >
                  <Text style={{ color: '#333' }}>{categoryType}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sujet</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Sujet de votre message"
                  placeholderTextColor="#999"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Décrivez votre problème ou posez votre question..."
                  placeholderTextColor="#999"
                  multiline={true}
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleContactSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderStatusTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Statut de votre demande</Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Numéro de référence</Text>
          <TextInput
            style={styles.input}
            value={ticketId}
            onChangeText={setTicketId}
            placeholder="Ex: support_12ab34cd"
            placeholderTextColor="#999"
          />
        </View>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleTicketStatusCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Vérifier le statut</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {ticketStatus && (
        <View style={styles.statusContainer}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Détails de la demande</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: ticketStatus.status === 'ouvert' ? '#FFC107' : 
                               ticketStatus.status === 'en cours' ? '#2196F3' : 
                               ticketStatus.status === 'résolu' ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.statusBadgeText}>{ticketStatus.status}</Text>
            </View>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Catégorie:</Text>
            <Text style={styles.statusValue}>{ticketStatus.category}</Text>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Sujet:</Text>
            <Text style={styles.statusValue}>{ticketStatus.subject}</Text>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Date de soumission:</Text>
            <Text style={styles.statusValue}>
              {ticketStatus.createdAt ? new Date(ticketStatus.createdAt.toDate()).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Dernière mise à jour:</Text>
            <Text style={styles.statusValue}>
              {ticketStatus.updatedAt ? new Date(ticketStatus.updatedAt.toDate()).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          
          {ticketStatus.response && (
            <View style={styles.responseContainer}>
              <Text style={styles.responseTitle}>Réponse:</Text>
              <Text style={styles.responseText}>{ticketStatus.response}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <Text style={styles.headerTitle}>Centre d'aide</Text>
          <Text style={styles.headerSubtitle}>Comment pouvons-nous vous aider ?</Text>
        </View>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <Icon name="question-answer" size={20} color={activeTab === 'faq' ? '#4169E1' : '#555'} />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>FAQ</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Icon name="email" size={20} color={activeTab === 'contact' ? '#4169E1' : '#555'} />
          <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>Contact</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'status' && styles.activeTab]}
          onPress={() => setActiveTab('status')}
        >
          <Icon name="search" size={20} color={activeTab === 'status' ? '#4169E1' : '#555'} />
          <Text style={[styles.tabText, activeTab === 'status' && styles.activeTabText]}>Statut</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {activeTab === 'faq' && renderFaqTab()}
        {activeTab === 'contact' && renderContactTab()}
        {activeTab === 'status' && renderStatusTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 150,
    position: 'relative',
    backgroundColor: COLORS.primary,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 86, 179, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4169E1',
  },
  tabText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#4169E1',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  faqAnswer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  answerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  directContactContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contactInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  contactMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  contactMethod: {
    alignItems: 'center',
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4169E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactMethodText: {
    fontSize: 14,
    color: '#4169E1',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  textarea: {
    height: 120,
    textAlignVertical: 'top',
  },
  required: {
    color: '#4169E1',
  },
  submitButton: {
    backgroundColor: '#4169E1',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  ticketIdText: {
    fontSize: 16,
    color: '#4169E1',
    fontWeight: '500',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statusLabel: {
    width: 140,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  responseContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  questionContainer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  question: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  answer: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    color: COLORS.primary,
    marginRight: 8,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});


export default Help;
