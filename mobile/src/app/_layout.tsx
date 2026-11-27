import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StudentProvider } from '../student-provider';

function AppUpdatePrompt() {
    useEffect(() => {
        if (!Updates.isEnabled) return;

        let mounted = true;
        let checking = false;
        let prompted = false;

        async function checkForUpdate() {
            if (
                !mounted ||
                checking ||
                prompted ||
                AppState.currentState !== 'active'
            )
                return;
            checking = true;
            try {
                const update = await Updates.checkForUpdateAsync();
                if (
                    !mounted ||
                    AppState.currentState !== 'active' ||
                    (!update.isAvailable && !update.isRollBackToEmbedded)
                )
                    return;

                prompted = true;
                Alert.alert(
                    'Update available',
                    'Download the update and restart NEU Health now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        {
                            text: 'Update now',
                            onPress: () => {
                                void applyUpdate();
                            },
                        },
                    ],
                );
            } catch {
                // Try again the next time the app comes to the foreground.
            } finally {
                checking = false;
            }
        }

        async function applyUpdate() {
            try {
                const update = await Updates.fetchUpdateAsync();
                if (!update.isNew && !update.isRollBackToEmbedded) {
                    prompted = false;
                    return;
                }
                await Updates.reloadAsync();
            } catch {
                prompted = false;
                Alert.alert(
                    'Update couldn’t be applied',
                    'Open the app again to retry.',
                );
            }
        }

        const subscription = AppState.addEventListener('change', (status) => {
            if (status === 'active') void checkForUpdate();
        });
        void checkForUpdate();
        return () => {
            mounted = false;
            subscription.remove();
        };
    }, []);

    return null;
}

export default function Layout() {
    return (
        <SafeAreaProvider>
            <StudentProvider>
                <AppUpdatePrompt />
                <Stack screenOptions={{ headerShown: false }} />
            </StudentProvider>
        </SafeAreaProvider>
    );
}
