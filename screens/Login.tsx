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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../screens/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { ROUTES } from '../App';

const LoginScreen = ({ setIsLoggedIn }) => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!email.trim()) {
      newErrors.email = 'Email est requis';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'Mot de passe requis';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      
      await AsyncStorage.setItem('authToken', token);
      setIsLoggedIn(true); // Met à jour l'état d'authentification
      
      // Redirection vers l'écran principal
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      });
      
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur', 'Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.innerContainer}
        >
          <Animatable.View animation="fadeInDown" duration={1000} style={styles.logoContainer}>
            <Image source={require('../assets/images/logo.png')} style={styles.logo} />
          </Animatable.View>

          <Animatable.View animation="fadeInUp" duration={1000} style={styles.formContainer}>
            <Text style={styles.title}>Connexion</Text>

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Mot de passe"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#666"
                  style={{ marginRight: 10 }}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate(ROUTES.REGISTER)}>
              <Text style={styles.registerText}>Pas de compte ? Inscrivez-vous</Text>
            </TouchableOpacity>
          </Animatable.View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  innerContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
  formContainer: { width: '100%' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#5e17eb'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  passwordInput: { flex: 1, padding: 12 },
  errorText: { color: 'red', marginBottom: 8, fontSize: 12 },
  button: {
    backgroundColor: '#5e17eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  registerText: {
    textAlign: 'center',
    color: '#5e17eb',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;