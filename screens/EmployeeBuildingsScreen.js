import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, MapPin, Building as BuildingIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { getEmployeeBuildings } from '../API/serviceProvidersApi';

export default function EmployeeBuildingsScreen({ route }) {
    const navigation = useNavigation();
    const user = route.params?.user;
    
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.id) {
            loadBuildings();
        }
    }, [user]);

    const loadBuildings = async () => {
        setLoading(true);
        try {
            const data = await getEmployeeBuildings(user.id);
            setBuildings(data);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const renderBuilding = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <BuildingIcon size={20} color="#3b82f6" />
                <Text style={styles.buildingName}>{item.name}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoText}>{item.address}</Text>
                    <MapPin size={16} color="#94a3b8" />
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statText}>עיר: {item.city || 'לא צוין'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowRight size={24} color="#f8fafc" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>הבניינים שלי</Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
                ) : buildings.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <BuildingIcon size={64} color="#334155" />
                        <Text style={styles.emptyText}>כרגע אינך משויך לאף בניין.</Text>
                        <Text style={styles.emptySubText}>כאשר נציג ועד יוסיף אותך לבניין שלו, תראה אותו כאן.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={buildings}
                        keyExtractor={(item) => item.id}
                        renderItem={renderBuilding}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 12,
    },
    buildingName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginRight: 8,
    },
    cardBody: {
        alignItems: 'flex-end',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#e2e8f0',
        marginRight: 6,
    },
    statsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        fontSize: 13,
        color: '#94a3b8',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#f8fafc',
        marginTop: 16,
        marginBottom: 8,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 20,
    }
});
