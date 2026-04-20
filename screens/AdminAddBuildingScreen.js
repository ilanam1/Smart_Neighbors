import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Building, MapPin, PlusCircle, ArrowRight } from 'lucide-react-native';
import { getSupabase } from '../DataBase/supabase';

export default function AdminAddBuildingScreen({ route, navigation }) {
    const { adminUser } = route.params || {};
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = getSupabase();

    const handleAddBuilding = async () => {
        if (!name.trim() || !address.trim() || !city.trim()) {
            Alert.alert('שגיאה', 'אנא מלא את כל השדות');
            return;
        }

        setLoading(true);
        if (!adminUser) {
            Alert.alert('שגיאה', 'שגיאת אימות. אנא התחבר מחדש מנהל.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.rpc('admin_add_building', {
            admin_req_number: adminUser.admin_number,
            admin_req_password: adminUser.password,
            building_name: name.trim(),
            building_address: address.trim(),
            building_city: city.trim()
        });

        setLoading(false);

        if (error) {
            console.error('Error adding building via RPC:', error);
            Alert.alert('שגיאה', error.message || 'לא ניתן לשמור את הבניין, ייתכן ויש בעיית הרשאות או שגיאת רשת.');
        } else {
            Alert.alert('הצלחה', 'הבניין נוסף בהצלחה למערכת!', [
                { text: 'אישור', onPress: () => navigation.goBack() }
            ]);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowRight size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>הוסף בניין לשירות</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>שם הבניין</Text>
                <View style={styles.inputContainer}>
                    <Building size={20} color="#9ca3af" />
                    <TextInput 
                        style={styles.input}
                        placeholder="לדוגמה: בניין סביון"
                        placeholderTextColor="#64748b"
                        value={name}
                        onChangeText={setName}
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>כתובת מלאה</Text>
                <View style={styles.inputContainer}>
                    <MapPin size={20} color="#9ca3af" />
                    <TextInput 
                        style={styles.input}
                        placeholder="רחוב ומספר"
                        placeholderTextColor="#64748b"
                        value={address}
                        onChangeText={setAddress}
                        textAlign="right"
                    />
                </View>

                <Text style={styles.label}>עיר</Text>
                <View style={styles.inputContainer}>
                    <Building size={20} color="#9ca3af" />
                    <TextInput 
                        style={styles.input}
                        placeholder="לדוגמה: תל אביב"
                        placeholderTextColor="#64748b"
                        value={city}
                        onChangeText={setCity}
                        textAlign="right"
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                    onPress={handleAddBuilding}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <>
                            <PlusCircle size={24} color="#0F172A" />
                            <Text style={styles.submitButtonText}>הוסף בניין למערכת</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginRight: 15 },
    backBtn: { padding: 5 },
    content: { padding: 20 },
    label: { color: '#f8fafc', fontSize: 16, marginBottom: 8, fontWeight: '600', textAlign: 'right', marginTop: 10 },
    inputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 10,
        height: 55
    },
    input: { flex: 1, color: '#f8fafc', fontSize: 16, marginRight: 10 },
    submitButton: {
        backgroundColor: '#00f2ff',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
        borderRadius: 12,
        marginTop: 30,
        shadowColor: '#00f2ff',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    submitButtonText: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' }
});
