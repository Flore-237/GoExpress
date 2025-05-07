import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Switch } from 'react-native';



const Profile = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);

  // Récupérer les informations de l'utilisateur au chargement
  useEffect(() => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      fetchUserData(currentUser.uid);
    } else {
      setLoading(false);
    }
  }, []);

  // Récupérer les données de l'utilisateur depuis Firestore
  const fetchUserData = async (userId: string) => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        setUser(userData);
        setName(userData?.name || '');
        setEmail(userData?.email || '');
        setPhone(userData?.phone || '');
        setProfileImage(userData?.profileImage || null);
        setNotificationsEnabled(userData?.notificationsEnabled !== false);
        setEmailNotificationsEnabled(userData?.emailNotificationsEnabled !== false);
        setSmsNotificationsEnabled(userData?.smsNotificationsEnabled !== false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du profil');
      setLoading(false);
    }
  };

  // Sélectionner une image depuis la galerie
  const selectImage = async () => {
    const options = {
      maxWidth: 512,
      maxHeight: 512,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    try {
      const result = await launchImageLibrary(options);
      
      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets[0].uri) {
        const source = { uri: result.assets[0].uri };
        setProfileImage(source.uri);
        
        if (editMode) {
          uploadImage(source.uri);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // Télécharger l'image vers Firebase Storage
  const uploadImage = async (uri: string) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setUploading(true);
    
    try {
      // Chemin dans Firebase Storage
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = storage().ref(`profile_images/${currentUser.uid}/${filename}`);
      
      // Télécharger l'image
      await storageRef.putFile(uri);
      
      // Obtenir l'URL de l'image téléchargée
      const url = await storageRef.getDownloadURL();
      
      // Mettre à jour l'URL dans Firestore
      await firestore().collection('users').doc(currentUser.uid).update({
        profileImage: url,
      });
      
      setProfileImage(url);
      Alert.alert('Succès', 'Photo de profil mise à jour');
    } catch (error) {
      console.error('Erreur lors du téléchargement de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de télécharger l\'image');
    } finally {
      setUploading(false);
    }
  };

  // Enregistrer les modifications du profil
  const saveProfile = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setLoading(true);
    
    try {
      // Valider les entrées
      if (!name.trim()) {
        Alert.alert('Erreur', 'Veuillez entrer votre nom');
        setLoading(false);
        return;
      }
      
      if (!email.trim() || !email.includes('@')) {
        Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
        setLoading(false);
        return;
      }
      
      if (!phone.trim() || phone.length < 9) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
        setLoading(false);
        return;
      }

      // Mettre à jour les informations dans Firestore
      await firestore().collection('users').doc(currentUser.uid).update({
        name,
        email,
        phone,
        notificationsEnabled,
        emailNotificationsEnabled,
        smsNotificationsEnabled,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      
      // Mettre à jour l'email dans Firebase Auth si nécessaire
      if (email !== currentUser.email) {
        await currentUser.updateEmail(email);
      }
      
      setEditMode(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as never }],
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  // Supprimer le compte
  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const currentUser = auth().currentUser;
              if (currentUser) {
                // Supprimer les données utilisateur de Firestore
                await firestore().collection('users').doc(currentUser.uid).delete();
                
                // Supprimer le compte d'authentification
                await currentUser.delete();
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' as never }],
                });
              }
            } catch (error) {
              console.error('Erreur lors de la suppression du compte:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            }
          }
        },
      ]
    );
  };

  // Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser && currentUser.email) {
        await auth().sendPasswordResetEmail(currentUser.email);
        Alert.alert('Email envoyé', 'Un email de réinitialisation de mot de passe a été envoyé à votre adresse email.');
      }
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de réinitialisation');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* En-tête du profil */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Profil</Text>
        {!editMode ? (
          <TouchableOpacity onPress={() => setEditMode(true)}>
            <Icon name="edit" size={24} color="#0047AB" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={saveProfile}>
            <Icon name="check" size={24} color="#0047AB" />
          </TouchableOpacity>
        )}
      </View>

      {/* Photo de profil */}
      <View style={styles.profileImageContainer}>
        <TouchableOpacity onPress={selectImage} disabled={uploading}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="person" size={60} color="#FFFFFF" />
            </View>
          )}
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="white" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={selectImage}
          disabled={uploading || !editMode}
        >
          <Icon name="photo-camera" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Informations personnelles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        
        <View style={styles.infoField}>
          <Text style={styles.label}>Nom</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom"
              placeholderTextColor="#888"
            />
          ) : (
            <Text style={styles.value}>{name || 'Non défini'}</Text>
          )}
        </View>
        
        <View style={styles.infoField}>
          <Text style={styles.label}>Email</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Votre email"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.value}>{email || 'Non défini'}</Text>
          )}
        </View>
        
        <View style={styles.infoField}>
          <Text style={styles.label}>Téléphone</Text>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Votre numéro de téléphone"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.value}>{phone || 'Non défini'}</Text>
          )}
        </View>
      </View>


      {/* Historique des voyages */}
      <TouchableOpacity 
        style={styles.section}
        onPress={() => navigation.navigate('TripHistory' as never)}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique des voyages</Text>
          <Icon name="chevron-right" size={24} color="#0047AB" />
        </View>
      </TouchableOpacity>

      {/* Tickets et réservations */}
      <TouchableOpacity 
        style={styles.section}
        onPress={() => navigation.navigate('MyTickets' as never)}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes tickets</Text>
          <Icon name="chevron-right" size={24} color="#0047AB" />
        </View>
      </TouchableOpacity>

      {/* Sécurité */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sécurité</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleResetPassword}
        >
          <Icon name="lock" size={24} color="#0047AB" />
          <Text style={styles.actionButtonText}>Changer le mot de passe</Text>
        </TouchableOpacity>
      </View>

      {/* Autres actions */}
      <View style={styles.section}>
        
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLogout}
        >
          <Icon name="logout" size={24} color="#0047AB" />
          <Text style={styles.actionButtonText}>Déconnexion</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleDeleteAccount}
        >
          <Icon name="delete-forever" size={24} color="#FF3B30" />
          <Text style={[styles.actionButtonText, styles.dangerText]}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </View>

      {/* Version de l'application */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>GoExpress v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#4169E1',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4169E1',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4169E1',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#A0A0A0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0047AB',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '33%',
    backgroundColor: '#0047AB',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0047AB',
    marginBottom: 10,
  },
  infoField: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333333',
  },
  input: {
    fontSize: 16,
    color: '#333333',
    borderBottomWidth: 1,
    borderBottomColor: '#0047AB',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#FF3B30',
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#888888',
  },
});

export default Profile;