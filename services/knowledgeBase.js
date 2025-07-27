// Comprehensive Knowledge Base for Light Charity Blood Donation Assistant

const bloodDonationKnowledge = {
    bloodBasics: {
        definition: `Blood is a vital fluid that circulates through our bodies, carrying oxygen, nutrients, and waste products to and from our cells. It's a liquid tissue made up of:

**Components of Blood:**
• **Plasma:** The clear liquid part of blood that carries proteins, nutrients, and hormones
• **Red Blood Cells (RBCs):** These cells carry oxygen from the lungs to the body's tissues and organs
• **White Blood Cells (WBCs):** These cells help fight infections and diseases  
• **Platelets:** These tiny cells play a crucial role in blood clotting, helping to stop bleeding when we're injured

Blood is essential for our bodies to function properly, and it's what makes blood donation so important.`,
        
        importance: `**Why Blood Donation Matters:**
• Saves up to 3 lives with each donation
• Helps patients with cancer, blood disorders, and traumatic injuries
• Supports surgeries and medical treatments
• Only 3% of eligible donors actually donate
• Blood cannot be manufactured - it can only come from donors`
    },

    eligibilityRequirements: {
        basic: `**Basic Eligibility Requirements:**
• Age: 18-65 years old (some locations allow 16-17 with parental consent)
• Weight: At least 50kg (110 lbs)
• Good general health
• No recent illness or fever
• Not pregnant or breastfeeding

**Disqualifying Conditions:**
• Recent tattoos or piercings (within 3-12 months)
• Recent travel to certain countries
• Certain medications
• History of specific medical conditions
• Recent blood donation (must wait 56 days for whole blood)`,
        
        preparation: `**How to Prepare for Donation:**
• Get a good night's sleep
• Eat a healthy meal before donating
• Drink plenty of water
• Bring valid ID
• Avoid alcohol 24 hours before
• Avoid fatty foods before donation`
    },

    donationProcess: {
        steps: `**Donation Process Steps:**
1. **Registration:** Check-in and provide ID
2. **Health Screening:** Mini-physical and questionnaire
3. **Donation:** The actual blood collection (8-10 minutes)
4. **Recovery:** Rest and refreshments (10-15 minutes)
5. **Follow-up:** Care instructions and scheduling next donation

**What to Expect:**
• Total time: 45-60 minutes
• Actual donation: 8-10 minutes
• About 1 pint (450ml) of blood collected
• Professional, sterile equipment used
• Minimal discomfort - like a brief pinch`,
        
        afterCare: `**After Your Donation:**
• Keep bandage on for 4-6 hours
• Avoid heavy lifting for 24 hours
• Drink extra fluids for 24-48 hours
• Eat iron-rich foods
• Avoid alcohol for 24 hours
• Contact us if you feel unwell`
    },

    bloodTypes: {
        overview: `**Blood Types and Compatibility:**
• **O Negative:** Universal donor - can donate to all blood types
• **O Positive:** Most common type - can donate to all positive types
• **A Negative:** Can donate to A and AB types
• **A Positive:** Can donate to A+ and AB+ types
• **B Negative:** Can donate to B and AB types  
• **B Positive:** Can donate to B+ and AB+ types
• **AB Negative:** Can donate to AB types only
• **AB Positive:** Universal plasma donor

**Most Needed Types:**
• O Negative (universal donor)
• O Positive (most common)
• B Negative (rare type)`,
        
        facts: `**Blood Type Facts:**
• Type O blood is needed most often
• Only 7% of people have O negative blood
• Type AB plasma is needed for all blood types
• Blood type is determined by genetics
• Some types are more common in certain ethnicities`
    },

    websiteFeatures: {
        navigation: `**Website Features & Navigation:**
• **Home:** Welcome page with quick access to key features
• **Donate:** Schedule appointments and find donation drives
• **Locations:** Interactive map to find nearest donation centers
• **About:** Learn about Light Charity's mission and impact
• **Dashboard:** Track your donation history and appointments
• **News & Blog:** Latest updates on blood donation and health
• **Contact:** Get in touch with our team

**Quick Actions Available:**
• Register as a donor
• Schedule an appointment
• Find nearest center
• Check blood availability
• View donation history`,
        
        services: `**Our Services:**
• Mobile blood drives
• Corporate donation programs
• School and community partnerships
• 24/7 emergency blood supply
• Specialized donation programs
• Donor recognition programs
• Health screenings and wellness checks`
    },

    emergencyInfo: {
        urgentNeeds: `**When Blood is Needed Most:**
• Accident victims and trauma cases
• Cancer patients undergoing treatment
• Surgical procedures
• Blood disorders like sickle cell disease
• Childbirth complications
• Burns and other emergencies

**Critical Shortage Situations:**
• Natural disasters
• Multiple casualty events
• Holiday periods (donations drop)
• Summer months (school donations decrease)`,
        
        response: `**Our Emergency Response:**
• 24/7 blood bank availability
• Rapid deployment teams
• Emergency donor calling system
• Coordination with hospitals
• Mobile units for disaster response`
    }
};

