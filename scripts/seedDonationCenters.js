const mongoose = require('mongoose');
const DonationCenter = require('../models/donationCenter.model');
require('dotenv').config();

// Sample donation centers data
const sampleCenters = [
  {
    name: "Central Blood Bank",
    address: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
      fullAddress: "123 Main St, New York, NY 10001"
    },
    location: {
      type: "Point",
      coordinates: [-74.006, 40.7128] // [longitude, latitude]
    },
    contact: {
      phone: "(212) 555-0123",
      email: "info@centralbloodbank.org",
      website: "https://centralbloodbank.org"
    },
    operatingHours: {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "16:00", closed: false },
      sunday: { open: "10:00", close: "15:00", closed: false }
    },
    bloodTypesAccepted: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    bloodInventory: [
      { bloodType: "A+", unitsAvailable: 25, lastUpdated: new Date() },
      { bloodType: "B+", unitsAvailable: 18, lastUpdated: new Date() },
      { bloodType: "O+", unitsAvailable: 32, lastUpdated: new Date() },
      { bloodType: "AB+", unitsAvailable: 12, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "plasma_donation", "platelet_donation", "blood_testing"],
    capacity: {
      dailyDonors: 75,
      appointmentSlots: 30
    },
    status: "active",
    rating: {
      average: 4.5,
      count: 127
    },
    features: ["parking", "wheelchair_accessible", "wifi", "refreshments", "gift_shop"]
  },
  {
    name: "City Hospital Blood Center",
    address: {
      street: "456 Park Ave",
      city: "New York",
      state: "NY",
      zipCode: "10016",
      country: "USA",
      fullAddress: "456 Park Ave, New York, NY 10016"
    },
    location: {
      type: "Point",
      coordinates: [-73.9942, 40.7282]
    },
    contact: {
      phone: "(212) 555-0456",
      email: "blood@cityhospital.org",
      website: "https://cityhospital.org/blood-center"
    },
    operatingHours: {
      monday: { open: "07:00", close: "19:00", closed: false },
      tuesday: { open: "07:00", close: "19:00", closed: false },
      wednesday: { open: "07:00", close: "19:00", closed: false },
      thursday: { open: "07:00", close: "19:00", closed: false },
      friday: { open: "07:00", close: "19:00", closed: false },
      saturday: { open: "08:00", close: "17:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    bloodTypesAccepted: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    bloodInventory: [
      { bloodType: "A+", unitsAvailable: 30, lastUpdated: new Date() },
      { bloodType: "A-", unitsAvailable: 15, lastUpdated: new Date() },
      { bloodType: "O+", unitsAvailable: 40, lastUpdated: new Date() },
      { bloodType: "O-", unitsAvailable: 8, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "plasma_donation", "blood_testing"],
    capacity: {
      dailyDonors: 100,
      appointmentSlots: 40
    },
    status: "active",
    rating: {
      average: 4.2,
      count: 89
    },
    features: ["parking", "wheelchair_accessible", "wifi", "refreshments"]
  },
  {
    name: "Downtown Donation Center",
    address: {
      street: "789 Broadway",
      city: "New York",
      state: "NY",
      zipCode: "10003",
      country: "USA",
      fullAddress: "789 Broadway, New York, NY 10003"
    },
    location: {
      type: "Point",
      coordinates: [-73.9973, 40.7309]
    },
    contact: {
      phone: "(212) 555-0789",
      email: "donate@downtowncenter.org",
      website: "https://downtowncenter.org"
    },
    operatingHours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "15:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    bloodTypesAccepted: ["B+", "B-", "AB+", "AB-", "A+", "O+"],
    bloodInventory: [
      { bloodType: "B+", unitsAvailable: 20, lastUpdated: new Date() },
      { bloodType: "B-", unitsAvailable: 12, lastUpdated: new Date() },
      { bloodType: "AB+", unitsAvailable: 16, lastUpdated: new Date() },
      { bloodType: "AB-", unitsAvailable: 5, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "platelet_donation"],
    capacity: {
      dailyDonors: 50,
      appointmentSlots: 25
    },
    status: "active",
    rating: {
      average: 4.0,
      count: 56
    },
    features: ["wheelchair_accessible", "wifi", "refreshments"]
  },
  {
    name: "Uptown Medical Center",
    address: {
      street: "321 5th Ave",
      city: "New York",
      state: "NY",
      zipCode: "10016",
      country: "USA",
      fullAddress: "321 5th Ave, New York, NY 10016"
    },
    location: {
      type: "Point",
      coordinates: [-73.9851, 40.7489]
    },
    contact: {
      phone: "(212) 555-0321",
      email: "blood@uptownmedical.org",
      website: "https://uptownmedical.org/blood-services"
    },
    operatingHours: {
      monday: { open: "08:30", close: "18:30", closed: false },
      tuesday: { open: "08:30", close: "18:30", closed: false },
      wednesday: { open: "08:30", close: "18:30", closed: false },
      thursday: { open: "08:30", close: "18:30", closed: false },
      friday: { open: "08:30", close: "18:30", closed: false },
      saturday: { open: "09:00", close: "16:00", closed: false },
      sunday: { open: "11:00", close: "15:00", closed: false }
    },
    bloodTypesAccepted: ["A+", "B+", "AB+", "O-", "O+"],
    bloodInventory: [
      { bloodType: "A+", unitsAvailable: 22, lastUpdated: new Date() },
      { bloodType: "B+", unitsAvailable: 19, lastUpdated: new Date() },
      { bloodType: "AB+", unitsAvailable: 14, lastUpdated: new Date() },
      { bloodType: "O-", unitsAvailable: 6, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "plasma_donation", "blood_testing", "mobile_unit"],
    capacity: {
      dailyDonors: 80,
      appointmentSlots: 35
    },
    status: "active",
    rating: {
      average: 4.7,
      count: 145
    },
    features: ["parking", "wheelchair_accessible", "wifi", "refreshments", "childcare"]
  },
  {
    name: "Eastside Blood Donation",
    address: {
      street: "654 3rd Ave",
      city: "New York",
      state: "NY",
      zipCode: "10017",
      country: "USA",
      fullAddress: "654 3rd Ave, New York, NY 10017"
    },
    location: {
      type: "Point",
      coordinates: [-73.9861, 40.7168]
    },
    contact: {
      phone: "(212) 555-0654",
      email: "info@eastsideblood.org",
      website: "https://eastsideblood.org"
    },
    operatingHours: {
      monday: { open: "10:00", close: "18:00", closed: false },
      tuesday: { open: "10:00", close: "18:00", closed: false },
      wednesday: { open: "10:00", close: "18:00", closed: false },
      thursday: { open: "10:00", close: "18:00", closed: false },
      friday: { open: "10:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "15:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    bloodTypesAccepted: ["O+", "O-", "A+", "B+"],
    bloodInventory: [
      { bloodType: "O+", unitsAvailable: 35, lastUpdated: new Date() },
      { bloodType: "O-", unitsAvailable: 10, lastUpdated: new Date() },
      { bloodType: "A+", unitsAvailable: 28, lastUpdated: new Date() },
      { bloodType: "B+", unitsAvailable: 16, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "plasma_donation"],
    capacity: {
      dailyDonors: 60,
      appointmentSlots: 28
    },
    status: "active",
    rating: {
      average: 4.3,
      count: 78
    },
    features: ["parking", "wifi", "refreshments"]
  },
  // Additional centers in different cities
  {
    name: "Los Angeles Blood Services",
    address: {
      street: "1000 Wilshire Blvd",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90017",
      country: "USA",
      fullAddress: "1000 Wilshire Blvd, Los Angeles, CA 90017"
    },
    location: {
      type: "Point",
      coordinates: [-118.2437, 34.0522]
    },
    contact: {
      phone: "(213) 555-1000",
      email: "info@labloodservices.org",
      website: "https://labloodservices.org"
    },
    operatingHours: {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "16:00", closed: false },
      sunday: { open: "10:00", close: "15:00", closed: false }
    },
    bloodTypesAccepted: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    bloodInventory: [
      { bloodType: "A+", unitsAvailable: 45, lastUpdated: new Date() },
      { bloodType: "O+", unitsAvailable: 52, lastUpdated: new Date() },
      { bloodType: "B+", unitsAvailable: 28, lastUpdated: new Date() },
      { bloodType: "AB+", unitsAvailable: 18, lastUpdated: new Date() }
    ],
    services: ["blood_donation", "plasma_donation", "platelet_donation", "blood_testing"],
    capacity: {
      dailyDonors: 120,
      appointmentSlots: 50
    },
    status: "active",
    rating: {
      average: 4.6,
      count: 203
    },
    features: ["parking", "wheelchair_accessible", "wifi", "refreshments", "gift_shop"]
  }
];

// Connect to MongoDB and seed the data
async function seedDonationCenters() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/light-charity', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing donation centers
    await DonationCenter.deleteMany({});
    console.log('Cleared existing donation centers');

    // Insert sample centers
    const insertedCenters = await DonationCenter.insertMany(sampleCenters);
    console.log(`Inserted ${insertedCenters.length} donation centers`);

    console.log('Donation centers seeded successfully!');
    
    // Display inserted centers
    insertedCenters.forEach(center => {
      console.log(`- ${center.name} (${center.address.city}, ${center.address.state})`);
    });

  } catch (error) {
    console.error('Error seeding donation centers:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedDonationCenters();
}

module.exports = { seedDonationCenters, sampleCenters };
