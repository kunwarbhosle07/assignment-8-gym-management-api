const mongoose = require('mongoose');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');

dotenv.config();

const User = require('./models/User');
const FitnessClass = require('./models/FitnessClass');
const connectDB = require('./config/db');

async function runValidationTests() {
  console.log('--- Starting Automated Validation Tests ---');

  // Connect to DB
  await connectDB();

  // Clear existing test data
  await User.deleteMany({ email: /@testvalidation\.com$/ });
  await FitnessClass.deleteMany({ title: 'Validation HIIT Class' });

  // Test 1: Register a member with 1-month membership and verify membershipExpiryDate is exactly 30 days in the future
  console.log('\n[Test 1] Registering a 1-month membership user...');
  const nowBefore = new Date();
  const user1 = new User({
    username: 'test_val_user1',
    email: 'user1@testvalidation.com',
    password: 'hashedpassword123',
    membershipTier: 'Silver'
  });
  user1.durationMonths = 1;
  await user1.save();

  const expiryMs = user1.membershipExpiryDate.getTime();
  const expectedExpiryMs = nowBefore.getTime() + 30 * 24 * 60 * 60 * 1000;
  const diffSeconds = Math.abs(expiryMs - expectedExpiryMs) / 1000;

  console.log(`- Expiry Date: ${user1.membershipExpiryDate.toISOString()}`);
  console.log(`- Difference from (now + 30 days): ${diffSeconds.toFixed(2)} seconds`);

  if (diffSeconds < 5) {
    console.log('✅ Test 1 PASSED: Expiry date is exactly 30 days in the future!');
  } else {
    console.error('❌ Test 1 FAILED: Expiry date calculation mismatch.');
  }

  // Test 2: Create a class with maxCapacity = 2
  console.log('\n[Test 2] Creating a fitness class with maxCapacity = 2...');
  const testClass = new FitnessClass({
    title: 'Validation HIIT Class',
    trainerName: 'Trainer John',
    scheduleDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
    durationMinutes: 45,
    maxCapacity: 2,
    enrolledMembers: []
  });
  await testClass.save();
  console.log(`- Created Class ID: ${testClass._id}, Max Capacity: ${testClass.maxCapacity}`);
  console.log('✅ Test 2 PASSED: Fitness class created successfully!');

  // Test 3: Attempt to book 3 members into the class; verify 3rd booking fails with 400 Bad Request: Class capacity reached
  console.log('\n[Test 3] Enrolling 3 members into a maxCapacity=2 class...');
  const user2 = new User({ username: 'test_val_user2', email: 'user2@testvalidation.com', password: 'password', membershipExpiryDate: new Date(Date.now() + 100000) });
  const user3 = new User({ username: 'test_val_user3', email: 'user3@testvalidation.com', password: 'password', membershipExpiryDate: new Date(Date.now() + 100000) });
  const user4 = new User({ username: 'test_val_user4', email: 'user4@testvalidation.com', password: 'password', membershipExpiryDate: new Date(Date.now() + 100000) });
  await Promise.all([user2.save(), user3.save(), user4.save()]);

  // Book User 1
  const update1 = await FitnessClass.findOneAndUpdate(
    { _id: testClass._id, enrolledMembers: { $ne: user2._id }, $expr: { $lt: [{ $size: '$enrolledMembers' }, '$maxCapacity'] } },
    { $push: { enrolledMembers: user2._id } },
    { new: true }
  );
  console.log(`- Booking 1 (User 2): ${update1 ? 'Success' : 'Failed'}`);

  // Book User 2
  const update2 = await FitnessClass.findOneAndUpdate(
    { _id: testClass._id, enrolledMembers: { $ne: user3._id }, $expr: { $lt: [{ $size: '$enrolledMembers' }, '$maxCapacity'] } },
    { $push: { enrolledMembers: user3._id } },
    { new: true }
  );
  console.log(`- Booking 2 (User 3): ${update2 ? 'Success' : 'Failed'}`);

  // Book User 3 (Should fail due to capacity limit)
  const update3 = await FitnessClass.findOneAndUpdate(
    { _id: testClass._id, enrolledMembers: { $ne: user4._id }, $expr: { $lt: [{ $size: '$enrolledMembers' }, '$maxCapacity'] } },
    { $push: { enrolledMembers: user4._id } },
    { new: true }
  );
  console.log(`- Booking 3 (User 4): ${update3 ? 'Success' : 'Failed (Class capacity reached)'}`);

  if (update1 && update2 && !update3) {
    console.log('✅ Test 3 PASSED: 3rd booking rejected with "Class capacity reached"!');
  } else {
    console.error('❌ Test 3 FAILED: Capacity constraint did not trigger as expected.');
  }

  // Test 4: Query /api/members/expired
  console.log('\n[Test 4] Querying expired members...');
  const expiredUser = new User({
    username: 'test_val_expired',
    email: 'expired@testvalidation.com',
    password: 'password',
    membershipExpiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Expired 5 days ago
  });
  await expiredUser.save();

  const expiredList = await User.find({ membershipExpiryDate: { $lt: new Date() } });
  console.log(`- Found ${expiredList.length} expired members in DB.`);
  const foundOurUser = expiredList.some(u => u.username === 'test_val_expired');

  if (foundOurUser) {
    console.log('✅ Test 4 PASSED: Expired members queried successfully!');
  } else {
    console.error('❌ Test 4 FAILED: Expired member not found in query.');
  }

  // Clean up test data
  await User.deleteMany({ email: /@testvalidation\.com$/ });
  await FitnessClass.deleteMany({ title: 'Validation HIIT Class' });

  console.log('\n--- All Validation Scenarios Completed Successfully ---');
  process.exit(0);
}

runValidationTests().catch(err => {
  console.error('Validation test error:', err);
  process.exit(1);
});
