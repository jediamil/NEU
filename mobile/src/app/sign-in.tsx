import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    View,
    useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    Badge,
    Button,
    Card,
    Field,
    Icon,
    T,
    ThemeContext,
    dark,
    light,
    row,
} from '../ui';
import { useStudent } from '../student-provider';

export default function SignIn() {
    const student = useStudent();
    const c = useColorScheme() === 'dark' ? dark : light;
    const insets = useSafeAreaInsets();
    const [register, setRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    if (student.signedIn) return <Redirect href="/home" />;
    return (
        <ThemeContext.Provider value={c}>
            <StatusBar style={c === dark ? 'light' : 'dark'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center' }}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        flexGrow: 1,
                        padding: 26,
                        paddingTop: Math.max(insets.top + 25, 45),
                        paddingBottom: Math.max(insets.bottom + 20, 30),
                        gap: 22,
                        width: '100%',
                        maxWidth: 520,
                    }}
                    style={{ width: '100%', maxWidth: 520 }}
                >
                    <View style={row}>
                        <View
                            style={{
                                padding: 12,
                                backgroundColor: c.greenSoft,
                                borderRadius: 17,
                            }}
                        >
                            <Icon name="heart-outline" size={30} />
                        </View>
                        <View>
                            <T size={19} weight="700">
                                NEU Health
                            </T>
                            <T size={10} color={c.muted}>
                                STUDENT COMPANION
                            </T>
                        </View>
                    </View>
                    <View style={{ paddingVertical: 18, gap: 14 }}>
                        <Badge>NEU STUDENT HEALTH</Badge>
                        <T
                            size={36}
                            weight="700"
                            style={{ letterSpacing: -1.5 }}
                        >
                            Your health,{'\n'}one step closer.
                        </T>
                        <T color={c.muted} size={14}>
                            A calmer way to plan your clinic visit and keep your
                            school-year records together.
                        </T>
                    </View>
                    <Card>
                        <T size={22} weight="700">
                            {register
                                ? 'Create your test account'
                                : 'Welcome back'}
                        </T>
                        <T
                            size={12}
                            color={c.muted}
                            style={{ marginTop: 8, marginBottom: 20 }}
                        >
                            Sign in to your private student space.
                        </T>
                        <View style={{ gap: 15 }}>
                            {register && (
                                <Field
                                    label="Full name"
                                    value={name}
                                    onChangeText={setName}
                                    maxLength={100}
                                    autoComplete="name"
                                    editable={!student.busy}
                                />
                            )}
                            <Field
                                label="Email address"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                maxLength={254}
                                editable={!student.busy}
                            />
                            <Field
                                label="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoCapitalize="none"
                                autoComplete={
                                    register
                                        ? 'new-password'
                                        : 'current-password'
                                }
                                maxLength={128}
                                editable={!student.busy}
                            />
                            {student.error && (
                                <T color={c.danger} size={12}>
                                    {student.error}
                                </T>
                            )}
                            {student.loading ? (
                                <ActivityIndicator color={c.green} />
                            ) : (
                                <Button
                                    loading={student.busy}
                                    disabled={
                                        !email.trim() ||
                                        password.length < 8 ||
                                        (register && name.trim().length < 2)
                                    }
                                    onPress={() => {
                                        void student
                                            .signIn(
                                                {
                                                    email,
                                                    password,
                                                    ...(register
                                                        ? { name }
                                                        : {}),
                                                },
                                                register,
                                            )
                                            .then((ok) => {
                                                if (ok) {
                                                    setPassword('');
                                                    router.replace('/home');
                                                }
                                            });
                                    }}
                                >
                                    {register ? 'Create account' : 'Sign in'}
                                </Button>
                            )}
                            <Button
                                secondary
                                disabled={student.busy || student.loading}
                                onPress={() => {
                                    setRegister((value) => !value);
                                    setPassword('');
                                }}
                            >
                                {register
                                    ? 'I already have an account'
                                    : 'Create a student account'}
                            </Button>
                        </View>
                    </Card>
                    <View style={[row, { alignItems: 'flex-start' }]}>
                        <Icon name="shield-checkmark-outline" size={19} />
                        <T size={11} color={c.muted} style={{ flex: 1 }}>
                            Your appointments and clearance records are shared
                            with the clinic. New student identity details await
                            clinic verification.
                        </T>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemeContext.Provider>
    );
}
