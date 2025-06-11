import React, { useState } from 'react';
import * as Animatable from 'react-native-animatable';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../constants/routes';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserData } from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

interface AuthContextType {
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: any) => void;
  setIsLoggedIn: (value: boolean) => void;
}

type RootStackParamList = {
  [ROUTES.REGISTER]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { setIsAuthenticated, setUser, setIsLoggedIn } = useAuth() as AuthContextType;
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = () => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('authToken', userCredential.user.uid);
      
      setUser(userData);
      setIsAuthenticated(true);
      setIsLoggedIn(true);
      
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      let message = "Une erreur est survenue lors de la connexion.";

      switch (error.code) {
        case 'auth/invalid-email':
          message = 'Format d\'email invalide.';
          break;
        case 'auth/user-disabled':
          message = 'Ce compte a été désactivé.';
          break;
        case 'auth/user-not-found':
          message = 'Aucun compte ne correspond à cet email.';
          break;
        case 'auth/wrong-password':
          message = 'Mot de passe incorrect.';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur de connexion. Vérifiez votre connexion internet.';
          break;
        default:
          message = `Erreur : ${error.message}`;
      }

      Alert.alert('❌ Erreur de connexion', message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleRegisterPress = () => {
    navigation.navigate(ROUTES.REGISTER);
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
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
            {/* Header Section */}
            <Animatable.View animation="fadeInDown" duration={800} style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeText}>Bon retour parmi nous !</Text>
              <Text style={styles.subtitleText}>Connectez-vous à votre compte</Text>
            </Animatable.View>

            {/* Form Section */}
            <Animatable.View animation="fadeInUp" duration={800} delay={300} style={styles.formSection}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                  <Icon name="mail-outline" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="votre@email.com"
                    placeholderTextColor="#9CA3AF"
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email && (
                  <Animatable.View animation="fadeIn" duration={200}>
                    <Text style={styles.errorText}>{errors.email}</Text>
                  </Animatable.View>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                  <Icon name="lock-closed-outline" size={20} color="#6366F1" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
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
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Animatable.View animation="fadeIn" duration={200}>
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </Animatable.View>
                )}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity 
                style={styles.forgotPasswordLink} 
                activeOpacity={0.7}
                onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
              >
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <Animatable.View animation="pulse" duration={1000} delay={600}>
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isLoading ? ['#D1D5DB', '#9CA3AF'] : ['#6366F1', '#8B5CF6']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>Se connecter</Text>
                        <Icon name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register Link */}
              <TouchableOpacity 
                onPress={handleRegisterPress} 
                style={styles.registerButton}
                activeOpacity={0.7}
              >
                <Text style={styles.registerButtonText}>
                  Pas encore de compte ? <Text style={styles.registerButtonTextBold}>Créer un compte</Text>
                </Text>
              </TouchableOpacity>
            </Animatable.View>

            {/* Footer */}
            <Animatable.View animation="fadeIn" duration={800} delay={800} style={styles.footer}>
              <Text style={styles.footerText}>
                En vous connectant, vous acceptez nos{' '}
                <Text style={styles.linkText}>Conditions d'utilisation</Text> et notre{' '}
                <Text style={styles.linkText}>Politique de confidentialité</Text>
              </Text>
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
    lineHeight: 24,
  },
  formSection: {
    flex: 1,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { 
      width: 0, 
      height: 8 
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    minHeight: 56,
  },
  disabledButton: {
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  registerButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  registerButtonTextBold: {
    color: '#6366F1',
    fontWeight: '700',
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#6366F1',
    fontWeight: '600',
  },
});
export default LoginScreen;