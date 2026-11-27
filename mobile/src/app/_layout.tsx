import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StudentProvider } from '../student-provider';
export default function Layout() {
    return (
        <SafeAreaProvider>
            <StudentProvider>
                <Stack screenOptions={{ headerShown: false }} />
            </StudentProvider>
        </SafeAreaProvider>
    );
}
