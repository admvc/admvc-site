'use client'

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
    page: {
        padding: 30,
        backgroundColor: '#ffffff',
        fontSize: 9,
    },
    header: {
        marginBottom: 20,
        paddingBottom: 10,
        borderBottom: '2pt solid #3F6B4F',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3F6B4F',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 9,
        color: '#999',
        marginTop: 4,
    },
    table: {
        width: '100%',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#3F6B4F',
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottom: '0.5pt solid #eee',
    },
    tableRowAlt: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderBottom: '0.5pt solid #eee',
        backgroundColor: '#fafafa',
    },
    thText: {
        color: '#ffffff',
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tdText: {
        fontSize: 8,
        color: '#333',
    },
    col1: { width: '5%' },
    col2: { width: '25%' },
    col3: { width: '20%' },
    col4: { width: '15%' },
    col5: { width: '10%' },
    col6: { width: '10%' },
    col7: { width: '15%' },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7,
        color: '#ccc',
        borderTop: '0.5pt solid #eee',
        paddingTop: 6,
    },
})

interface MembroLista {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_1?: string | null
    id_city?: string | null
    status?: string | null
    church_role?: string | null
}

export default function ListaMembrosPDF({
    membros,
    igrejaName = 'ADMVC',
}: {
    membros: MembroLista[]
    igrejaName?: string
}) {
    const dataGerado = new Date().toLocaleDateString('pt-PT', {
        day: '2-digit', month: 'long', year: 'numeric'
    })

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>{igrejaName}</Text>
                    <Text style={styles.subtitle}>
                        Lista de Membros — {membros.length} registos — Gerado em {dataGerado}
                    </Text>
                </View>

                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.col1]}>#</Text>
                        <Text style={[styles.thText, styles.col2]}>Nome</Text>
                        <Text style={[styles.thText, styles.col3]}>Email</Text>
                        <Text style={[styles.thText, styles.col4]}>Telefone</Text>
                        <Text style={[styles.thText, styles.col5]}>Cidade</Text>
                        <Text style={[styles.thText, styles.col6]}>Status</Text>
                        <Text style={[styles.thText, styles.col7]}>Cargo</Text>
                    </View>

                    {/* Rows */}
                    {membros.map((m, i) => (
                        <View key={m.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                            <Text style={[styles.tdText, styles.col1]}>{m.id}</Text>
                            <Text style={[styles.tdText, styles.col2, { fontWeight: 'bold' }]}>
                                {m.first_name} {m.last_name}
                            </Text>
                            <Text style={[styles.tdText, styles.col3, { fontSize: 7 }]}>{m.email}</Text>
                            <Text style={[styles.tdText, styles.col4]}>{m.phone_1 || '—'}</Text>
                            <Text style={[styles.tdText, styles.col5]}>{m.id_city || '—'}</Text>
                            <Text style={[styles.tdText, styles.col6]}>{m.status || '—'}</Text>
                            <Text style={[styles.tdText, styles.col7]}>{m.church_role || 'Membro'}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.footer} fixed>
                    <Text>Sistema ADMVC — Documento Confidencial</Text>
                    <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
                </View>
            </Page>
        </Document>
    )
}
