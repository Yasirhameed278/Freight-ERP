/**
 * Freight ERP — Demo Seed Script
 * Run: node src/seed.js
 *
 * Creates realistic freight forwarding data for prospect demos.
 * WARNING: Clears all existing data before seeding.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User     = require('./models/User');
const Client   = require('./models/Client');
const Shipment = require('./models/Shipment');
const Invoice  = require('./models/Invoice');
const Deal     = require('./models/Deal');
const Rate     = require('./models/Rate');
const Counter  = require('./models/Counter');
const Task     = require('./models/Task');

/* ── helpers ─────────────────────────────────────────────────── */
const daysAgo   = (n) => new Date(Date.now() - n * 864e5);
const daysAhead = (n) => new Date(Date.now() + n * 864e5);
const pick      = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function hashPw(pw) { return bcrypt.hash(pw, 10); }

/* ── main ────────────────────────────────────────────────────── */
async function seed() {
  await connectDB();
  console.log('\n🌱  Starting seed — clearing existing data…\n');

  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Shipment.deleteMany({}),
    Invoice.deleteMany({}),
    Deal.deleteMany({}),
    Rate.deleteMany({}),
    Counter.deleteMany({}),
    Task.deleteMany({}),
  ]);
  console.log('✅  Collections cleared');

  /* ── 1. USERS ─────────────────────────────────────────────── */
  const pw = await hashPw('Demo@1234');

  const users = await User.insertMany([
    { firstName: 'Ali',     lastName: 'Ahmed',      email: 'admin@freightpro.ae',      password: pw, role: 'admin',            department: 'management',  status: 'active' },
    { firstName: 'Sana',    lastName: 'Malik',      email: 'manager@freightpro.ae',    password: pw, role: 'manager',          department: 'management',  status: 'active' },
    { firstName: 'Usman',   lastName: 'Khan',       email: 'ops@freightpro.ae',        password: pw, role: 'operations',       department: 'operations',  status: 'active' },
    { firstName: 'Fatima',  lastName: 'Riaz',       email: 'sales@freightpro.ae',      password: pw, role: 'sales',            department: 'sales',       status: 'active' },
    { firstName: 'Hamza',   lastName: 'Sheikh',     email: 'finance@freightpro.ae',    password: pw, role: 'finance',          department: 'finance',     status: 'active' },
    { firstName: 'Ayesha',  lastName: 'Qureshi',    email: 'cs@freightpro.ae',         password: pw, role: 'customer_service', department: 'operations',  status: 'active' },
  ]);

  const [admin, manager, ops, sales, finance, cs] = users;
  console.log(`✅  ${users.length} users created  (password: Demo@1234)`);

  /* ── 2. CLIENTS ───────────────────────────────────────────── */
  const clients = await Client.insertMany([
    // Shippers
    {
      clientCode: 'APXMFG', companyName: 'Apex Manufacturing Ltd', type: 'shipper',
      email: 'logistics@apexmfg.cn', phone: '+86 21 5500 1234',
      creditLimit: 150000, creditDays: 45, currency: 'USD',
      addresses: [{ label: 'HQ', street: '1288 Pudong Ave', city: 'Shanghai', country: 'China', countryCode: 'CN', isPrimary: true }],
      contacts: [{ name: 'Liu Ming', designation: 'Export Manager', email: 'liu@apexmfg.cn', phone: '+86 136 0000 1111', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'GLTDMC', companyName: 'Global Trade DMCC', type: 'both',
      email: 'ops@globaltrade.ae', phone: '+971 4 355 8800',
      creditLimit: 250000, creditDays: 30, currency: 'USD',
      addresses: [{ label: 'HQ', street: 'Jumeirah Lakes Towers', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', isPrimary: true }],
      contacts: [{ name: 'Omar Farooq', designation: 'Operations Director', email: 'omar@globaltrade.ae', phone: '+971 50 234 5678', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'PCFEXP', companyName: 'Pacific Exports Pte Ltd', type: 'shipper',
      email: 'export@pacificexports.sg', phone: '+65 6221 9900',
      creditLimit: 80000, creditDays: 30, currency: 'USD',
      addresses: [{ label: 'HQ', street: '10 Anson Road', city: 'Singapore', country: 'Singapore', countryCode: 'SG', isPrimary: true }],
      contacts: [{ name: 'Tan Boon Kiat', designation: 'Logistics Manager', email: 'bktan@pacificexports.sg', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    // Consignees
    {
      clientCode: 'PREMRT', companyName: 'Premier Retail Group LLC', type: 'consignee',
      email: 'supply@premierretail.ae', phone: '+971 4 299 7700',
      creditLimit: 200000, creditDays: 60, currency: 'AED',
      addresses: [{ label: 'Warehouse', street: 'Jebel Ali Free Zone', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', isPrimary: true }],
      contacts: [{ name: 'Fatima Al Zaabi', designation: 'Supply Chain Manager', email: 'fatima@premierretail.ae', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'EURLOG', companyName: 'EuroLine Distribution GmbH', type: 'consignee',
      email: 'import@euroline.de', phone: '+49 40 3000 5500',
      creditLimit: 120000, creditDays: 45, currency: 'EUR',
      addresses: [{ label: 'HQ', street: 'Speicherstadt 12', city: 'Hamburg', country: 'Germany', countryCode: 'DE', isPrimary: true }],
      contacts: [{ name: 'Klaus Richter', designation: 'Import Manager', email: 'krichter@euroline.de', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'SILKRT', companyName: 'Silk Road Trading Co', type: 'consignee',
      email: 'trade@silkroad.sa', phone: '+966 11 445 2200',
      creditLimit: 90000, creditDays: 30, currency: 'USD',
      addresses: [{ label: 'HQ', street: 'King Fahd Road', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', isPrimary: true }],
      contacts: [{ name: 'Faisal Al Dossari', designation: 'Procurement Head', email: 'faisal@silkroad.sa', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    // Agents
    {
      clientCode: 'TRGLOG', companyName: 'Triton Global Logistics', type: 'agent',
      email: 'agency@tritonlogistics.com', phone: '+44 20 7946 0000',
      creditLimit: 50000, creditDays: 30, currency: 'GBP',
      addresses: [{ label: 'HQ', street: '45 London Wall', city: 'London', country: 'United Kingdom', countryCode: 'GB', isPrimary: true }],
      contacts: [{ name: 'James O\'Brien', designation: 'Agency Director', email: 'jobrien@tritonlogistics.com', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    // Vendors / Carriers
    {
      clientCode: 'MSKSHP', companyName: 'Maersk Line (Vendor)', type: 'vendor',
      email: 'gst.uae@maersk.com', phone: '+971 4 228 0800',
      creditLimit: 0, creditDays: 0, currency: 'USD',
      addresses: [{ label: 'Office', street: 'Port Rashid', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'EMPAIR', companyName: 'Emirates SkyCargo (Vendor)', type: 'vendor',
      email: 'cargo@emirates.com', phone: '+971 4 708 1200',
      creditLimit: 0, creditDays: 0, currency: 'USD',
      addresses: [{ label: 'Office', street: 'Dubai International Airport', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
    {
      clientCode: 'FSTTRK', companyName: 'FastTruck Transport LLC', type: 'trucker',
      email: 'dispatch@fasttruck.ae', phone: '+971 6 543 2100',
      creditLimit: 20000, creditDays: 15, currency: 'AED',
      addresses: [{ label: 'Depot', street: 'Industrial Area 12', city: 'Sharjah', country: 'United Arab Emirates', countryCode: 'AE', isPrimary: true }],
      status: 'active', kycStatus: 'verified',
    },
  ]);

  const [apex, globalTrade, pacific, premier, euroline, silkRoad, triton, maersk, emiratesCargo, fastTruck] = clients;
  console.log(`✅  ${clients.length} clients created`);

  /* ── 3. RATES ─────────────────────────────────────────────── */
  const rates = await Rate.insertMany([
    {
      rateCode: 'SEA-DXB-HAM-01', name: 'Dubai → Hamburg FCL Maersk',
      mode: 'sea', type: 'FCL', direction: 'export',
      origin:      { name: 'Jebel Ali Port', code: 'AEJEA', country: 'UAE', countryCode: 'AE' },
      destination: { name: 'Port of Hamburg', code: 'DEHAM', country: 'Germany', countryCode: 'DE' },
      carrier: 'Maersk', carrierCode: 'MAEU', transitTimeDays: 22, frequency: 'Weekly',
      validFrom: daysAgo(60), validTo: daysAhead(120),
      charges: [
        { code: 'OF',  description: 'Ocean Freight 20GP',   amount: 850,  currency: 'USD', basis: 'per_container', containerType: '20GP', category: 'freight' },
        { code: 'OF',  description: 'Ocean Freight 40GP',   amount: 1400, currency: 'USD', basis: 'per_container', containerType: '40GP', category: 'freight' },
        { code: 'OF',  description: 'Ocean Freight 40HC',   amount: 1500, currency: 'USD', basis: 'per_container', containerType: '40HC', category: 'freight' },
        { code: 'BAF', description: 'Bunker Adjustment',    amount: 120,  currency: 'USD', basis: 'per_container', category: 'fuel' },
        { code: 'BL',  description: 'B/L Fee',             amount: 75,   currency: 'USD', basis: 'per_bl',        category: 'documentation' },
      ],
      markupType: 'percentage', markupValue: 18,
      isContractRate: true, status: 'active', vendor: maersk._id,
    },
    {
      rateCode: 'SEA-SHA-DXB-01', name: 'Shanghai → Dubai FCL MSC',
      mode: 'sea', type: 'FCL', direction: 'import',
      origin:      { name: 'Shanghai Port', code: 'CNSHA', country: 'China', countryCode: 'CN' },
      destination: { name: 'Jebel Ali Port', code: 'AEJEA', country: 'UAE', countryCode: 'AE' },
      carrier: 'MSC', carrierCode: 'MSCU', transitTimeDays: 14, frequency: 'Bi-weekly',
      validFrom: daysAgo(30), validTo: daysAhead(90),
      charges: [
        { code: 'OF',  description: 'Ocean Freight 40HC', amount: 680,  currency: 'USD', basis: 'per_container', containerType: '40HC', category: 'freight' },
        { code: 'PSS', description: 'Peak Season Surcharge', amount: 200, currency: 'USD', basis: 'per_container', category: 'other' },
        { code: 'BL',  description: 'B/L Fee',           amount: 60,   currency: 'USD', basis: 'per_bl', category: 'documentation' },
      ],
      markupType: 'percentage', markupValue: 20,
      isContractRate: true, status: 'active', vendor: maersk._id,
    },
    {
      rateCode: 'AIR-DXB-LHR-01', name: 'Dubai → London Heathrow Air',
      mode: 'air', type: 'AIR', direction: 'export',
      origin:      { name: 'Dubai International Airport', code: 'DXB', country: 'UAE', countryCode: 'AE' },
      destination: { name: 'London Heathrow Airport', code: 'LHR', country: 'United Kingdom', countryCode: 'GB' },
      carrier: 'Emirates SkyCargo', transitTimeDays: 1,
      validFrom: daysAgo(15), validTo: daysAhead(60),
      charges: [
        { code: 'AF',  description: 'Air Freight',        amount: 2.80, currency: 'USD', basis: 'per_kg', category: 'freight' },
        { code: 'FSC', description: 'Fuel Surcharge',     amount: 0.45, currency: 'USD', basis: 'per_kg', category: 'fuel' },
        { code: 'SSC', description: 'Security Surcharge', amount: 0.12, currency: 'USD', basis: 'per_kg', category: 'security' },
        { code: 'AWB', description: 'AWB Fee',            amount: 40,   currency: 'USD', basis: 'per_awb', category: 'documentation' },
      ],
      markupType: 'percentage', markupValue: 22,
      isContractRate: false, isSpotRate: true, status: 'active', vendor: emiratesCargo._id,
    },
    {
      rateCode: 'ROD-DXB-RUH-01', name: 'Dubai → Riyadh Road (FTL)',
      mode: 'road', type: 'FTL', direction: 'export',
      origin:      { name: 'Dubai', code: 'AEDXB', country: 'UAE', countryCode: 'AE' },
      destination: { name: 'Riyadh', code: 'SARUH', country: 'Saudi Arabia', countryCode: 'SA' },
      carrier: 'FastTruck Transport', transitTimeDays: 2,
      validFrom: daysAgo(90), validTo: daysAhead(90),
      charges: [
        { code: 'RF',  description: 'Road Freight (FTL)', amount: 1200, currency: 'USD', basis: 'per_shipment', category: 'freight' },
        { code: 'TCH', description: 'Transit Charges',   amount: 150,  currency: 'USD', basis: 'per_shipment', category: 'other' },
      ],
      markupType: 'percentage', markupValue: 25,
      isContractRate: true, status: 'active', vendor: fastTruck._id,
    },
    {
      rateCode: 'SEA-DXB-SGP-01', name: 'Dubai → Singapore LCL',
      mode: 'sea', type: 'LCL', direction: 'export',
      origin:      { name: 'Jebel Ali Port', code: 'AEJEA', country: 'UAE', countryCode: 'AE' },
      destination: { name: 'Port of Singapore', code: 'SGSIN', country: 'Singapore', countryCode: 'SG' },
      carrier: 'CMA CGM', transitTimeDays: 12,
      validFrom: daysAgo(20), validTo: daysAhead(100),
      charges: [
        { code: 'LCL', description: 'LCL Freight',    amount: 28, currency: 'USD', basis: 'per_cbm',  category: 'freight' },
        { code: 'OHC', description: 'Origin Handling', amount: 45, currency: 'USD', basis: 'per_shipment', category: 'origin' },
        { code: 'BL',  description: 'B/L Fee',        amount: 55, currency: 'USD', basis: 'per_bl',   category: 'documentation' },
      ],
      markupType: 'percentage', markupValue: 20,
      isContractRate: false, isSpotRate: true, status: 'active',
    },
  ]);
  console.log(`✅  ${rates.length} rates created`);

  /* ── 4. SHIPMENTS ─────────────────────────────────────────── */
  const shipmentsData = [
    // 1. Sea FCL Export — Dubai → Hamburg — in_transit
    {
      shipmentNumber: 'SEA-2025-0001',
      mode: 'sea', type: 'FCL', direction: 'export',
      status: 'in_transit', approvalStatus: 'approved',
      shipper: apex._id, consignee: euroline._id, customer: apex._id, agent: triton._id,
      carrier: 'Maersk', carrierCode: 'MAEU',
      mblNumber: 'MAEU25010012345', hblNumber: 'FPAE25010001',
      bookingNumber: 'BKG-25010099',
      vesselName: 'MSC GÜLSÜN', voyageNumber: '511W',
      portOfLoading:   { name: 'Jebel Ali Port', code: 'AEJEA', city: 'Dubai', country: 'UAE' },
      portOfDischarge: { name: 'Port of Hamburg', code: 'DEHAM', city: 'Hamburg', country: 'Germany' },
      placeOfReceipt:  { name: 'Apex Factory', city: 'Shanghai', country: 'China' },
      placeOfDelivery: { name: 'EuroLine Warehouse', city: 'Hamburg', country: 'Germany' },
      etd: daysAgo(12), eta: daysAhead(10),
      bookingDate: daysAgo(25), cargoReadyDate: daysAgo(18), cutoffDate: daysAgo(15),
      containers: [
        { containerNumber: 'APMU1234567', containerType: '40HC', sealNumber: 'SL88811', grossWeight: 18500, cbm: 58 },
        { containerNumber: 'BKLU9876543', containerType: '40HC', sealNumber: 'SL88812', grossWeight: 17200, cbm: 55 },
      ],
      cargo: [{ description: 'Electronic Components — PCBs & Modules', packages: 840, packageType: 'CARTON', grossWeight: 35700, volume: 113 }],
      incoterm: 'FOB', paymentTerms: 'Prepaid',
      charges: [
        { type: 'revenue', description: 'Ocean Freight (2×40HC)', category: 'freight',       amount: 3600, currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Origin Handling Charges', category: 'origin',        amount: 480,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'B/L Fee',                 category: 'documentation', amount: 150,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Ocean Freight — Maersk',  category: 'freight',       amount: 3000, currency: 'USD', exchangeRate: 1, quantity: 1, vendor: maersk._id },
        { type: 'cost',    description: 'Port Handling — AEJEA',   category: 'origin',        amount: 320,  currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 4230, totalCost: 3320, profit: 910,
      milestones: [
        { event: 'Booking Confirmed',   status: 'completed', actualDate: daysAgo(25) },
        { event: 'Cargo Received',      status: 'completed', actualDate: daysAgo(18) },
        { event: 'Customs Export Done', status: 'completed', actualDate: daysAgo(14) },
        { event: 'Vessel Departed',     status: 'completed', actualDate: daysAgo(12) },
        { event: 'Vessel Arrived',      status: 'pending',   plannedDate: daysAhead(10) },
        { event: 'Customs Clearance',   status: 'pending',   plannedDate: daysAhead(11) },
        { event: 'Final Delivery',      status: 'pending',   plannedDate: daysAhead(14) },
      ],
      operationsManager: ops._id, salesRep: sales._id,
    },

    // 2. Sea FCL Import — Shanghai → Dubai — delivered
    {
      shipmentNumber: 'SEA-2025-0002',
      mode: 'sea', type: 'FCL', direction: 'import',
      status: 'delivered', approvalStatus: 'approved',
      shipper: apex._id, consignee: premier._id, customer: premier._id,
      carrier: 'MSC', carrierCode: 'MSCU',
      mblNumber: 'MSCU25009876543', hblNumber: 'FPAE25009002',
      bookingNumber: 'BKG-25009055',
      vesselName: 'MSC OSCAR', voyageNumber: '408E',
      portOfLoading:   { name: 'Shanghai Port', code: 'CNSHA', city: 'Shanghai', country: 'China' },
      portOfDischarge: { name: 'Jebel Ali Port', code: 'AEJEA', city: 'Dubai', country: 'UAE' },
      placeOfDelivery: { name: 'Premier Retail Warehouse, JAFZA', city: 'Dubai', country: 'UAE' },
      etd: daysAgo(40), eta: daysAgo(25), bookingDate: daysAgo(55), cargoReadyDate: daysAgo(45),
      containers: [
        { containerNumber: 'MSCU1111222', containerType: '40HC', sealNumber: 'MS00991', grossWeight: 22000, cbm: 62 },
      ],
      cargo: [{ description: 'Household Goods — Furniture & Décor', packages: 1200, packageType: 'CARTON', grossWeight: 22000, volume: 62 }],
      incoterm: 'CIF', paymentTerms: 'Prepaid',
      charges: [
        { type: 'revenue', description: 'Ocean Freight (1×40HC)', category: 'freight',       amount: 1850, currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Customs Clearance Fee',  category: 'customs',       amount: 650,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Destination Handling',   category: 'destination',   amount: 420,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Delivery to Warehouse',  category: 'other',         amount: 280,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'MSC Ocean Freight',      category: 'freight',       amount: 900,  currency: 'USD', exchangeRate: 1, quantity: 1, vendor: maersk._id },
        { type: 'cost',    description: 'Customs Duty & VAT',     category: 'customs',       amount: 480,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Trucking to Warehouse',  category: 'destination',   amount: 200,  currency: 'USD', exchangeRate: 1, quantity: 1, vendor: fastTruck._id },
      ],
      totalRevenue: 3200, totalCost: 1580, profit: 1620,
      milestones: [
        { event: 'Booking Confirmed', status: 'completed', actualDate: daysAgo(55) },
        { event: 'Cargo Loaded',      status: 'completed', actualDate: daysAgo(40) },
        { event: 'Vessel Departed',   status: 'completed', actualDate: daysAgo(40) },
        { event: 'Vessel Arrived',    status: 'completed', actualDate: daysAgo(25) },
        { event: 'Customs Cleared',   status: 'completed', actualDate: daysAgo(23) },
        { event: 'Delivered',         status: 'completed', actualDate: daysAgo(21) },
      ],
      operationsManager: ops._id, salesRep: sales._id,
    },

    // 3. Air Export — Dubai → London — cleared
    {
      shipmentNumber: 'AIR-2025-0001',
      mode: 'air', type: 'AIR', direction: 'export',
      status: 'cleared', approvalStatus: 'approved',
      shipper: globalTrade._id, consignee: triton._id, customer: globalTrade._id,
      carrier: 'Emirates SkyCargo',
      awbNumber: '176-12345678', masterAwbNumber: '176-12345678',
      flightNumber: 'EK9701',
      portOfLoading:   { name: 'Dubai International Airport', code: 'DXB', city: 'Dubai', country: 'UAE' },
      portOfDischarge: { name: 'London Heathrow Airport', code: 'LHR', city: 'London', country: 'United Kingdom' },
      etd: daysAgo(5), eta: daysAgo(4),
      bookingDate: daysAgo(8), cargoReadyDate: daysAgo(6), cutoffDate: daysAgo(5),
      cargo: [{ description: 'Pharmaceutical Supplies — Temperature Controlled', packages: 48, packageType: 'CARTON', grossWeight: 720, volume: 3.2, dangerousGoods: false }],
      chargeableWeight: 720,
      incoterm: 'DAP', paymentTerms: 'Prepaid',
      charges: [
        { type: 'revenue', description: 'Air Freight (720 kg)',     category: 'freight',       amount: 2890, currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Fuel Surcharge',           category: 'other',         amount: 324,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Security Surcharge',       category: 'other',         amount: 86,   currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'AWB & Documentation',      category: 'documentation', amount: 120,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Emirates SkyCargo Freight', category: 'freight',       amount: 2016, currency: 'USD', exchangeRate: 1, quantity: 1, vendor: emiratesCargo._id },
        { type: 'cost',    description: 'Airport Handling DXB',     category: 'origin',        amount: 180,  currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 3420, totalCost: 2196, profit: 1224,
      milestones: [
        { event: 'Booking Confirmed',    status: 'completed', actualDate: daysAgo(8) },
        { event: 'Cargo Received at CDG',status: 'completed', actualDate: daysAgo(5) },
        { event: 'Flight Departed',      status: 'completed', actualDate: daysAgo(5) },
        { event: 'Arrived at LHR',       status: 'completed', actualDate: daysAgo(4) },
        { event: 'Customs Cleared',      status: 'completed', actualDate: daysAgo(4) },
        { event: 'Out for Delivery',     status: 'pending',   plannedDate: daysAhead(1) },
      ],
      operationsManager: ops._id, salesRep: sales._id,
    },

    // 4. Road Export — Dubai → Riyadh — in_transit
    {
      shipmentNumber: 'ROD-2025-0001',
      mode: 'road', type: 'FTL', direction: 'export',
      status: 'in_transit', approvalStatus: 'approved',
      shipper: globalTrade._id, consignee: silkRoad._id, customer: globalTrade._id,
      carrier: 'FastTruck Transport LLC',
      truckNumber: 'UAE-DXB-55788', driverName: 'Ramesh Kumar',
      portOfLoading:   { name: 'Dubai, UAE', code: 'AEDXB', city: 'Dubai', country: 'UAE' },
      portOfDischarge: { name: 'Riyadh, KSA', code: 'SARUH', city: 'Riyadh', country: 'Saudi Arabia' },
      etd: daysAgo(1), eta: daysAhead(1),
      bookingDate: daysAgo(4), cargoReadyDate: daysAgo(2), cutoffDate: daysAgo(1),
      cargo: [{ description: 'Building Materials — Steel Profiles', packages: 30, packageType: 'BUNDLE', grossWeight: 18000 }],
      incoterm: 'DAP', paymentTerms: 'Cash Collect',
      charges: [
        { type: 'revenue', description: 'Road Freight (FTL)',    category: 'freight',       amount: 1800, currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Transit Documentation', category: 'documentation', amount: 200,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Truck Hire — FastTruck', category: 'freight',      amount: 1200, currency: 'USD', exchangeRate: 1, quantity: 1, vendor: fastTruck._id },
        { type: 'cost',    description: 'Border Charges',        category: 'customs',       amount: 150,  currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 2000, totalCost: 1350, profit: 650,
      milestones: [
        { event: 'Booking Confirmed',  status: 'completed', actualDate: daysAgo(4) },
        { event: 'Truck Dispatched',   status: 'completed', actualDate: daysAgo(1) },
        { event: 'At Border Crossing', status: 'in_progress', actualDate: new Date() },
        { event: 'Delivered',          status: 'pending',   plannedDate: daysAhead(1) },
      ],
      operationsManager: ops._id, salesRep: sales._id,
    },

    // 5. Sea LCL — Dubai → Singapore — booked
    {
      shipmentNumber: 'SEA-2025-0003',
      mode: 'sea', type: 'LCL', direction: 'export',
      status: 'booked', approvalStatus: 'approved',
      shipper: pacific._id, consignee: premier._id, customer: pacific._id,
      carrier: 'CMA CGM',
      hblNumber: 'FPAE25012003',
      bookingNumber: 'BKG-25012011',
      portOfLoading:   { name: 'Jebel Ali Port', code: 'AEJEA', city: 'Dubai', country: 'UAE' },
      portOfDischarge: { name: 'Port of Singapore', code: 'SGSIN', city: 'Singapore', country: 'Singapore' },
      etd: daysAhead(8), eta: daysAhead(20),
      bookingDate: daysAgo(3), cargoReadyDate: daysAhead(5), cutoffDate: daysAhead(6),
      cargo: [{ description: 'Fashion Accessories & Garments', packages: 280, packageType: 'CARTON', grossWeight: 1850, volume: 14.5 }],
      incoterm: 'FOB', paymentTerms: 'Prepaid',
      charges: [
        { type: 'revenue', description: 'LCL Freight (14.5 CBM)',   category: 'freight',       amount: 580,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Origin CFS Charges',       category: 'origin',        amount: 180,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'B/L Fee',                  category: 'documentation', amount: 75,   currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'CMA CGM LCL Freight',      category: 'freight',       amount: 406,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'CFS Handling',             category: 'origin',        amount: 120,  currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 835, totalCost: 526, profit: 309,
      milestones: [
        { event: 'Booking Confirmed', status: 'completed', actualDate: daysAgo(3) },
        { event: 'Cargo Ready',       status: 'pending',   plannedDate: daysAhead(5) },
        { event: 'CFS Cut-off',       status: 'pending',   plannedDate: daysAhead(6) },
        { event: 'Vessel Departure',  status: 'pending',   plannedDate: daysAhead(8) },
        { event: 'Arrival Singapore', status: 'pending',   plannedDate: daysAhead(20) },
      ],
      operationsManager: cs._id, salesRep: sales._id,
    },

    // 6. Sea FCL Import — Hamburg → Dubai — quote stage
    {
      shipmentNumber: 'SEA-2025-0004',
      mode: 'sea', type: 'FCL', direction: 'import',
      status: 'quote', approvalStatus: 'pending',
      shipper: euroline._id, consignee: globalTrade._id, customer: globalTrade._id,
      carrier: 'Hapag-Lloyd',
      portOfLoading:   { name: 'Port of Hamburg', code: 'DEHAM', city: 'Hamburg', country: 'Germany' },
      portOfDischarge: { name: 'Jebel Ali Port', code: 'AEJEA', city: 'Dubai', country: 'UAE' },
      etd: daysAhead(18), eta: daysAhead(40),
      bookingDate: new Date(),
      containers: [
        { containerType: '20GP' },
        { containerType: '20GP' },
      ],
      cargo: [{ description: 'Industrial Machinery — CNC Equipment', packages: 12, packageType: 'CRATE', grossWeight: 28000 }],
      incoterm: 'CFR', paymentTerms: 'Prepaid',
      charges: [
        { type: 'revenue', description: 'Ocean Freight (2×20GP)', category: 'freight',       amount: 2200, currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Destination Handling',   category: 'destination',   amount: 550,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Customs Clearance',      category: 'customs',       amount: 680,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Hapag-Lloyd Freight',    category: 'freight',       amount: 1700, currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 3430, totalCost: 1700, profit: 1730,
      milestones: [
        { event: 'Quote Prepared', status: 'completed', actualDate: new Date() },
        { event: 'Booking',        status: 'pending',   plannedDate: daysAhead(5) },
      ],
      operationsManager: ops._id, salesRep: sales._id,
    },

    // 7. Air Import — Mumbai → Dubai — arrived
    {
      shipmentNumber: 'AIR-2025-0002',
      mode: 'air', type: 'AIR', direction: 'import',
      status: 'arrived', approvalStatus: 'approved',
      shipper: apex._id, consignee: premier._id, customer: premier._id,
      carrier: 'IndiGo Cargo',
      awbNumber: '085-55667788',
      flightNumber: '6E-9801',
      portOfLoading:   { name: 'Chhatrapati Shivaji Airport', code: 'BOM', city: 'Mumbai', country: 'India' },
      portOfDischarge: { name: 'Dubai International Airport', code: 'DXB', city: 'Dubai', country: 'UAE' },
      etd: daysAgo(3), eta: daysAgo(2),
      bookingDate: daysAgo(6),
      cargo: [{ description: 'Textile Samples & Fabric Swatches', packages: 24, packageType: 'BOX', grossWeight: 180, volume: 0.9 }],
      chargeableWeight: 180,
      incoterm: 'EXW', paymentTerms: 'Collect',
      charges: [
        { type: 'revenue', description: 'Air Freight (180 kg)',  category: 'freight',       amount: 720,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Customs Clearance',     category: 'customs',       amount: 280,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'revenue', description: 'Airport Delivery',      category: 'destination',   amount: 150,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'IndiGo Cargo Freight',  category: 'freight',       amount: 504,  currency: 'USD', exchangeRate: 1, quantity: 1 },
        { type: 'cost',    description: 'Airport Ground Handling', category: 'destination', amount: 90,   currency: 'USD', exchangeRate: 1, quantity: 1 },
      ],
      totalRevenue: 1150, totalCost: 594, profit: 556,
      milestones: [
        { event: 'Booking Confirmed', status: 'completed', actualDate: daysAgo(6) },
        { event: 'Flight Departed',   status: 'completed', actualDate: daysAgo(3) },
        { event: 'Arrived at DXB',    status: 'completed', actualDate: daysAgo(2) },
        { event: 'Customs Clearance', status: 'in_progress', actualDate: new Date() },
        { event: 'Delivery',          status: 'pending',   plannedDate: daysAhead(1) },
      ],
      operationsManager: cs._id, salesRep: sales._id,
    },
  ];

  const shipments = await Shipment.insertMany(shipmentsData);
  console.log(`✅  ${shipments.length} shipments created`);

  /* ── 5. INVOICES ──────────────────────────────────────────── */
  const now = new Date();
  const makeLines = (items) => items.map(({ desc, qty = 1, price }) => {
    const amount = qty * price;
    return { description: desc, quantity: qty, unitPrice: price, amount, taxRate: 5, taxAmount: +(amount * 0.05).toFixed(2), total: +(amount * 1.05).toFixed(2) };
  });

  const invoicesData = [
    // Paid invoice for SEA-0002
    {
      invoiceNumber: 'INV-2025-0001', type: 'ar',
      client: premier._id, shipment: shipments[1]._id,
      issueDate: daysAgo(30), dueDate: daysAgo(0),
      lines: makeLines([
        { desc: 'Ocean Freight (1×40HC) — SHA/DXB', price: 1850 },
        { desc: 'Customs Clearance Fee', price: 650 },
        { desc: 'Destination Handling Charges', price: 420 },
        { desc: 'Delivery to JAFZA Warehouse', price: 280 },
      ]),
      subtotal: 3200, taxTotal: 160, total: 3360, amountPaid: 3360, amountDue: 0,
      currency: 'USD', status: 'paid',
      payments: [{ amount: 3360, currency: 'USD', paidOn: daysAgo(5), method: 'bank_transfer', reference: 'TT-250501-001' }],
      paymentTerms: 'Net 30', notes: 'Thank you for your business.',
    },
    // Sent (unpaid) invoice for SEA-0001
    {
      invoiceNumber: 'INV-2025-0002', type: 'ar',
      client: apex._id, shipment: shipments[0]._id,
      issueDate: daysAgo(10), dueDate: daysAhead(20),
      lines: makeLines([
        { desc: 'Ocean Freight (2×40HC) — AEJEA/DEHAM', price: 3600 },
        { desc: 'Origin Handling Charges', price: 480 },
        { desc: 'B/L Fee', price: 150 },
      ]),
      subtotal: 4230, taxTotal: 211.50, total: 4441.50, amountPaid: 0, amountDue: 4441.50,
      currency: 'USD', status: 'sent',
      paymentTerms: 'Net 30', sentAt: daysAgo(10),
    },
    // Overdue invoice — 45 days overdue!
    {
      invoiceNumber: 'INV-2025-0003', type: 'ar',
      client: silkRoad._id,
      issueDate: daysAgo(75), dueDate: daysAgo(45),
      lines: makeLines([
        { desc: 'Freight Forwarding Services — Q4 2024', price: 5800 },
        { desc: 'Customs Clearance (3 shipments)', price: 1950 },
        { desc: 'Detention Charges', price: 400 },
      ]),
      subtotal: 8150, taxTotal: 407.50, total: 8557.50, amountPaid: 0, amountDue: 8557.50,
      currency: 'USD', status: 'overdue',
      paymentTerms: 'Net 30', notes: 'OVERDUE — Please remit payment immediately.',
    },
    // Partially paid invoice
    {
      invoiceNumber: 'INV-2025-0004', type: 'ar',
      client: globalTrade._id, shipment: shipments[2]._id,
      issueDate: daysAgo(20), dueDate: daysAhead(10),
      lines: makeLines([
        { desc: 'Air Freight (720 kg) — DXB/LHR', price: 2890 },
        { desc: 'Fuel & Security Surcharges', price: 410 },
        { desc: 'AWB & Documentation', price: 120 },
      ]),
      subtotal: 3420, taxTotal: 171, total: 3591, amountPaid: 1800, amountDue: 1791,
      currency: 'USD', status: 'partially_paid',
      payments: [{ amount: 1800, currency: 'USD', paidOn: daysAgo(8), method: 'bank_transfer', reference: 'TT-250429-042' }],
      paymentTerms: 'Net 30',
    },
    // AP Invoice (payable to Maersk)
    {
      invoiceNumber: 'APINV-2025-001', type: 'ap',
      client: apex._id, vendor: maersk._id, shipment: shipments[0]._id,
      issueDate: daysAgo(18), dueDate: daysAhead(12),
      lines: makeLines([
        { desc: 'Ocean Freight (2×40HC) — MAEU — SEA-2025-0001', price: 3000 },
        { desc: 'Port Handling — Jebel Ali', price: 320 },
      ]),
      subtotal: 3320, taxTotal: 0, total: 3320, amountPaid: 0, amountDue: 3320,
      currency: 'USD', status: 'sent',
      paymentTerms: 'Net 30',
    },
    // Another overdue — smaller
    {
      invoiceNumber: 'INV-2025-0005', type: 'ar',
      client: pacific._id,
      issueDate: daysAgo(50), dueDate: daysAgo(20),
      lines: makeLines([
        { desc: 'Sea Freight Forwarding Services', price: 2200 },
        { desc: 'Documentation & Compliance', price: 350 },
      ]),
      subtotal: 2550, taxTotal: 127.50, total: 2677.50, amountPaid: 0, amountDue: 2677.50,
      currency: 'USD', status: 'overdue',
      paymentTerms: 'Net 30',
    },
    // Draft invoice for latest Air shipment
    {
      invoiceNumber: 'INV-2025-0006', type: 'ar',
      client: premier._id, shipment: shipments[6]._id,
      issueDate: new Date(), dueDate: daysAhead(30),
      lines: makeLines([
        { desc: 'Air Freight (180 kg) — BOM/DXB', price: 720 },
        { desc: 'Customs Clearance', price: 280 },
        { desc: 'Airport Delivery', price: 150 },
      ]),
      subtotal: 1150, taxTotal: 57.50, total: 1207.50, amountPaid: 0, amountDue: 1207.50,
      currency: 'USD', status: 'draft',
      paymentTerms: 'Net 30',
    },
  ];

  const invoices = await Invoice.insertMany(invoicesData);
  console.log(`✅  ${invoices.length} invoices created`);

  /* ── 6. DEALS ─────────────────────────────────────────────── */
  const dealsData = [
    {
      dealCode: 'DL-2025-001',
      title: 'ACME Motors — Monthly FCL China–Dubai',
      stage: 'confirmed', probability: 90, position: 0,
      client: premier._id, owner: sales._id,
      estimatedValue: 18000, currency: 'USD',
      expectedCloseDate: daysAhead(15),
      source: 'referral', shipmentMode: 'sea', direction: 'import',
      origin: 'Shanghai, China', destination: 'Dubai, UAE',
      priority: 'high',
      description: 'Monthly contract for 4×40HC from Shanghai. Customer confirmed, awaiting final sign-off.',
    },
    {
      dealCode: 'DL-2025-002',
      title: 'EuroLine GmbH — Air Cargo Pharma Lane',
      stage: 'quoted', probability: 60, position: 0,
      client: euroline._id, owner: sales._id,
      estimatedValue: 45000, currency: 'USD',
      expectedCloseDate: daysAhead(30),
      source: 'cold_call', shipmentMode: 'air', direction: 'export',
      origin: 'Dubai, UAE', destination: 'Frankfurt, Germany',
      priority: 'urgent',
      description: 'Temperature-controlled pharma fortnightly air shipments. Quote submitted, awaiting procurement approval.',
    },
    {
      dealCode: 'DL-2025-003',
      title: 'Silk Road Trading — Annual Road Contract',
      stage: 'inquiry', probability: 25, position: 0,
      client: silkRoad._id, owner: sales._id,
      estimatedValue: 96000, currency: 'USD',
      expectedCloseDate: daysAhead(60),
      source: 'trade_show', shipmentMode: 'road', direction: 'export',
      origin: 'Dubai, UAE', destination: 'Riyadh, Saudi Arabia',
      priority: 'normal',
      description: 'Annual road freight contract for construction materials. Initial inquiry from GulfLog 2025 expo.',
    },
    {
      dealCode: 'DL-2025-004',
      title: 'Pacific Exports — Singapore LCL Consolidation',
      stage: 'quoted', probability: 55, position: 1,
      client: pacific._id, owner: sales._id,
      estimatedValue: 12000, currency: 'USD',
      expectedCloseDate: daysAhead(20),
      source: 'inbound', shipmentMode: 'sea', direction: 'export',
      origin: 'Dubai, UAE', destination: 'Singapore',
      priority: 'normal',
      description: 'Bi-weekly LCL consolidation to Singapore. Competing against 2 other forwarders.',
    },
    {
      dealCode: 'DL-2025-005',
      title: 'Global Trade DMCC — Multimodal UK Project',
      stage: 'confirmed', probability: 85, position: 1,
      client: globalTrade._id, owner: sales._id,
      estimatedValue: 28000, currency: 'USD',
      expectedCloseDate: daysAhead(10),
      source: 'referral', shipmentMode: 'multimodal', direction: 'export',
      origin: 'Dubai, UAE', destination: 'London, UK',
      priority: 'high',
      description: 'Sea+Air multimodal for time-sensitive project cargo. High-value deal, requires manager approval.',
    },
    {
      dealCode: 'DL-2025-006',
      title: 'Apex Manufacturing — Bulk Chemical Import',
      stage: 'lost', probability: 0, position: 0,
      client: apex._id, owner: sales._id,
      estimatedValue: 35000, currency: 'USD',
      expectedCloseDate: daysAgo(10),
      source: 'cold_call', shipmentMode: 'sea', direction: 'import',
      origin: 'Rotterdam, Netherlands', destination: 'Dubai, UAE',
      priority: 'normal',
      description: 'Lost to competitor on pricing. Customer selected a Tier-1 forwarder with better rates on this lane.',
    },
    {
      dealCode: 'DL-2025-007',
      title: 'Triton Global — Agency Partnership Agreement',
      stage: 'on_hold', probability: 40, position: 0,
      client: triton._id, owner: manager._id,
      estimatedValue: 120000, currency: 'USD',
      expectedCloseDate: daysAhead(90),
      source: 'partner', shipmentMode: 'sea', direction: 'cross_trade',
      priority: 'high',
      description: 'Strategic agency partnership for cross-trade volumes. On hold pending legal review of commission structure.',
    },
    {
      dealCode: 'DL-2025-008',
      title: 'Premier Retail — Seasonal Air Freight Q3',
      stage: 'inquiry', probability: 30, position: 1,
      client: premier._id, owner: sales._id,
      estimatedValue: 22000, currency: 'USD',
      expectedCloseDate: daysAhead(45),
      source: 'inbound', shipmentMode: 'air', direction: 'import',
      origin: 'Guangzhou, China', destination: 'Dubai, UAE',
      priority: 'normal',
      description: 'Q3 seasonal peak air freight for retail stock replenishment. Customer evaluating options.',
    },
  ];

  const deals = await Deal.insertMany(dealsData);
  console.log(`✅  ${deals.length} deals created`);

  /* ── 7. TASKS ────────────────────────────────────────────── */
  const [shp1, shp2, shp3, shp4, shp5, shp6, shp7] = shipments;
  const [deal1, deal2, deal3, deal4, deal5] = deals;

  const tasksData = [
    // ── TO DO (open) ─────────────────────────────────────────
    {
      title: 'Prepare customs declaration for SEA-2025-0004',
      description: 'Draft import customs declaration for 2×20GP CNC machinery from Hamburg. Verify HS codes and confirm duty rates with customs broker.',
      status: 'open', priority: 'urgent',
      assignedTo: ops._id, createdBy: manager._id,
      dueAt: daysAhead(2),
      linkedTo: { kind: 'Shipment', id: shp4._id, label: 'SEA-2025-0004' },
      tags: ['customs', 'import'],
    },
    {
      title: 'Send booking confirmation to Pacific Exports',
      description: 'Forward CMA CGM booking confirmation and pre-alert to Pacific Exports Pte Ltd. Include CFS cutoff reminder.',
      status: 'open', priority: 'high',
      assignedTo: cs._id, createdBy: ops._id,
      dueAt: daysAhead(1),
      linkedTo: { kind: 'Shipment', id: shp3._id, label: 'SEA-2025-0003' },
      tags: ['booking', 'sea'],
    },
    {
      title: 'Chase overdue payment — Silk Road Trading',
      description: 'INV-2025-0003 is 45 days overdue. Send final demand letter and escalate to manager if no response within 48 hours.',
      status: 'open', priority: 'urgent',
      assignedTo: finance._id, createdBy: manager._id,
      dueAt: new Date(),
      linkedTo: { kind: 'Client', id: silkRoad._id, label: 'Silk Road Trading Co' },
      tags: ['collections', 'overdue'],
    },
    {
      title: 'Obtain cargo insurance certificate for AIR-2025-0002',
      description: 'Customer requested all-risk cargo insurance for textile samples. Issue certificate before customs release.',
      status: 'open', priority: 'normal',
      assignedTo: cs._id, createdBy: ops._id,
      dueAt: daysAhead(1),
      linkedTo: { kind: 'Shipment', id: shp7._id, label: 'AIR-2025-0002' },
      tags: ['insurance', 'air'],
    },
    {
      title: 'Request rate update from Maersk for Q3',
      description: 'Current rate sheet SEA-DXB-HAM-01 expires in 120 days. Request renewed contract rates for Q3 to allow advance pricing.',
      status: 'open', priority: 'normal',
      assignedTo: sales._id, createdBy: manager._id,
      dueAt: daysAhead(14),
      linkedTo: { kind: 'Deal', id: deal1._id, label: 'ACME Motors — Monthly FCL China–Dubai' },
      tags: ['rates', 'sea'],
    },
    {
      title: 'Schedule site visit for EuroLine pharma lane review',
      description: 'EuroLine procurement team wants a facility tour and SOP walk-through before signing the air freight contract.',
      status: 'open', priority: 'high',
      assignedTo: sales._id, createdBy: sales._id,
      dueAt: daysAhead(7),
      linkedTo: { kind: 'Deal', id: deal2._id, label: 'EuroLine GmbH — Air Cargo Pharma Lane' },
      tags: ['sales', 'air'],
    },

    // ── IN PROGRESS (in_progress) ─────────────────────────────
    {
      title: 'Track SEA-2025-0001 ETA update from Maersk',
      description: 'Vessel MSC GÜLSÜN voyage 511W — confirm arrival window at Hamburg. Update customer and co-loader 48 hrs ahead.',
      status: 'in_progress', priority: 'high',
      assignedTo: ops._id, createdBy: ops._id,
      dueAt: daysAhead(3),
      linkedTo: { kind: 'Shipment', id: shp1._id, label: 'SEA-2025-0001' },
      tags: ['tracking', 'sea'],
    },
    {
      title: 'Coordinate last-mile delivery for AIR-2025-0001',
      description: 'Pharma cargo cleared at LHR customs. Arrange temperature-controlled van from Heathrow to Triton\'s London depot.',
      status: 'in_progress', priority: 'urgent',
      assignedTo: cs._id, createdBy: ops._id,
      dueAt: daysAhead(1),
      linkedTo: { kind: 'Shipment', id: shp3._id, label: 'AIR-2025-0001' },
      tags: ['delivery', 'air', 'pharma'],
    },
    {
      title: 'Process import customs clearance — AIR-2025-0002',
      description: 'Submit customs entry for 180 kg textile samples. Coordinate with broker for HS classification and duty payment.',
      status: 'in_progress', priority: 'high',
      assignedTo: ops._id, createdBy: manager._id,
      dueAt: new Date(),
      linkedTo: { kind: 'Shipment', id: shp7._id, label: 'AIR-2025-0002' },
      tags: ['customs', 'import', 'air'],
    },
    {
      title: 'Prepare quote for Silk Road annual road contract',
      description: 'Build costing model for 12-month road freight contract DXB→RUH. Include fuel escalation clause and detention terms.',
      status: 'in_progress', priority: 'normal',
      assignedTo: sales._id, createdBy: manager._id,
      dueAt: daysAhead(5),
      linkedTo: { kind: 'Deal', id: deal3._id, label: 'Silk Road Trading — Annual Road Contract' },
      tags: ['quoting', 'road'],
    },
    {
      title: 'Finalize Triton Global agency commission structure',
      description: 'Legal reviewed standard NVO agreement. Align on commission % for cross-trade lanes and revenue sharing cap.',
      status: 'in_progress', priority: 'high',
      assignedTo: manager._id, createdBy: admin._id,
      dueAt: daysAhead(10),
      linkedTo: { kind: 'Deal', id: deal5._id, label: 'Global Trade DMCC — Multimodal UK Project' },
      tags: ['legal', 'partnership'],
    },

    // ── REVIEW (review) ───────────────────────────────────────
    {
      title: 'Review & approve B/L draft for SEA-2025-0001',
      description: 'Maersk issued draft B/L. Verify consignee details, notify of loading, marks & numbers vs packing list. Confirm with Apex before release.',
      status: 'review', priority: 'high',
      assignedTo: manager._id, createdBy: ops._id,
      dueAt: daysAhead(2),
      linkedTo: { kind: 'Shipment', id: shp1._id, label: 'SEA-2025-0001' },
      tags: ['documents', 'sea'],
    },
    {
      title: 'Review spot quote — SEA-2025-0004 machinery import',
      description: 'Hapag-Lloyd spot rate higher than contract benchmark. Review P&L before approving quote to Global Trade DMCC.',
      status: 'review', priority: 'urgent',
      assignedTo: manager._id, createdBy: sales._id,
      dueAt: daysAhead(1),
      linkedTo: { kind: 'Shipment', id: shp4._id, label: 'SEA-2025-0004' },
      tags: ['pricing', 'approval'],
    },
    {
      title: 'Audit INV-2025-0004 partial payment allocation',
      description: 'Premier paid USD 1,800 against INV-2025-0004 (total USD 3,591). Confirm allocation across freight vs. surcharge lines in ledger.',
      status: 'review', priority: 'normal',
      assignedTo: finance._id, createdBy: finance._id,
      dueAt: daysAhead(4),
      linkedTo: { kind: 'Invoice', id: invoices[3]._id, label: 'INV-2025-0004' },
      tags: ['finance', 'reconciliation'],
    },

    // ── DONE (done) ───────────────────────────────────────────
    {
      title: 'Confirm CMA CGM booking for SEA-2025-0003',
      description: 'LCL consolidation booking BKG-25012011 confirmed with CMA CGM. HBL FPAE25012003 issued.',
      status: 'done', priority: 'normal',
      assignedTo: ops._id, createdBy: ops._id,
      dueAt: daysAgo(3), completedAt: daysAgo(3),
      linkedTo: { kind: 'Shipment', id: shp3._id, label: 'SEA-2025-0003' },
      tags: ['booking', 'sea'],
    },
    {
      title: 'Export customs cleared — AIR-2025-0001',
      description: 'DXB export customs declaration approved. EK9701 departed on schedule. Sent pre-alert to Triton London.',
      status: 'done', priority: 'high',
      assignedTo: ops._id, createdBy: ops._id,
      dueAt: daysAgo(5), completedAt: daysAgo(5),
      linkedTo: { kind: 'Shipment', id: shp3._id, label: 'AIR-2025-0001' },
      tags: ['customs', 'export', 'air'],
    },
    {
      title: 'Send INV-2025-0002 to Apex Manufacturing',
      description: 'Invoice for SEA-2025-0001 ocean freight and handling charges sent via email and uploaded to customer portal.',
      status: 'done', priority: 'normal',
      assignedTo: finance._id, createdBy: finance._id,
      dueAt: daysAgo(10), completedAt: daysAgo(10),
      linkedTo: { kind: 'Invoice', id: invoices[1]._id, label: 'INV-2025-0002' },
      tags: ['invoicing', 'AR'],
    },
    {
      title: 'KYC verification — Premier Retail Group',
      description: 'Collected trade license, passport copies, and MOA. All documents verified and filed. Status updated to verified.',
      status: 'done', priority: 'low',
      assignedTo: cs._id, createdBy: admin._id,
      dueAt: daysAgo(20), completedAt: daysAgo(18),
      linkedTo: { kind: 'Client', id: premier._id, label: 'Premier Retail Group LLC' },
      tags: ['compliance', 'KYC'],
    },
    {
      title: 'Update FastTruck detention rates in rate card',
      description: 'FastTruck notified of new detention rate effective last month. Rate card updated in system and communicated to ops team.',
      status: 'done', priority: 'low',
      assignedTo: ops._id, createdBy: manager._id,
      dueAt: daysAgo(7), completedAt: daysAgo(7),
      tags: ['rates', 'road'],
    },
  ];

  const tasks = await Task.insertMany(tasksData);
  console.log(`✅  ${tasks.length} tasks created`);

  /* ── done ─────────────────────────────────────────────────── */
  console.log('\n🎉  Seed complete!\n');
  console.log('━'.repeat(48));
  console.log('  LOGIN CREDENTIALS');
  console.log('━'.repeat(48));
  console.log('  Admin      : admin@freightpro.ae     / Demo@1234');
  console.log('  Manager    : manager@freightpro.ae   / Demo@1234');
  console.log('  Operations : ops@freightpro.ae       / Demo@1234');
  console.log('  Sales      : sales@freightpro.ae     / Demo@1234');
  console.log('  Finance    : finance@freightpro.ae   / Demo@1234');
  console.log('  CS         : cs@freightpro.ae        / Demo@1234');
  console.log('━'.repeat(48));
  console.log('\n  SUMMARY');
  console.log(`  • ${clients.length} clients   (shippers, consignees, agents, vendors)`);
  console.log(`  • ${shipments.length} shipments  (sea FCL/LCL, air, road — all stages)`);
  console.log(`  • ${invoices.length} invoices   (paid, overdue, partial, draft, AP)`);
  console.log(`  • ${deals.length} deals      (all pipeline stages)`);
  console.log(`  • ${rates.length} rates      (sea, air, road lanes)`);
  console.log(`  • ${tasks.length} tasks      (open, in_progress, review, done — linked to jobs)`);
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
