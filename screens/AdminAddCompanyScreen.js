import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { Briefcase, PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';

const SERVICE_TYPES = [
    { key: 'CLEANING', label: 'ניקיון' },
    { key: 'ELECTRICIAN', label: 'חשמלאות' },
    { key: 'SECURITY', label: 'אבטחה ושמירה' },
    { key: 'PLUMBER', label: 'אינסטלציה' },
    { key: 'GENERAL', label: 'אחזקה כללית' }
];

export default function AdminAddCompanyScreen({ route, navigation }) {
    const { adminUser } = route.params || {};
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [selectedType, setSelectedType] = useState('GENERAL');
    const [loading, setLoading] = useState(false);
    const supabase = getSupabase();

    const handleAddCompany = async () => {
        if (!name.trim()) {
            Alert.alert('שגיאה', 'אנא הזן את שם החברה');
            return;
        }

        const numericPrice = Number(price);
        if (price.trim() === '' || isNaN(numericPrice) || numericPrice < 0) {
            Alert.alert('שגיאה', 'אנא הזן מחיר חודשי תקין (גדול או שווה ל-0)');
            return;
        }

        setLoading(true);
        if (!adminUser) {
            Alert.alert('שגיאה', 'שגיאת אימות. אנא התחבר מחדש כמנהל ראשי.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.rpc('admin_add_service_company', {
            admin_req_number: adminUser.admin_number,
            admin_req_password: adminUser.password,
            company_name: name.trim(),
            company_type: selectedType,
            company_price: numericPrice
        });

        setLoading(false);

        if (error) {
            console.error('Error adding company via RPC:', error);
            Alert.alert('שגיאה', error.message || 'לא ניתן לשמור את החברה, ייתכן ויש בעיית הרשאות או שגיאת רשת.');
        } else {
            Alert.alert('הצלחה', 'חברת השירות נוספה בהצלחה למערכת!', [
                { text: 'אישור', onPress: () => navigation.goBack() }
            ]);
        }
    };

    return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Image
        source={require('../assets/app_internal_bg.png')}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: Dimensions.get('screen').width,
          height: Dimensions.get('screen').height,
        }}
        resizeMode="cover"
      />
      <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowRight size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>הוספת חברת שירות</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>שם החברה</Text>
                <View style={styles.inputContainer}>
                    <Briefcase size={20} color="#f97316" />
                    <TextInput 
                        style={styles.input}
                        placeholder="לדוגמה: א.ד ניקיונות"
                        placeholderTextColor="#64748b"
                        value={name}
                        onChangeText={setName}
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>מחיר חודשי לעובד (₪)</Text>
                <View style={styles.inputContainer}>
                    <Briefcase size={20} color="#f97316" />
                    <TextInput 
                        style={styles.input}
                        placeholder="לדוגמה: 500"
                        placeholderTextColor="#64748b"
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>סוג השירות הניתן</Text>
                <View style={styles.chipContainer}>
                    {SERVICE_TYPES.map((type) => {
                        const isSelected = selectedType === type.key;
                        return (
                            <TouchableOpacity
                                key={type.key}
                                style={[
                                    styles.chip,
                                    isSelected && styles.chipSelected
                                ]}
                                onPress={() => setSelectedType(type.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.chipText,
                                    isSelected && styles.chipTextSelected
                                ]}>
                                    {type.label}
                                </Text>
                                {isSelected && (
                                    <CheckCircle2 size={16} color="#0F172A" style={{ marginLeft: 6 }} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity 
                    style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                    onPress={handleAddCompany}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <>
                            <PlusCircle size={24} color="#0F172A" />
                            <Text style={styles.submitButtonText}>הוסף למאגר בחברות</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingTop: 65,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: 'transparent',
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginRight: 15 },
    backBtn: { padding: 5 },
    content: { padding: 20, paddingBottom: 60 },
    label: { color: '#f8fafc', fontSize: 16, marginBottom: 8, fontWeight: '600', textAlign: 'right', marginTop: 15 },
    inputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 10,
        height: 55
    },
    input: { flex: 1, color: '#f8fafc', fontSize: 16, marginRight: 10 },
    chipContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 5,
        marginBottom: 20
    },
    chip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    chipSelected: {
        backgroundColor: '#f97316',
        borderColor: '#f97316',
    },
    chipText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '600'
    },
    chipTextSelected: {
        color: '#0F172A',
        fontWeight: 'bold'
    },
    submitButton: {
        backgroundColor: '#f97316',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 12,
        marginTop: 30,
        shadowColor: '#f97316',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    submitButtonText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' }
});
