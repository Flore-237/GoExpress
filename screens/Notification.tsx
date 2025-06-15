import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_KEY = 'APP_NOTIFICATIONS';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  const notif = {
    id: Date.now().toString(),
    title: remoteMessage.notification?.title || 'Notification',
    body: remoteMessage.notification?.body || '',
    date: new Date().toLocaleString(),
  };

  try {
    // Charger les notifications existantes
    const data = await AsyncStorage.getItem(NOTIFICATION_KEY);
    const notifications = data ? JSON.parse(data) : [];
    // Ajouter la nouvelle notification
    const updated = [notif, ...notifications];
    // Sauvegarder
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erreur de sauvegarde des notifications (BG)', e);
  }
});

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);

  const saveNotifications = async (notifs) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifs));
    } catch (e) {
      console.error('Erreur de sauvegarde des notifications', e);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Erreur de chargement des notifications', e);
      return [];
    }
  };

  useEffect(() => {
    // Charger les notifications sauvegardées au démarrage
    loadNotifications().then((stored) => {
      setNotifications(stored);
    });

    // Écouter les notifications reçues en premier plan
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      const notif = {
        id: Date.now().toString(),
        title: remoteMessage.notification?.title || 'Notification',
        body: remoteMessage.notification?.body || '',
        date: new Date().toLocaleString(),
      };

      setNotifications((prev) => {
        const updated = [notif, ...prev];
        saveNotifications(updated); 
        return updated;
      });
    });

    messaging()
      .getToken()
      .then(token => {
        console.log('FCM Token:', token);
      })
      .catch(e => {
        console.log('Erreur FCM:', e);
      });

    return unsubscribe;
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.notificationCard}>
      <Icon name="notifications" size={24} color="#4169E1" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4169E1" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucune notification reçue.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFF' },
  header: {
    backgroundColor: '#4169E1',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  body: {
    color: '#555',
    marginTop: 2,
    marginBottom: 4,
  },
  date: {
    color: '#888',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
    fontSize: 16, 
  },
});

export default NotificationScreen;
