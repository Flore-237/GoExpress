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
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >
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
              {/* Header minimaliste */}
              <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <Icon name="rocket" size={32} color="#fff" />
                  </View>
                </View>
                <Text style={styles.title}>Créer un compte</Text>
                <Text style={styles.subtitle}>Rejoignez GoExpress dès maintenant</Text>
              </Animatable.View>

              {/* Formulaire dans une card flottante */}
              <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formContainer}>
                <View style={styles.formCard}>
                  {/* Champs nom et prénom */}
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <View style={[
                        styles.inputContainer,
                        focusedField === 'firstName' && styles.inputFocused,
                        errors.firstName && styles.inputError
                      ]}>
                        <TextInput
                          style={styles.input}
                          placeholder="Prénom"
                          placeholderTextColor="#9CA3AF"
                          value={formData.firstName}
                          onChangeText={(text) => updateFormData('firstName', text)}
                          onFocus={() => setFocusedField('firstName')}
                          onBlur={() => setFocusedField('')}
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.firstName && (
                        <Text style={styles.errorText}>{errors.firstName}</Text>
                      )}
                    </View>

                    <View style={styles.nameField}>
                      <View style={[
                        styles.inputContainer,
                        focusedField === 'lastName' && styles.inputFocused,
                        errors.lastName && styles.inputError
                      ]}>
                        <TextInput
                          style={styles.input}
                          placeholder="Nom"
                          placeholderTextColor="#9CA3AF"
                          value={formData.lastName}
                          onChangeText={(text) => updateFormData('lastName', text)}
                          onFocus={() => setFocusedField('lastName')}
                          onBlur={() => setFocusedField('')}
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.lastName && (
                        <Text style={styles.errorText}>{errors.lastName}</Text>
                      )}
                    </View>
                  </View>

                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <View style={[
                      styles.inputContainer,
                      focusedField === 'email' && styles.inputFocused,
                      errors.email && styles.inputError
                    ]}>
                      <Icon name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Adresse email"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={[
                      styles.inputContainer,
                      focusedField === 'phone' && styles.inputFocused,
                      errors.phone && styles.inputError
                    ]}>
                      <Icon name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Numéro de téléphone"
                        placeholderTextColor="#9CA3AF"
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
                    <View style={[
                      styles.inputContainer,
                      focusedField === 'password' && styles.inputFocused,
                      errors.password && styles.inputError
                    ]}>
                      <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Mot de passe"
                        placeholderTextColor="#9CA3AF"
                        value={formData.password}
                        onChangeText={(text) => updateFormData('password', text)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField('')}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Icon
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password}</Text>
                    )}
                  </View>

                  {/* Confirmation mot de passe */}
                  <View style={styles.inputGroup}>
                    <View style={[
                      styles.inputContainer,
                      focusedField === 'confirmPassword' && styles.inputFocused,
                      errors.confirmPassword && styles.inputError
                    ]}>
                      <Icon name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirmer le mot de passe"
                        placeholderTextColor="#9CA3AF"
                        value={formData.confirmPassword}
                        onChangeText={(text) => updateFormData('confirmPassword', text)}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField('')}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                        <Icon
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && (
                      <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                    )}
                  </View>

                  {/* Bouton d'inscription */}
                  <TouchableOpacity
                    style={styles.registerButton}
                    onPress={handleRegistration}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Créer mon compte</Text>
                          <Icon name="arrow-forward" size={18} color="#fff" />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Conditions d'utilisation */}
                  <Text style={styles.termsText}>
                    En créant un compte, vous acceptez nos{' '}
                    <Text style={styles.termsLink}>conditions d'utilisation</Text>
                  </Text>
                </View>

                {/* Lien de connexion */}
                <View style={styles.loginSection}>
                  <Text style={styles.loginText}>Déjà un compte ?</Text>
                  <TouchableOpacity onPress={navigateToLogin}>
                    <Text style={styles.loginLink}>Se connecter</Text>
                  </TouchableOpacity>
                </View>
              </Animatable.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nameField: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#667eea',
    backgroundColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#667eea',
    fontWeight: '600',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 10,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginRight: 8,
  },
  loginLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegistrationScreen;