import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { onAuthStateChanged, signInWithGoogle } from '../services/auth';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setLoading(false);
      if (user) {
        router.replace('/map' as any);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setSigning(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Family App</Text>
      <Text style={styles.subtitle}>Compartí tu ubicación con tu familia</Text>
      
      <Pressable style={styles.button} onPress={handleLogin} disabled={signing}>
        {signing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Iniciar con Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});