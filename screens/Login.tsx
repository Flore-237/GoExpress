import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ setIsLoggedIn }) => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fonction de connexion
  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Authentification Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        formData.email.trim().toLowerCase(), 
        formData.password
      );
      const user = userCredential.user;

      // Récupération des données utilisateur depuis Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Sauvegarde des données utilisateur en local
        await AsyncStorage.multiSet([
          ['authToken', user.uid],
          ['userId', user.uid],
          ['userEmail', userData.email],
          ['userFirstName', userData.firstName || ''],
          ['userLastName', userData.lastName || ''],
          ['userFullName', userData.fullName || ''],
          ['userPhone', userData.phone || ''],
          ['userRole', userData.role || 'client'],
          ['userStatus', userData.status || 'active'],
          ['userProfileImage', userData.profileImage || ''],
          ['userCreatedAt', userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()],
        ]);

        console.log('Données utilisateur sauvegardées en local:', userData);

        // Mise à jour de l'état d'authentification
        if (setIsLoggedIn) {
          setIsLoggedIn(true);
        }

        // Redirection vers l'écran principal avec remplacement
        navigation.replace(ROUTES.MAIN_TABS);

        // Message de bienvenue
        Alert.alert(
          'Connexion réussie',
          `Bienvenue ${userData.firstName || userData.fullName || 'cher utilisateur'} !`,
        );

      } else {
        console.warn('Données utilisateur non trouvées dans Firestore');
        Alert.alert(
          'Erreur de données',
          'Vos informations de profil sont incomplètes. Veuillez contacter le support.'
        );
      }

    } catch (error) {
      console.error('Erreur de connexion:', error);
      let message = 'Une erreur est survenue lors de la connexion.';

      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Aucun compte associé à cette adresse email.';
          break;
        case 'auth/wrong-password':
          message = 'Mot de passe incorrect.';
          break;
        case 'auth/invalid-email':
          message = 'Adresse email invalide.';
          break;
        case 'auth/user-disabled':
          message = 'Ce compte a été désactivé.';
          break;
        case 'auth/too-many-requests':
          message = 'Trop de tentatives de connexion. Réessayez plus tard.';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur de connexion. Vérifiez votre connexion internet.';
          break;
        case 'auth/invalid-credential':
          message = 'Email ou mot de passe incorrect.';
          break;
        default:
          message = 'Email ou mot de passe incorrect.';
      }

      Alert.alert('Erreur de connexion', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour des champs du formulaire
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const navigateToRegister = () => {
    navigation.navigate(ROUTES.REGISTER);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header avec logo */}
          <Animatable.View animation="fadeInDown" duration={1000} style={styles.logoContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../assets/images/GoExpress.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Bon retour !</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre compte</Text>
          </Animatable.View>

          {/* Formulaire de connexion */}
          <Animatable.View animation="fadeInUp" duration={1000} delay={200} style={styles.formContainer}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Icon name="mail-outline" size={22} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="votre@email.com"
                  placeholderTextColor="#bdc3c7"
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && (
                <Animatable.View animation="fadeIn" duration={300}>
                  <Text style={styles.errorText}>{errors.email}</Text>
                </Animatable.View>
              )}
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Icon name="lock-closed-outline" size={22} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#bdc3c7"
                  value={formData.password}
                  onChangeText={(text) => updateFormData('password', text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#7f8c8d"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Animatable.View animation="fadeIn" duration={300}>
                  <Text style={styles.errorText}>{errors.password}</Text>
                </Animatable.View>
              )}
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity 
              style={styles.forgotPasswordLink} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)} // Ajoutez cette route si nécessaire
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton de connexion */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Se connecter</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Lien vers inscription */}
            <TouchableOpacity 
              onPress={navigateToRegister} 
              style={styles.registerLink}
              activeOpacity={0.7}
            >
              <Text style={styles.registerLinkText}>
                Vous n'avez pas de compte ?{' '}
                <Text style={styles.registerLinkBold}>S'inscrire</Text>
              </Text>
            </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 40,
    minHeight: height - 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  logoWrapper: {
    backgroundColor: '#fff',
    borderRadius: 75,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#f1f3f4',
    minHeight: 56,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 0,
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 30,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3498db',
    shadowOffset: { 
      width: 0, 
      height: 6 
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 56,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
    shadowColor: '#bdc3c7',
    shadowOpacity: 0.2,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8eaed',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  registerLinkText: {
    color: '#7f8c8d',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '400',
  },
  registerLinkBold: {
    color: '#3498db',
    fontWeight: '700',
  },
});

export default LoginScreen;