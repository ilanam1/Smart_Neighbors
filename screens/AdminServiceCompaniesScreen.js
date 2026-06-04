import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Image, Dimensions } from 'react-native';
import { 
    Briefcase, 
    ArrowRight, 
    Search,
    Wrench,
    SearchX,
    Plus
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { getSupabase } from '../DataBase/supabase';

export default function AdminServiceCompaniesScreen({ route, navigation }) {
    const { adminUser } = route.params || {};
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const supabase = getSupabase();

    useEffect(() => {
        fetchCompanies();
    }, []);

    async function fetchCompanies() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('service_companies')
                .select('*')
                .order('name', { ascending: true });
                
            if (error) {
                console.error("Error fetching companies:", error);
            } else {
                setCompanies(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Helper map for translating service types
    const serviceTypeMap = {
        'CLEANING': 'ניקיון',
        'ELECTRICIAN': 'חשמלאות',
        'SECURITY': 'אבטחה ושמירה',
        'PLUMBER': 'אינסטלציה',
        'GENERAL': 'אחזקה כללית',
    };

    const getTranslatedType = (type) => serviceTypeMap[type] || type;

    const filteredCompanies = companies.filter(c => {
        const q = searchQuery.toLowerCase();
        const typeTrans = getTranslatedType(c.service_type).toLowerCase();
        return (c.name && c.name.toLowerCase().includes(q)) || typeTrans.includes(q);
    });

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AdminCompanyDetails', { adminUser, company: item })}
        >
            <View style={styles.cardContainer}>
                <View style={styles.infoBlock}>
                    <View style={styles.titleRow}>
                        <Text style={styles.cName}>{item.name}</Text>
                        <Briefcase size={16} color="#f97316" style={{ marginLeft: 8 }} />
                    </View>
                    
                    <View style={styles.typeRow}>
                        <Text style={styles.cType}>{getTranslatedType(item.service_type)}</Text>
                        <Wrench size={14} color="#f97316" style={{ marginLeft: 6 }} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrapper}>
                    <ArrowRight size={24} color="#cbd5e1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>חברות שירות</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="חיפוש חברה או תחומי שירות..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign="right"
                />
                <Search size={20} color="#f97316" style={styles.searchIcon} />
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filteredCompanies}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Briefcase size={64} color="rgba(249, 115, 22, 0.4)" />
                            <Text style={styles.emptyText}>לא נמצאו חברות תואמות</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button (New Company) */}
            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => navigation.navigate('AdminAddCompany', { adminUser })}
                activeOpacity={0.8}
            >
                <Plus size={28} color="#0f172a" strokeWidth={3} />
            </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 65,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    backBtnWrapper: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    searchWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        marginHorizontal: 16,
        marginBottom: 24,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        height: 55,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
    },
    searchIcon: {
        marginLeft: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRightWidth: 4,
        borderRightColor: '#f97316',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        position: 'relative',
        overflow: 'hidden'
    },
    accentLine: {
        position: 'absolute',
        left: 0,
        top: '30%',
        width: 4,
        height: 48,
        backgroundColor: '#06b6d4',
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    infoBlock: {
        alignItems: 'flex-end',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    cName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cType: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: '#cbd5e1',
        fontSize: 18,
        marginTop: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        left: 24, 
        backgroundColor: '#f97316',
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f97316',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 8,
    }
});
