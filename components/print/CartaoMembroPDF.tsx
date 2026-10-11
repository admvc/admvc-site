'use client'

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    page: {
        padding: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#ffffff',
    },
    card: {
        width: 252, // ~85mm credit card size
        height: 158, // ~54mm
        borderRadius: 10,
        border: '1.5pt solid #3F6B4F',
        overflow: 'hidden',
        position: 'relative',
    },
    header: {
        backgroundColor: '#3F6B4F',
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    churchName: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    cardId: {
        color: '#ffffff',
        fontSize: 7,
        opacity: 0.7,
    },
    body: {
        padding: 12,
        flex: 1,
        justifyContent: 'space-between',
    },
    nome: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textTransform: 'uppercase',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    label: {
        fontSize: 6,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 1,
    },
    value: {
        fontSize: 8,
        color: '#333',
        fontWeight: 'bold',
    },
    footer: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 6,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
})

interface MembroCartao {
    id: number
    first_name: string
    last_name: string
    church_role?: string | null
    phone_1?: string | null
    email: string
    status?: string | null
    data_admissao?: string | null
}

export default function CartaoMembroPDF({
    membros,
    igrejaName = 'ADMVC',
}: {
    membros: MembroCartao[]
    igrejaName?: string
}) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {membros.map(m => (
                    <View key={m.id} style={styles.card}>
                        <View style={styles.header}>
                            <Text style={styles.churchName}>{igrejaName}</Text>
                            <Text style={styles.cardId}>#{String(m.id).padStart(4, '0')}</Text>
                        </View>
                        <View style={styles.body}>
                            <View>
                                <Text style={styles.nome}>{m.first_name} {m.last_name}</Text>
                                <Text style={{ fontSize: 8, color: '#3F6B4F', marginTop: 2, textTransform: 'uppercase' }}>
                                    {m.church_role || 'Membro'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <View>
                                    <Text style={styles.label}>Contacto</Text>
                                    <Text style={styles.value}>{m.phone_1 || '—'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.label}>Admissao</Text>
                                    <Text style={styles.value}>
                                        {m.data_admissao ? new Date(m.data_admissao).toLocaleDateString('pt-PT') : '—'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.label}>Status</Text>
                                    <Text style={styles.value}>{m.status || 'ATIVO'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Cartao de Membro</Text>
                            <Text style={styles.footerText}>{m.email}</Text>
                        </View>
                    </View>
                ))}
            </Page>
        </Document>
    )
}
