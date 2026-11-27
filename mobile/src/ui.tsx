import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import type {
    StyleProp,
    TextInputProps,
    TextStyle,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const light = {
    bg: '#F5F7F4',
    surface: '#FFFFFF',
    ink: '#20372C',
    muted: '#78867D',
    green: '#1C6149',
    greenSoft: '#E6F1E9',
    border: '#E4EAE4',
    blue: '#477EA3',
    blueSoft: '#EAF1F7',
    amber: '#A37932',
    amberSoft: '#F9F1DF',
    danger: '#A54D49',
    hero: '#174D3B',
    heroText: '#E1F1E7',
    overlay: '#102A2266',
    input: '#F7F9F6',
};
export type Palette = typeof light;
export const dark: Palette = {
    bg: '#0E1A15',
    surface: '#17271F',
    ink: '#E6F1E8',
    muted: '#9BAEA1',
    green: '#9BCDAE',
    greenSoft: '#253E30',
    border: '#293E31',
    blue: '#95BEDA',
    blueSoft: '#1E3442',
    amber: '#D9BB7D',
    amberSoft: '#3A3220',
    danger: '#EBA8A1',
    hero: '#214D3B',
    heroText: '#E1F1E7',
    overlay: '#020A08AA',
    input: '#122219',
};
export const ThemeContext = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeContext);
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
    name,
    size = 22,
    color,
}: {
    name: IconName;
    size?: number;
    color?: string;
}) {
    const c = useTheme();
    return <Ionicons name={name} size={size} color={color ?? c.green} />;
}
export function T({
    children,
    size = 14,
    weight = '400',
    color,
    style,
    lines,
}: {
    children: ReactNode;
    size?: number;
    weight?: TextStyle['fontWeight'];
    color?: string;
    style?: StyleProp<TextStyle>;
    lines?: number;
}) {
    const c = useTheme();
    return (
        <Text
            maxFontSizeMultiplier={1.6}
            numberOfLines={lines}
            style={[
                {
                    color: color ?? c.ink,
                    fontSize: size,
                    fontWeight: weight,
                    lineHeight: Math.round(size * 1.5),
                    letterSpacing: -0.2,
                },
                style,
            ]}
        >
            {children}
        </Text>
    );
}
export function Card({
    children,
    onPress,
    style,
    accessibilityLabel,
}: {
    children: ReactNode;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}) {
    const c = useTheme();
    const styles: StyleProp<ViewStyle> = [
        {
            backgroundColor: c.surface,
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: c.border,
        },
        style,
    ];
    return onPress ? (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            onPress={onPress}
            style={({ pressed }) => [styles, pressed && { opacity: 0.75 }]}
        >
            {children}
        </Pressable>
    ) : (
        <View style={styles}>{children}</View>
    );
}
export function Button({
    children,
    onPress,
    secondary = false,
    disabled = false,
    loading = false,
    icon,
    style,
}: {
    children: string;
    onPress: () => void;
    secondary?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: IconName;
    style?: StyleProp<ViewStyle>;
}) {
    const c = useTheme();
    const textColor = secondary ? c.green : '#FFFFFF';
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{
                disabled: disabled || loading,
                busy: loading,
            }}
            disabled={disabled || loading}
            onPress={onPress}
            style={({ pressed }) => [
                {
                    minHeight: 52,
                    paddingHorizontal: 18,
                    paddingVertical: 13,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 9,
                    backgroundColor: secondary ? c.greenSoft : '#246A50',
                    opacity: disabled || loading ? 0.45 : pressed ? 0.8 : 1,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textColor} size="small" />
            ) : icon ? (
                <Icon name={icon} size={19} color={textColor} />
            ) : null}
            <T weight="600" color={textColor}>
                {children}
            </T>
        </Pressable>
    );
}
export function Badge({
    children,
    tone = 'green',
}: {
    children: string;
    tone?: 'green' | 'blue' | 'amber' | 'muted';
}) {
    const c = useTheme();
    const color = tone === 'muted' ? c.muted : c[tone];
    const backgroundColor =
        tone === 'muted'
            ? c.input
            : c[(tone + 'Soft') as 'greenSoft' | 'blueSoft' | 'amberSoft'];
    return (
        <View
            style={{
                alignSelf: 'flex-start',
                borderRadius: 9,
                paddingHorizontal: 9,
                paddingVertical: 4,
                backgroundColor,
            }}
        >
            <T size={10} weight="600" color={color}>
                {children}
            </T>
        </View>
    );
}
export function Section({
    title,
    action,
    onPress,
}: {
    title: string;
    action?: string;
    onPress?: () => void;
}) {
    const c = useTheme();
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginTop: 6,
            }}
        >
            <T size={18} weight="700">
                {title}
            </T>
            {action && onPress && (
                <Pressable
                    accessibilityRole="button"
                    onPress={onPress}
                    style={{ paddingVertical: 12, paddingLeft: 10 }}
                >
                    <T size={12} weight="600" color={c.green}>
                        {action}
                    </T>
                </Pressable>
            )}
        </View>
    );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
    const c = useTheme();
    return (
        <View style={{ gap: 7 }}>
            <T size={12} weight="600">
                {label}
            </T>
            <TextInput
                accessibilityLabel={label}
                placeholderTextColor={c.muted}
                {...props}
                style={[
                    {
                        backgroundColor: c.input,
                        borderColor: c.border,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                        minHeight: 50,
                        borderRadius: 13,
                        color: c.ink,
                        fontSize: 14,
                    },
                    props.style,
                ]}
            />
        </View>
    );
}
export function Sheet({
    title,
    children,
    onClose,
    disabled = false,
}: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    disabled?: boolean;
}) {
    const c = useTheme();
    const insets = useSafeAreaInsets();
    return (
        <Modal
            transparent
            visible
            animationType="slide"
            onRequestClose={() => {
                if (!disabled) onClose();
            }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    backgroundColor: c.overlay,
                }}
            >
                <Pressable
                    accessibilityLabel="Close panel"
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={onClose}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    accessibilityViewIsModal
                    style={{
                        backgroundColor: c.bg,
                        width: '100%',
                        maxWidth: 520,
                        maxHeight: '93%',
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        paddingBottom: Math.max(20, insets.bottom),
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 24,
                            paddingTop: 22,
                            paddingBottom: 16,
                            borderBottomColor: c.border,
                            borderBottomWidth: 1,
                        }}
                    >
                        <T size={20} weight="700" style={{ flex: 1 }}>
                            {title}
                        </T>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close panel"
                            onPress={onClose}
                            disabled={disabled}
                            style={{ padding: 8, marginRight: -8 }}
                        >
                            <Icon
                                name="close-outline"
                                color={c.muted}
                                size={26}
                            />
                        </Pressable>
                    </View>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ padding: 24, gap: 18 }}
                    >
                        {children}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
export function Empty({
    title,
    description,
    icon = 'calendar-outline',
}: {
    title: string;
    description: string;
    icon?: IconName;
}) {
    const c = useTheme();
    return (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 10 }}>
            <View
                style={{
                    backgroundColor: c.greenSoft,
                    borderRadius: 20,
                    padding: 16,
                }}
            >
                <Icon name={icon} size={28} />
            </View>
            <T weight="600" size={17}>
                {title}
            </T>
            <T size={13} color={c.muted} style={{ textAlign: 'center' }}>
                {description}
            </T>
        </Card>
    );
}
export const row: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
};
export const stack: ViewStyle = { gap: 16 };
