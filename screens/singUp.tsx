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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const { width } = Dimensions.get('window');

const RegistrationScreen = () => {
  const navigation = useNavigation();
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

  // Validation complète du formulaire
  const validateForm = () => {
    const newErrors = {};

    // Validation prénom
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.firstName.trim())) {
      newErrors.firstName = 'Le prénom ne doit contenir que des lettres';
    }

    // Validation nom
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Le nom doit contenir au moins 2 caractères';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.lastName.trim())) {
      newErrors.lastName = 'Le nom ne doit contenir que des lettres';
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Format d\'email invalide';
    }

    // Validation téléphone (format camerounais/international)
    const phoneRegex = /^[0-9]{9,15}$/;
    const cleanPhone = formData.phone.replace(/[\s-+()]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Numéro de téléphone invalide (9-15 chiffres)';
    }

    // Simplifier la validation du mot de passe
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    // Validation confirmation mot de passe
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fonction d'inscription améliorée
  const handleRegistration = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Création du compte Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim().toLowerCase(), 
        formData.password
      );
      const user = userCredential.user;

      // Préparation des données utilisateur pour Firestore
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
        // Informations supplémentaires
        isEmailVerified: false,
        isPhoneVerified: false,
        lastLoginAt: null,
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

      // Sauvegarde dans Firestore
      await setDoc(doc(db, 'users', user.uid), userData);

      // Confirmation et redirection
      Alert.alert(
        '🎉 Inscription réussie !',
        `Bienvenue ${formData.firstName} ! Votre compte a été créé avec succès. Vous allez être redirigé vers la page de connexion.`,
        [
          {
            text: 'Continuer',
            onPress: () => {
              // Déconnexion pour forcer la connexion via LoginScreen
              auth.signOut();
              navigation.navigate(ROUTES.LOGIN, {
                registrationSuccess: true,
                userEmail: formData.email.trim().toLowerCase()
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error("Erreur d'inscription:", error);
      let message = "Une erreur est survenue lors de l'inscription.";

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Cette adresse email est déjà utilisée. Essayez de vous connecter ou utilisez une autre adresse.';
          break;
        case 'auth/invalid-email':
          message = 'Format d\'adresse email invalide.';
          break;
        case 'auth/weak-password':
          message = 'Le mot de passe est trop faible. Utilisez au moins 8 caractères avec des majuscules, minuscules, chiffres et caractères spéciaux.';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
          break;
        case 'auth/operation-not-allowed':
          message = 'L\'inscription par email/mot de passe n\'est pas activée.';
          break;
        default:
          message = `Erreur technique: ${error.message}`;
      }

      Alert.alert('❌ Erreur d\'inscription', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mise à jour des champs avec validation en temps réel
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Validation en temps réel pour certains champs
    if (field === 'confirmPassword' && formData.password && value) {
      if (formData.password !== value) {
        setErrors(prev => ({ ...prev, confirmPassword: 'Les mots de passe ne correspondent pas' }));
      }
    }
  };

  const navigateToLogin = () => {
    navigation.navigate(ROUTES.LOGIN);
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
          {/* Header avec logo et animation */}
          <Animatable.View animation="fadeInDown" duration={1000} style={styles.logoContainer}>
            <Image
              source={require('../assets/images/GoExpress.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Rejoignez GoExpress</Text>
            <Text style={styles.subtitle}>Créez votre compte en quelques étapes</Text>
          </Animatable.View>

          {/* Formulaire d'inscription */}
          <Animatable.View animation="fadeInUp" duration={1000} delay={200} style={styles.formContainer}>
            {/* Prénom */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Prénom *</Text>
              <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
                <Icon name="person-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre prénom"
                  placeholderTextColor="#c7c7cc"
                  value={formData.firstName}
                  onChangeText={(text) => updateFormData('firstName', text)}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            {/* Nom */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom *</Text>
              <View style={[styles.inputContainer, errors.lastName && styles.inputError]}>
                <Icon name="person-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre nom"
                  placeholderTextColor="#c7c7cc"
                  value={formData.lastName}
                  onChangeText={(text) => updateFormData('lastName', text)}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                <Icon name="mail-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="votre@email.com"
                  placeholderTextColor="#c7c7cc"
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={100}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Téléphone */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone *</Text>
              <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
                <Icon name="call-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="655 78 38 79"
                  placeholderTextColor="#c7c7cc"
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe *</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Icon name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimum 8 caractères"
                  placeholderTextColor="#c7c7cc"
                  value={formData.password}
                  onChangeText={(text) => updateFormData('password', text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  maxLength={50}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8e8e93"
                  />
                </TouchableOpacity>
              </View>
              
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirmation mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
              <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
                <Icon name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Répétez votre mot de passe"
                  placeholderTextColor="#c7c7cc"
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateFormData('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  maxLength={50}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8e8e93"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Bouton d'inscription */}
            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.disabledButton]}
              onPress={handleRegistration}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Création du compte...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Créer mon compte</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>

            {/* Conditions d'utilisation */}
            <Text style={styles.termsText}>
              En créant un compte, vous acceptez nos{' '}
              <Text style={styles.termsLink}>Conditions d'utilisation</Text>
              {' '}et notre{' '}
              <Text style={styles.termsLink}>Politique de confidentialité</Text>
            </Text>

            {/* Lien vers connexion */}
            <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
              <Text style={styles.loginLinkText}>
                Vous avez déjà un compte ?{' '}
                <Text style={styles.loginLinkBold}>Se connecter</Text>
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
    backgroundColor: '#f2f2f7',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d1d6',
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#1d1d1f',
    fontWeight: '400',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '400',
  },
  registerButton: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#007aff',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  termsLink: {
    color: '#007aff',
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  loginLinkBold: {
    color: '#007aff',
    fontWeight: '600',
  },
});

export default RegistrationScreen;
