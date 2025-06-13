import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { storage } from '../utils/storage';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const RegistrationScreen = () => {
  const navigation = useNavigation();
  const { storeUserData } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState('');

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Prénom requis';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Minimum 2 caractères';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Nom requis';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Minimum 2 caractères';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Email invalide';
    }

    const phoneRegex = /^[0-9]{9,15}$/;
    const cleanPhone = formData.phone.replace(/[\s-+()]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Téléphone requis';
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Numéro invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Mot de passe requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmation requise';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mots de passe différents';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gestion de l'inscription
  const handleRegistration = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim().toLowerCase(), 
        formData.password
      );
      const user = userCredential.user;

      const userData = {
        uid: user.uid,
        id: user.uid,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        phone: formData.phone.trim(),
        role: 'client',
        status: 'active',
        profileImage: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isEmailVerified: false,
        isPhoneVerified: false,
        lastLoginAt: new Date().toISOString(),
        preferences: {
          language: 'fr',
          notifications: true,
          theme: 'light'
        },
        statistics: {
          totalOrders: 0,
          totalSpent: 0,
          loyaltyPoints: 0
        }
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await handleLoginSuccess(userData);

    } catch (error) {
      console.error("Erreur d'inscription:", error);
      let message = "Erreur lors de l'inscription";

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Cette adresse email est déjà utilisée';
          break;
        case 'auth/invalid-email':
          message = 'Format d\'email invalide';
          break;
        case 'auth/weak-password':
          message = 'Mot de passe trop faible';
          break;
        case 'auth/network-request-failed':
          message = 'Vérifiez votre connexion internet';
          break;
        default:
          message = 'Une erreur est survenue';
      }

      Alert.alert('Erreur', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (userData) => {
    try {
      await storage.storeUserData(userData);
      Alert.alert(
        'Bienvenue !',
        `Votre compte a été créé avec succès`,
        [{
          text: 'Continuer',
          onPress: () => navigation.replace(ROUTES.LOGIN)
        }]
      );
    } catch (error) {
      console.error('Erreur de stockage:', error);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const navigateToLogin = () => {
    navigation.replace(ROUTES.LOGIN);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header avec logo */}
              <Animatable.View animation="fadeInDown" duration={1000} style={styles.header}>
                <View style={styles.logoContainer}>
                  <Image 
                    source={require('../assets/images/GoExpress.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.title}>Créer votre compte</Text>
                <Text style={styles.subtitle}>
                  Rejoignez notre communauté et découvrez une nouvelle expérience
                </Text>
              </Animatable.View>

              {/* Formulaire */}
              <Animatable.View animation="fadeInUp" duration={1000} delay={300} style={styles.formContainer}>
                
                {/* Champs nom et prénom */}
                    <View style={styles.inputGroup}>
        <Text style={styles.fieldLabel}>Prénom</Text>
        <View style={[
          styles.inputContainer,
          focusedField === 'firstName' && styles.inputFocused,
          errors.firstName && styles.inputError
        ]}>
          <TextInput
            style={styles.input}
            placeholder="Entrez votre prénom"
            placeholderTextColor="#A0A0A0"
            value={formData.firstName}
            onChangeText={(text) => updateFormData('firstName', text)}
            onFocus={() => setFocusedField('firstName')}
            onBlur={() => setFocusedField('')}
            autoCapitalize="words"
          />
        </View>
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.fieldLabel}>Nom</Text>
        <View style={[
          styles.inputContainer,
          focusedField === 'lastName' && styles.inputFocused,
          errors.lastName && styles.inputError
        ]}>
          <TextInput
            style={styles.input}
            placeholder="Entrez votre nom"
            placeholderTextColor="#A0A0A0"
            value={formData.lastName}
            onChangeText={(text) => updateFormData('lastName', text)}
            onFocus={() => setFocusedField('lastName')}
            onBlur={() => setFocusedField('')}
            autoCapitalize="words"
          />
        </View>
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>

                {/* Fin des champs nom et prénom */}  

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Adresse email</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedField === 'email' && styles.inputFocused,
                    errors.email && styles.inputError
                  ]}>
                    <Icon name="mail-outline" size={22} color="#4169E1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="votre@email.com"
                      placeholderTextColor="#A0A0A0"
                      value={formData.email}
                      onChangeText={(text) => updateFormData('email', text)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                {/* Téléphone */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Numéro de téléphone</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedField === 'phone' && styles.inputFocused,
                    errors.phone && styles.inputError
                  ]}>
                    <Icon name="call-outline" size={22} color="#4169E1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="+33 6 12 34 56 78"
                      placeholderTextColor="#A0A0A0"
                      value={formData.phone}
                      onChangeText={(text) => updateFormData('phone', text)}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField('')}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.phone && (
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  )}
                </View>

                {/* Mot de passe */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Mot de passe</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedField === 'password' && styles.inputFocused,
                    errors.password && styles.inputError
                  ]}>
                    <Icon name="lock-closed-outline" size={22} color="#4169E1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 caractères"
                      placeholderTextColor="#A0A0A0"
                      value={formData.password}
                      onChangeText={(text) => updateFormData('password', text)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField('')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Icon
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#4169E1"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Confirmation mot de passe */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedField === 'confirmPassword' && styles.inputFocused,
                    errors.confirmPassword && styles.inputError
                  ]}>
                    <Icon name="lock-closed-outline" size={22} color="#4169E1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirmez votre mot de passe"
                      placeholderTextColor="#A0A0A0"
                      value={formData.confirmPassword}
                      onChangeText={(text) => updateFormData('confirmPassword', text)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField('')}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity 
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Icon
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color="#4169E1"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>

                {/* Bouton d'inscription */}
                <Animatable.View animation="pulse" iterationCount="infinite" iterationDelay={3000}>
                  <TouchableOpacity
                    style={[styles.registerButton, isLoading && styles.buttonDisabled]}
                    onPress={handleRegistration}
                    disabled={isLoading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#4169E1', '#1E3A8A']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Créer mon compte</Text>
                          <Icon name="arrow-forward-circle" size={24} color="#ffffff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animatable.View>

                {/* Conditions d'utilisation */}
                <Text style={styles.termsText}>
                  En créant un compte, vous acceptez nos{' '}
                  <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                  {' '}et notre{' '}
                  <Text style={styles.termsLink}>Politique de confidentialité</Text>
                </Text>

                {/* Séparateur */}
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>ou</Text>
                  <View style={styles.separatorLine} />
                </View>

                {/* Lien de connexion */}
                <TouchableOpacity 
                  onPress={navigateToLogin}
                  style={styles.loginButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginButtonText}>
                    Vous avez déjà un compte ? <Text style={styles.loginLink}>Se connecter</Text>
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nameField: {
    flex: 1,
    marginHorizontal: 6,
  },
  inputGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFocused: {
    borderColor: '#4169E1',
    backgroundColor: '#ffffff',
    shadowColor: '#4169E1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  registerButton: {
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 24,
    shadowColor: '#4169E1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#4169E1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  separatorText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loginButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  loginLink: {
    color: '#4169E1',
    fontWeight: '700',
  },
});

export default RegistrationScreen;