const formatResponse = (content, type = 'standard') => {
    // Ensure proper markdown formatting with correct line breaks
    let formatted = content;
    
    switch (type) {
        case 'list':
            // Ensure each bullet point is on a new line with proper spacing
            formatted = content
                .split('•')
                .filter(item => item.trim())
                .map((item, index) => index === 0 ? item : '• ' + item.trim())
                .join('\n');
            break;
            
        case 'steps':
            // Ensure each numbered step is on a new line
            formatted = content.replace(/(\d+\.\s)/g, '\n$1');
            break;
            
        case 'sections':
            // Ensure proper spacing around headers and sections
            formatted = content
                .replace(/\*\*(.*?)\*\*/g, '\n\n**$1**\n\n')  // Add spacing around bold headers
                .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive line breaks
                .replace(/•\s*([^•\n]+)/g, '• $1')  // Ensure proper bullet formatting
                .replace(/\n•/g, '\n• ')  // Add space after bullet
                .trim();
            break;
            
        default:
            // Default formatting with proper line breaks
            formatted = content
                .replace(/•\s*([^•\n]+)/g, '\n• $1')  // Fix bullet points
                .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive line breaks
                .replace(/^\n+/, '')  // Remove leading line breaks
                .trim();
    }
    
    return formatted;
};

const getKnowledgeResponse = (topic, subtopic = null) => {
    try {
        if (subtopic && bloodDonationKnowledge[topic] && bloodDonationKnowledge[topic][subtopic]) {
            return formatResponse(bloodDonationKnowledge[topic][subtopic], 'sections');
        } else if (bloodDonationKnowledge[topic]) {
            // Return the first available subtopic or overview
            const firstKey = Object.keys(bloodDonationKnowledge[topic])[0];
            return formatResponse(bloodDonationKnowledge[topic][firstKey], 'sections');
        }
        return null;
    } catch (error) {
        console.error('Error retrieving knowledge:', error);
        return null;
    }
};

const searchKnowledge = (query) => {
    const lowercaseQuery = query.toLowerCase();
    const results = [];
    
    // Search through all knowledge base content
    Object.keys(bloodDonationKnowledge).forEach(topic => {
        Object.keys(bloodDonationKnowledge[topic]).forEach(subtopic => {
            const content = bloodDonationKnowledge[topic][subtopic];
            if (content.toLowerCase().includes(lowercaseQuery)) {
                results.push({
                    topic,
                    subtopic,
                    content: formatResponse(content, 'sections'),
                    relevance: (content.toLowerCase().match(new RegExp(lowercaseQuery, 'g')) || []).length
                });
            }
        });
    });
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
};

module.exports = {
    bloodDonationKnowledge,
    getKnowledgeResponse,
    searchKnowledge,
    formatResponse
}; 