import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'react-native-image-picker';
import axios from 'axios';
import { ROUTES } from '../App';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // État pour les champs modifiables
  const [editedUser, setEditedUser] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  // Récupérer les informations de l'utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const currentUser = auth().currentUser;
        
        if (!currentUser) {
          console.log('Aucun utilisateur connecté');
          navigation.navigate(ROUTES.AUTH);
          return;
        }
        
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
          
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log('Données utilisateur récupérées:', userData);
          setUser(userData);
          setProfileImage(userData.profileImage || null);
          setEditedUser({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            phone: userData.phone || '',
            email: userData.email || '',
          });
        } else {
          console.log('Document utilisateur non trouvé');
          // Si l'utilisateur existe dans Auth mais pas dans Firestore
          const currentUserAuth = auth().currentUser;
          // On crée un profil minimal avec les infos disponibles
          const minimalUserData = {
            uid: currentUser.uid,
            email: currentUser.email,
            firstName: currentUser.displayName ? currentUser.displayName.split(' ')[0] : '',
            lastName: currentUser.displayName ? currentUser.displayName.split(' ').slice(1).join(' ') : '',
            fullName: currentUser.displayName || '',
            phone: '',
            createdAt: new Date().toISOString(),
            status: 'active',
            role: 'client',
          };
          
          // Créer le document utilisateur dans Firestore
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .set(minimalUserData);
            
          setUser(minimalUserData);
          setEditedUser({
            firstName: minimalUserData.firstName || '',
            lastName: minimalUserData.lastName || '',
            phone: '',
            email: currentUser.email || '',
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
        Alert.alert('Erreur', 'Impossible de charger votre profil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  // Sélectionner une image de profil depuis la galerie
  const selectProfileImage = () => {
    const options = {
      title: 'Sélectionner une photo de profil',
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
      mediaType: 'photo',
      includeBase64: false,
    };

    ImagePicker.launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('Sélection d\'image annulée');
      } else if (response.errorCode) {
        console.error('ImagePicker Error:', response.errorMessage);
        Alert.alert('Erreur', 'Impossible de sélectionner cette image');
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri };
        uploadImage(source.uri);
      }
    });
  };

  // Téléverser l'image vers Cloudinary
  const uploadImage = async (uri) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setUploading(true);

    try {
      const data = new FormData();
      const fileName = uri.split('/').pop();

      data.append('file', {
        uri,
        type: 'image/jpeg',
        name: fileName,
      });

      data.append('upload_preset', 'Mes images');
      data.append('cloud_name', 'dk97bi6xf');
      
      const res = await axios.post('https://api.cloudinary.com/v1_1/dk97bi6xf/image/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = res.data.secure_url;

      // Mettre à jour Firestore avec l'URL Cloudinary
      await firestore().collection('users').doc(currentUser.uid).update({
        profileImage: imageUrl,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setProfileImage(imageUrl);
      Alert.alert('Succès', 'Photo de profil mise à jour');

    } catch (error) {
      console.error('Erreur Cloudinary:', error);
      Alert.alert('Erreur', 'Téléversement échoué');
    } finally {
      setUploading(false);
    }
  };

  // Mettre à jour les informations de l'utilisateur
  const handleUpdateProfile = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      const currentUser = auth().currentUser;
      
      if (!currentUser) {
        Alert.alert('Erreur', 'Vous devez être connecté pour mettre à jour votre profil');
        return;
      }
      
      // Générer le nom complet
      const fullName = `${editedUser.firstName} ${editedUser.lastName}`;
      
      // Mise à jour dans Firestore
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          firstName: editedUser.firstName,
          lastName: editedUser.lastName,
          fullName: fullName,
          phone: editedUser.phone,
          // Ne pas mettre à jour l'email dans Firestore si c'est le même
          ...(editedUser.email !== user.email && { email: editedUser.email }),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      
      // Si l'email a changé, mise à jour dans Authentication
      if (editedUser.email !== user.email) {
        await currentUser.updateEmail(editedUser.email);
      }
      
      // Mettre à jour l'état local
      setUser({
        ...user,
        firstName: editedUser.firstName,
        lastName: editedUser.lastName,
        fullName: fullName,
        phone: editedUser.phone,
        email: editedUser.email,
      });
      
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Session expirée',
          'Veuillez vous reconnecter pour modifier votre email',
          [
            {
              text: 'Se reconnecter',
              onPress: handleLogout,
            },
            {
              text: 'Annuler',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour votre profil');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    if (!editedUser.firstName.trim()) {
      Alert.alert('Erreur', 'Le prénom est requis');
      return false;
    }
    
    if (!editedUser.lastName.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return false;
    }
    
    if (!editedUser.phone.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return false;
    }
    
    if (!editedUser.email.trim() || !/\S+@\S+\.\S+/.test(editedUser.email)) {
      Alert.alert('Erreur', 'Email invalide');
      return false;
    }
    
    return true;
  };

  // Déconnexion - CORRIGÉ
  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              // Suppression du token dans tous les cas
              await AsyncStorage.removeItem('authToken');
              
              // Vérification de l'existence d'un utilisateur avant déconnexion
              const currentUser = auth().currentUser;
              
              if (currentUser) {
                // Déconnexion seulement si un utilisateur est connecté
                await auth().signOut();
                console.log('Déconnexion réussie');
              } else {
                console.log('Aucun utilisateur connecté à déconnecter');
              }
              
              // Redirection vers l'écran de connexion dans tous les cas
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.AUTH }],
              });
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              
              // En cas d'erreur, on redirige quand même vers l'écran de connexion
              Alert.alert('Remarque', 'Un problème est survenu mais vous allez être redirigé vers l\'écran de connexion.');
              setTimeout(() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: ROUTES.AUTH }],
                });
              }, 1000);
            }
          },
        },
      ]
    );
  };

  // Navigation vers l'écran des réservations
  const navigateToReservations = () => {
    navigation.navigate(ROUTES.RESERVATIONS);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e17eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
          {!isEditing && (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setIsEditing(true)}
            >
              <Icon name="edit-2" size={20} color="#5e17eb" />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.scrollView}>
          <Animatable.View animation="fadeIn" duration={800} style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity 
                style={styles.avatarWrapper}
                onPress={selectProfileImage}
                disabled={isEditing || uploading}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user && user.firstName && user.lastName
                        ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                        : '?'}
                    </Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {!isEditing && !uploading && (
                  <View style={styles.editAvatarIcon}>
                    <Icon name="camera" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
              {!isEditing && (
                <Text style={styles.userName}>
                  {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`}
                </Text>
              )}
            </View>
            
            <View style={styles.infoContainer}>
              {isEditing ? (
                // Mode édition
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Prénom</Text>
                    <TextInput
                      style={styles.input}
                      value={editedUser.firstName}
                      onChangeText={(text) => setEditedUser({ ...editedUser, firstName: text })}
                      placeholder="Votre prénom"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom</Text>
                    <TextInput
                      style={styles.input}
                      value={editedUser.lastName}
                      onChangeText={(text) => setEditedUser({ ...editedUser, lastName: text })}
                      placeholder="Votre nom"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Téléphone</Text>
                    <TextInput
                      style={styles.input}
                      value={editedUser.phone}
                      onChangeText={(text) => setEditedUser({ ...editedUser, phone: text })}
                      placeholder="Votre numéro de téléphone"
                      keyboardType="phone-pad"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      value={editedUser.email}
                      onChangeText={(text) => setEditedUser({ ...editedUser, email: text })}
                      placeholder="Votre email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  
                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsEditing(false);
                        // Réinitialiser les champs édités aux valeurs actuelles
                        setEditedUser({
                          firstName: user?.firstName || '',
                          lastName: user?.lastName || '',
                          phone: user?.phone || '',
                          email: user?.email || '',
                        });
                      }}
                      disabled={isSaving}
                    >
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleUpdateProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Enregistrer</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Mode affichage
                <>
                  <View style={styles.infoItem}>
                    <Icon name="user" size={20} color="#5e17eb" style={styles.infoIcon} />
                    <View>
                      <Text style={styles.infoLabel}>Nom complet</Text>
                      <Text style={styles.infoValue}>
                        {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Icon name="phone" size={20} color="#5e17eb" style={styles.infoIcon} />
                    <View>
                      <Text style={styles.infoLabel}>Téléphone</Text>
                      <Text style={styles.infoValue}>{user?.phone || 'Non renseigné'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Icon name="mail" size={20} color="#5e17eb" style={styles.infoIcon} />
                    <View>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{user?.email || 'Non renseigné'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Icon name="shield" size={20} color="#5e17eb" style={styles.infoIcon} />
                    <View>
                      <Text style={styles.infoLabel}>Statut</Text>
                      <Text style={[
                        styles.infoValue, 
                        { color: user?.status === 'active' ? 'green' : 'orange' }
                      ]}>
                        {user?.status === 'active' ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
            
            {!isEditing && (
              <>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={navigateToReservations}
                >
                  <Icon name="calendar" size={22} color="#5e17eb" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Mes réservations</Text>
                  <Icon name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem}>
                  <Icon name="settings" size={22} color="#5e17eb" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Paramètres</Text>
                  <Icon name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem}>
                  <Icon name="help-circle" size={22} color="#5e17eb" style={styles.menuIcon} />
                  <Text style={styles.menuText}>Aide et Support</Text>
                  <Icon name="chevron-right" size={18} color="#ccc" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Icon name="log-out" size={20} color="#ff4444" />
                  <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>
              </>
            )}
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    marginLeft: 5,
    color: '#5e17eb',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  profileContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5e17eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5e17eb',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIcon: {
    marginRight: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#5e17eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '500',
  },
});

export default ProfileScreen;





