const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/volunteer';

// Test data
const testApplication = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    phone: '+1234567890',
    interests: ['Event Support', 'Outreach'],
    availability: ['Weekends', 'Evenings'],
    message: 'I am passionate about helping others and want to make a difference in my community.'
};

async function testVolunteerAPI() {
    console.log('🧪 Testing Volunteer API Endpoints...\n');

    try {
        // Test 1: Submit a volunteer application
        console.log('1. Testing volunteer application submission...');
        const response = await axios.post(`${BASE_URL}/apply`, testApplication);
        console.log('✅ Application submitted successfully');
        console.log('Response:', response.data);
        
        // Test 2: Get all applications
        console.log('\n2. Testing get all applications...');
        const applicationsResponse = await axios.get(`${BASE_URL}/applications`);
        console.log('✅ Applications retrieved successfully');
        console.log('Total applications:', applicationsResponse.data.data.length);
        
        // Test 3: Get statistics
        console.log('\n3. Testing get volunteer statistics...');
        const statsResponse = await axios.get(`${BASE_URL}/applications/stats`);
        console.log('✅ Statistics retrieved successfully');
        console.log('Statistics:', statsResponse.data.data);
        
        // Test 4: Get single application (if we have one)
        if (applicationsResponse.data.data.length > 0) {
            const applicationId = applicationsResponse.data.data[0]._id;
            console.log('\n4. Testing get single application...');
            const singleAppResponse = await axios.get(`${BASE_URL}/applications/${applicationId}`);
            console.log('✅ Single application retrieved successfully');
            console.log('Application ID:', singleAppResponse.data.data._id);
            
            // Test 5: Update application status
            console.log('\n5. Testing update application status...');
            const updateResponse = await axios.put(`${BASE_URL}/applications/${applicationId}/status`, {
                status: 'contacted',
                notes: 'Initial contact made'
            });
            console.log('✅ Application status updated successfully');
            console.log('Updated status:', updateResponse.data.data.status);
        }
        
        console.log('\n🎉 All tests passed! Volunteer API is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data?.errors) {
            console.error('Validation errors:', error.response.data.errors);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testVolunteerAPI();
}

module.exports = testVolunteerAPI; 