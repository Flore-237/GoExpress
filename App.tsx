import React, { useEffect, useState } from 'react';
import { StyleSheet, StatusBar, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from 'react-native-splash-screen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { app } from './config/firebase';

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
import ReservationScreen from './screens/Reservations';
import HistoriqueReservation from './screens/HistoriqueReservation';
import ReservationHistory from './screens/HistoriqueReservation';

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
  AUTH: 'Auth',
  RESERVATION_SCREEN: 'ReservationScreen',
  RESERVATION_HISTORY: 'ReservationHistory', // Ajout de cette ligne
  HISTORIQUE_RESERVATION: 'HistoriqueReservation',
};

function AuthNavigator({ setIsLoggedIn }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name={ROUTES.LOGIN}>
        {(props) => <LoginScreen {...props} setIsLoggedIn={setIsLoggedIn} />}
      </AuthStack.Screen>
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

const MainStack = createNativeStackNavigator();

function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HOME} component={HomeScreen} />
      <Stack.Screen name={ROUTES.AGENCY_SELECT} component={AgencySelect} />
      <Stack.Screen name={ROUTES.AGENCY_DETAIL} component={AgencyDetail} />
      <Stack.Screen name={ROUTES.SEAT_SELECTION} component={SeatSelection} />
      <Stack.Screen name={ROUTES.PAYMENT} component={Payment} />
      <Stack.Screen name={ROUTES.TICKET} component={Tickets} />
      <Stack.Screen 
        name={ROUTES.RESERVATION_HISTORY} 
        component={ReservationHistory}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
}

function ReservationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.HISTORIQUE_RESERVATION} component={HistoriqueReservation} />
      <Stack.Screen name={ROUTES.DETAIL_RESERVATION} component={DetailReservation} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={ROUTES.PROFILE} component={Profile} />
      <Stack.Screen name={ROUTES.RESERVATIONS} component={Reservations} />
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

          if (route.name === 'HomeTab') iconName = 'home';
          else if (route.name === 'ReservationTab') iconName = 'calendar';
          else if (route.name === 'HelpTab') iconName = 'help-circle';
          else if (route.name === 'ProfileTab') iconName = 'user';

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
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="HomeTab" component={MainStackNavigator} options={{ title: 'Accueil' }} />
      <Tab.Screen name="ReservationTab" component={ReservationStack} options={{ title: 'Réservations' }} />
      <Tab.Screen name="HelpTab" component={HelpStack} options={{ title: 'Aide' }} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  console.log('App rendering...');
  
  useEffect(() => {
    console.log('App useEffect running...');
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
    console.log('Loading state...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e17eb" />
      </View>
    );
  }

  console.log('Rendering main content...');
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasOnboarded ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingNavigator onFinishOnboarding={handleFinishOnboarding} />}
          </Stack.Screen>
        ) : !isLoggedIn ? (
          <Stack.Screen name={ROUTES.AUTH}>
            {() => <AuthNavigator setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name={ROUTES.MAIN_TABS} component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    height: 60,
    paddingBottom: 5,
  },
  tabBarLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5e17eb',
  },
});

export default App;
