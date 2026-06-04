import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Dimensions } from 'react-native';
import ActivityIndicator from '../components/CustomLoader';
import { User, Phone, PlusCircle, ArrowRight, Lock } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';

export default function AdminAddEmployeeScreen({ route, navigation }) {
    const { adminUser, company } = route.params || {};
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = getSupabase();

    const handleAddEmployee = async () => {
        if (!name.trim() || !phone.trim() || !password.trim()) {
            Alert.alert('שגיאה', 'אנא מלא את כל השדות');
            return;
        }

        // Basic phone validation (digits)
        const phoneRegex = /^[0-9]{9,10}$/;
        if (!phoneRegex.test(phone.trim())) {
            Alert.alert('שגיאה', 'אנא הזן מספר טלפון תקין בעל 9-10 ספרות.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('שגיאה', 'על הסיסמה להכיל לפחות 6 תווים.');
            return;
        }

        setLoading(true);
        if (!adminUser || !company) {
            Alert.alert('שגיאה', 'נתוני חברה או מנהל חסרים.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.rpc('admin_add_service_employee', {
            admin_req_number: adminUser.admin_number,
            admin_req_password: adminUser.password,
            target_company_id: company.id,
            emp_name: name.trim(),
            emp_phone: phone.trim(),
            emp_password: password
        });

        setLoading(false);

        if (error) {
            console.error('Error adding employee via RPC:', error);
            Alert.alert('שגיאה בתהליך שמירת העובד', error.message || 'שגיאת רשת בלתי צפויה.');
        } else {
            Alert.alert('הצלחה', `העובד/ת ${name.trim()} נוסף לחברת ${company.name} בהצלחה!`, [
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
                <Text style={styles.headerTitle}>הוספת עובד לחברה</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.companySubHeader}>משייך עובד טכני / שירות לתוכו של המסוף השייך לחברת {company?.name}</Text>

                <Text style={styles.label}>שם עובד מלא</Text>
                <View style={styles.inputContainer}>
                    <User size={20} color="#f97316" />
                    <TextInput 
                        style={styles.input}
                        placeholder="לדוגמה: משה כהן"
                        placeholderTextColor="#64748b"
                        value={name}
                        onChangeText={setName}
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>מספר טלפון (ישמש במזהה ההתחברות)</Text>
                <View style={styles.inputContainer}>
                    <Phone size={20} color="#f97316" />
                    <TextInput 
                        style={styles.input}
                        placeholder="0501234567"
                        placeholderTextColor="#64748b"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="number-pad"
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>סיסמת התחברות ראשונית</Text>
                <View style={styles.inputContainer}>
                    <Lock size={20} color="#f97316" />
                    <TextInput 
                        style={styles.input}
                        placeholder="בחר סיסמה עבור העובד..."
                        placeholderTextColor="#64748b"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textAlign="right"
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                    onPress={handleAddEmployee}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <>
                            <PlusCircle size={24} color="#0F172A" />
                            <Text style={styles.submitButtonText}>צור עובד ושמור למאגר</Text>
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
    companySubHeader: {
        color: '#f97316',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        padding: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.2)'
    },
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
    submitButton: {
        backgroundColor: '#f97316',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 12,
        marginTop: 35,
        shadowColor: '#f97316',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    submitButtonText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' }
});
