/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Order, Product, SalesPerson } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
// @ts-ignore
import n2words from 'n2words';

// Define a premium color palette
const colors = {
    primary: '#2563eb', // Blue-600
    secondary: '#64748b', // Slate-500
    accent: '#f8fafc', // Slate-50
    border: '#e2e8f0', // Slate-200
    text: '#1e293b', // Slate-800
    white: '#ffffff',
};

const styles = StyleSheet.create({
    page: {
        paddingTop: 50,
        paddingBottom: 80, // Extra space for footer
        paddingLeft: 50,
        paddingRight: 50,
        fontSize: 10,
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
        color: colors.text,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
        paddingBottom: 20,
    },
    logoSection: {
        width: '40%',
    },
    logo: {
        width: 120,
        height: 'auto',
    },
    invoiceDetails: {
        width: '40%',
        alignItems: 'flex-end',
    },
    mainTitle: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        textTransform: 'uppercase',
        marginBottom: 20,
    },
    subDetails: {
        fontSize: 10,
        color: colors.secondary,
        marginBottom: 4,
    },
    // Address Section
    addressSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    addressBox: {
        width: '45%',
    },
    boxTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        color: colors.primary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    boxContent: {
        fontSize: 10,
        lineHeight: 1.6,
    },

    // Table
    table: {
        width: '100%',
        marginBottom: 20,
        borderRadius: 4,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    tableHeaderCell: {
        color: colors.white,
        fontFamily: 'Helvetica-Bold',
        fontSize: 9,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 8,
        paddingHorizontal: 6,
        alignItems: 'center',
    },
    tableRowStriped: {
        backgroundColor: colors.accent,
    },
    colDesc: { width: '50%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colTotal: { width: '17.5%', textAlign: 'right' },

    // Totals & Signature Container
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 10,
    },

    // Totals
    summarySection: {
        width: '50%',
    },
    summaryBox: {
        width: '100%',
        backgroundColor: colors.accent,
        padding: 15,
        borderRadius: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    summaryLabelCol: {
        width: '35%', // 35% for label
        fontSize: 10,
    },
    summaryValueCol: {
        width: '65%', // 65% for value to prevent wrapping
        textAlign: 'right',
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },

    totalRow: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 2,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    totalLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        width: '35%', // Match column width
    },
    totalValue: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 16,
        color: colors.primary,
        width: '65%', // Match column width
        textAlign: 'right',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 50,
        right: 50,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 15,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 8,
        color: colors.secondary,
        textAlign: 'center',
        marginBottom: 3,
    },
    signatureSection: {
        width: '40%',
        marginTop: 30,
        // marginRight: 40, // Removed to allow more space
        alignItems: 'flex-start',
        marginLeft: -20, // Pull signature left into the margin to create distance from table
    },
    signatureTitle: {
        fontSize: 10,
        color: colors.secondary,
        marginBottom: 10,
    },
    signatureImage: {
        width: 250,
        height: 150,
        objectFit: 'contain',
    },
});

interface InvoicePdfProps {
    order: Order;
    products: Product[];
    salesPeople: SalesPerson[];
}

const InvoicePdf = ({ order, products, salesPeople }: InvoicePdfProps) => {
    const autoEntrepreneur = salesPeople.find(p => p.fullName === order.salesPerson);
    const issueDate = order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    const totalNet = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        {/* Replace with your actual logo path */}
                        <Image src="/auto-entrepreneur-logo.png" style={styles.logo} />
                    </View>
                    <View style={styles.invoiceDetails}>
                        <Text style={styles.mainTitle}>FACTURE</Text>
                        <Text style={styles.subDetails}>#{order.id}</Text>
                        <Text style={styles.subDetails}>Date: {issueDate}</Text>
                    </View>
                </View>

                {/* ADDRESSES */}
                <View style={styles.addressSection}>
                    <View style={styles.addressBox}>
                        <Text style={styles.boxTitle}>Émetteur</Text>
                        <View style={styles.boxContent}>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{autoEntrepreneur?.fullName || 'Entreprise'}</Text>
                            <Text>{autoEntrepreneur?.address}</Text>
                            <Text>Tel: {autoEntrepreneur?.tel}</Text>
                            <Text>Email: {autoEntrepreneur?.email}</Text>
                        </View>
                    </View>

                    <View style={styles.addressBox}>
                        <Text style={styles.boxTitle}>Client</Text>
                        <View style={styles.boxContent}>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{order.companyName || order.customer.name}</Text>
                            <Text>{order.customer.address}</Text>
                            <Text>{order.customer.city}</Text>
                            {order.ice && <Text>ICE: {order.ice}</Text>}
                        </View>
                    </View>
                </View>

                {/* TABLE */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIPTION</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>QTÉ</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>PRIX UNIT.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
                    </View>

                    {order.items.map((item, idx) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                            <View key={idx} style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowStriped : {}]} wrap={false}>
                                <Text style={[styles.colDesc]}>{product?.title || item.productId}</Text>
                                <Text style={[styles.colQty]}>{item.quantity}</Text>
                                <Text style={[styles.colPrice]}>{formatCurrency(item.price)}</Text>
                                <Text style={[styles.colTotal, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(item.price * item.quantity)}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* SUMMARY & SIGNATURE - Grouped with wrap={false} to keep together */}
                <View wrap={false}>
                    <View style={styles.bottomSection}>
                        <View style={styles.signatureSection}>
                            <Text style={styles.signatureTitle}>Signature</Text>
                            {autoEntrepreneur?.signature && (
                                <Image src={autoEntrepreneur.signature} style={styles.signatureImage} />
                            )}
                        </View>

                        <View style={styles.summarySection}>
                            <View style={styles.summaryBox}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabelCol}>Total HT</Text>
                                    <Text style={styles.summaryValueCol}>{formatCurrency(totalNet)}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabelCol}>TVA (0%)</Text>
                                    <Text style={styles.summaryValueCol}>0.00 DH</Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>TOTAL NET</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(totalNet)}</Text>
                                </View>
                                <Text style={{ fontSize: 8, fontStyle: 'italic', marginTop: 12, color: colors.secondary, lineHeight: 1.3 }}>
                                    Montant exonéré de la TVA (Art 91-II-1 CGI)
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={{ marginTop: 20 }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10 }}>APRÊTÉ DE LA FACTURE :</Text>
                        <Text style={{ fontSize: 10, textTransform: 'uppercase' }}>
                            LA PRÉSENTE FACTURE EST ARRÊTÉE À LA SOMME DE : {n2words(totalNet, { lang: 'fr' })} DIRHAMS
                        </Text>
                    </View>
                </View>

                {/* FOOTER */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {autoEntrepreneur?.fullName} - {autoEntrepreneur?.address}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {autoEntrepreneur?.ice && <Text style={styles.footerText}>ICE: {autoEntrepreneur.ice}</Text>}
                        {autoEntrepreneur?.if && <Text style={styles.footerText}>IF: {autoEntrepreneur.if}</Text>}
                        {autoEntrepreneur?.tp && <Text style={styles.footerText}>TP: {autoEntrepreneur.tp}</Text>}
                        {autoEntrepreneur?.tp && <Text style={styles.footerText}>TP: {autoEntrepreneur.tp}</Text>}
                    </View>
                    <Text style={{ position: 'absolute', right: 0, top: 15, fontSize: 8, color: colors.secondary }} render={({ pageNumber, totalPages }) => (
                        `${pageNumber} / ${totalPages}`
                    )} />
                </View>

            </Page>
        </Document>
    );
};

export default InvoicePdf;
