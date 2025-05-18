import React, { useEffect, useState } from 'react';
import { StyleSheet, StatusBar, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from 'react-native-splash-screen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

// Import des écrans
import HomeScreen from './screens/Home';
import AgencyDetail from './screens/AgencyDetail';
import AgencySelect from './screens/AgencySelect';
import DetailReservation from './screens/DetailReservation';
import Help from './screens/Help';
import HoraireScreen from './screens/HoraireScreen';
import Payment from './screens/Payment';
import Profile from './screens/Profile';
import Reservations from './screens/Reservations';
import SearchResults from './screens/SearchResults';
import SeatSelection from './screens/Seat_selection';
import Tickets from './screens/Ticket';
import WelcomeScreen from './screens/WelcomScreen';
import FeaturesScreen from './screens/FutureScreen';
import FeaturesScreen3 from './screens/FutureScreen3';
import LoginScreen from './screens/Login';
import RegistrationScreen from './screens/singUp';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

export const ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  WELCOME: 'Welcome',
  FEATURES: 'Features',
  FEATURES3: 'Features3',
  HOME: 'Home',
  AGENCY_DETAIL: 'AgencyDetail',
  AGENCY_SELECT: 'AgencySelect',
  SEAT_SELECTION: 'SeatSelection',
  PAYMENT: 'Payment',
  TICKET: 'Ticket',
  RESERVATIONS: 'Reservations',
  SEARCH_RESULTS: 'SearchResults',
  HELP: 'Help',
  PROFILE: 'Profile',
  HORAIRE: 'Horaire',
  DETAIL_RESERVATION: 'DetailReservation',
  MAIN_TABS: 'MainTabs',
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <AuthStack.Screen name={ROUTES.REGISTER} component={RegistrationScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingNavigator({ onFinishOnboarding }) {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name={ROUTES.WELCOME}>
        {(props) => <WelcomeScreen {...props} onNext={() => props.navigation.navigate(ROUTES.FEATURES)} />}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name={ROUTES.FEATURES}>
        {(props) => <FeaturesScreen {...props} onNext={() => props.navigation.navigate(ROUTES.FEATURES3)} />}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen name={ROUTES.FEATURES3}>
        {(props) => <FeaturesScreen3 {...props} onNext={onFinishOnboarding} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.AGENCY_DETAIL} component={AgencyDetail} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.AGENCY_SELECT} component={AgencySelect} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.DETAIL_RESERVATION} component={DetailReservation} options={{ headerShown: false }} />
       <Stack.Screen name={ROUTES.SEARCH_RESULTS} component={SearchResults} options={{ headerShown: false }} />
      <Stack.Screen name={ROUTES.HORAIRE} component={HoraireScreen} options={{ title: 'Horaires' }} />
      <Stack.Screen name={ROUTES.SEAT_SELECTION} component={SeatSelection} options={{ title: 'Choix des sièges', headerBackTitle: 'Retour' }} />
      <Stack.Screen name={ROUTES.PAYMENT} component={Payment} options={{ title: 'Paiement' }} />
      <Stack.Screen name={ROUTES.TICKET} component={Tickets} options={{ title: 'Billets' }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.PROFILE} component={Profile} />
      <Stack.Screen name={ROUTES.RESERVATIONS} component={Reservations} options={{ title: 'Mes Réservations' }} />
    </Stack.Navigator>
  );
}

function HelpStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HELP} component={Help} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused }) => {
          let iconName;

          if (route.name === 'HomeTab') {
            iconName = 'home';
          } else if (route.name === 'HelpTab') {
            iconName = 'help-circle';
          } else if (route.name === 'ProfileTab') {
            iconName = 'user';
          }

          return (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Feather name={iconName} size={22} color={color} />
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: '#5e17eb',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true
      })}
    >
      <Tab.Screen name="HomeTab" component={MainStack} options={{ title: 'Accueil' }} />
      <Tab.Screen name="HelpTab" component={HelpStack} options={{ title: 'Aide' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkOnboardingAndAuth() {
      try {
        const onboarded = await AsyncStorage.getItem('hasOnboarded');
        const authToken = await AsyncStorage.getItem('authToken');

        setHasOnboarded(onboarded === 'true');
        setIsLoggedIn(!!authToken);
      } catch (error) {
        console.warn('Error checking status', error);
      } finally {
        setIsLoading(false);
        SplashScreen.hide();
      }
    }
    checkOnboardingAndAuth();
  }, []);

  const handleFinishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      setHasOnboarded(true);
    } catch (error) {
      console.warn('Error saving onboarding status', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e17eb" />
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor="#5e17eb" barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!hasOnboarded ? (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingNavigator onFinishOnboarding={handleFinishOnboarding} />}
            </Stack.Screen>
          ) : !isLoggedIn ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  tabBar: {
    height: 60,
    paddingBottom: 5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  activeIconContainer: {
    backgroundColor: '#5e17eb20',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 3,
    height: 4,
    width: 20,
    borderRadius: 2,
    backgroundColor: '#5e17eb',
  },
});

export default App;