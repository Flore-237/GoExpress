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
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(true);

  // Récupération des données utilisateur depuis Firebase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth().currentUser;
        
        if (!currentUser) {
          setLoading(false);
          navigation.navigate('Login');
          return;
        }
        
        console.log('Current user ID:', currentUser.uid);
        
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log('User data retrieved:', userData);
          
          setUser(userData);
          setName(userData?.name || '');
          setEmail(userData?.email || currentUser.email || '');
          setPhone(userData?.phone || '');
          setProfileImage(userData?.profileImage || null);
          setNotificationsEnabled(userData?.notificationsEnabled !== false);
          setEmailNotificationsEnabled(userData?.emailNotificationsEnabled !== false);
          setSmsNotificationsEnabled(userData?.smsNotificationsEnabled !== false);
        } else {
          // Créer un document utilisateur s'il n'existe pas
          const newUserData = {
            name: currentUser.displayName || '',
            email: currentUser.email || '',
            phone: currentUser.phoneNumber || '',
            profileImage: currentUser.photoURL || null,
            notificationsEnabled: true,
            emailNotificationsEnabled: true,
            smsNotificationsEnabled: true,
            createdAt: firestore.FieldValue.serverTimestamp(),
          };
          
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .set(newUserData);
          
          setUser(newUserData);
          setName(newUserData.name);
          setEmail(newUserData.email);
          setPhone(newUserData.phone);
          setProfileImage(newUserData.profileImage);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert(
          'Erreur de chargement',
          'Impossible de récupérer vos informations. Veuillez réessayer.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  const selectImage = async () => {
    const options = {
      mediaType: 'photo',
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.8,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.assets && result.assets[0].uri) {
        const source = result.assets[0].uri;
        setProfileImage(source);
        if (editMode) await uploadImage(source);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImage = async (uri) => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setUploading(true);

    try {
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const storageRef = storage().ref(`profile_images/${currentUser.uid}/${filename}`);
      const response = await fetch(uri);
      const blob = await response.blob();
      await storageRef.put(blob);
      const url = await storageRef.getDownloadURL();

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          profileImage: url,
          updatedAt: firestore.FieldValue.serverTimestamp(),
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

  const saveProfile = async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    setLoading(true);

    try {
      if (!name.trim()) throw new Error('Veuillez entrer votre nom');
      if (!email.trim() || !email.includes('@')) throw new Error('Veuillez entrer une adresse email valide');
      if (!phone.trim()) throw new Error('Veuillez entrer un numéro de téléphone');

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          name,
          email,
          phone,
          notificationsEnabled,
          emailNotificationsEnabled,
          smsNotificationsEnabled,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      if (email !== currentUser.email) {
        await currentUser.updateEmail(email);
      }

      // Mettre à jour les données locales
      setUser(prev => ({
        ...prev,
        name,
        email,
        phone,
        notificationsEnabled,
        emailNotificationsEnabled,
        smsNotificationsEnabled
      }));
      
      setEditMode(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Erreur lors de la déconnexion:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        }
      ]
    );
  };

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
                if (profileImage) {
                  try {
                    const imageRef = storage().refFromURL(profileImage);
                    await imageRef.delete();
                  } catch (error) {
                    console.error('Erreur suppression photo:', error);
                  }
                }
                await firestore().collection('users').doc(currentUser.uid).delete();
                await currentUser.delete();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            } catch (error) {
              console.error('Erreur suppression compte:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le compte');
            }
          }
        },
      ]
    );
  };

  const handleResetPassword = async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser?.email) {
        await auth().sendPasswordResetEmail(currentUser.email);
        Alert.alert('Email envoyé', 'Un email de réinitialisation a été envoyé à votre adresse.');
      }
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email de réinitialisation');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e17eb" />
      </View>
    );
  }

  const getInitials = () => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animatable.View animation="fadeIn" duration={600} style={styles.header}>
          <Text style={styles.headerText}>Mon Profil</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={() => editMode ? saveProfile() : setEditMode(true)}
          >
            <Icon name={editMode ? "check" : "edit"} size={22} color="#fff" />
            <Text style={styles.editButtonText}>{editMode ? "Enregistrer" : "Modifier"}</Text>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200} duration={800} style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.initialsText}>{getInitials()}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton} 
              onPress={selectImage}
              disabled={uploading}
            >
              <Icon name="photo-camera" color="white" size={18} />
            </TouchableOpacity>
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </View>
          
          {!editMode && (
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{name || 'Ajouter un nom'}</Text>
              <Text style={styles.userEmail}>{email || 'Ajouter un email'}</Text>
            </View>
          )}
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={300} duration={800} style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.inputContainer}>
            <Icon name="person" size={20} color="#5e17eb" style={styles.inputIcon} />
            <TextInput
              placeholder="Nom complet"
              value={name}
              onChangeText={setName}
              editable={editMode}
              style={[
                styles.input,
                !editMode && styles.inputDisabled,
                !name && styles.inputEmpty
              ]}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="#5e17eb" style={styles.inputIcon} />
            <TextInput
              placeholder="Adresse email"
              value={email}
              onChangeText={setEmail}
              editable={editMode}
              keyboardType="email-address"
              style={[
                styles.input, 
                !editMode && styles.inputDisabled,
                !email && styles.inputEmpty
              ]}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Icon name="phone" size={20} color="#5e17eb" style={styles.inputIcon} />
            <TextInput
              placeholder="Numéro de téléphone"
              value={phone}
              onChangeText={setPhone}
              editable={editMode}
              keyboardType="phone-pad"
              style={[
                styles.input, 
                !editMode && styles.inputDisabled,
                !phone && styles.inputEmpty
              ]}
            />
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} duration={800} style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences de notification</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Icon name="notifications" size={20} color="#5e17eb" />
              <Text style={styles.switchLabel}>Toutes les notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              disabled={!editMode}
              trackColor={{ false: '#d1d1d1', true: '#bda5e9' }}
              thumbColor={notificationsEnabled ? '#5e17eb' : '#f4f3f4'}
              ios_backgroundColor="#d1d1d1"
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Icon name="mail" size={20} color="#5e17eb" />
              <Text style={styles.switchLabel}>Notifications par Email</Text>
            </View>
            <Switch
              value={emailNotificationsEnabled}
              onValueChange={setEmailNotificationsEnabled}
              disabled={!editMode || !notificationsEnabled}
              trackColor={{ false: '#d1d1d1', true: '#bda5e9' }}
              thumbColor={emailNotificationsEnabled ? '#5e17eb' : '#f4f3f4'}
              ios_backgroundColor="#d1d1d1"
            />
          </View>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabelContainer}>
              <Icon name="sms" size={20} color="#5e17eb" />
              <Text style={styles.switchLabel}>Notifications par SMS</Text>
            </View>
            <Switch
              value={smsNotificationsEnabled}
              onValueChange={setSmsNotificationsEnabled}
              disabled={!editMode || !notificationsEnabled}
              trackColor={{ false: '#d1d1d1', true: '#bda5e9' }}
              thumbColor={smsNotificationsEnabled ? '#5e17eb' : '#f4f3f4'}
              ios_backgroundColor="#d1d1d1"
            />
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={500} duration={800} style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleResetPassword}>
            <Icon name="lock" size={22} color="#5e17eb" />
            <Text style={styles.actionButtonText}>Réinitialiser le mot de passe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Icon name="logout" size={22} color="#5e17eb" />
            <Text style={styles.actionButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Icon name="delete-forever" size={22} color="#ff3b30" />
            <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
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
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5e17eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  profileCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginVertical: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#5e17eb',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e9e1f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#5e17eb',
  },
  initialsText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#5e17eb',
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
    right: 0,
    backgroundColor: '#5e17eb',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  inputDisabled: {
    color: '#666',
  },
  inputEmpty: {
    color: '#999',
    fontStyle: 'italic',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ff3b30',
    marginLeft: 12,
  },
});

export default ProfileScreen;