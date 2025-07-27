// Test file for markdown formatting
const formatAIResponse = (response) => {
    if (!response || typeof response !== 'string') {
        return response;
    }
    
    let formatted = response;
    
    // First, normalize line breaks
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove stray asterisks that appear after bullet points or content
    // This handles the specific issue from the examples where * appears after bullet point descriptions
    formatted = formatted.replace(/([^*\n])\s*\*\s*$/gm, '$1');
    formatted = formatted.replace(/([^*\n])\s*\*\s*([^\*])/g, '$1 $2');
    
    // Clean up multiple asterisks that aren't part of bold formatting
    formatted = formatted.replace(/\*{3,}/g, '**');
    
    // Fix bullet points - ensure they're properly separated
    // Handle bullet points that come after colons or at start of lines
    formatted = formatted.replace(/([^:\n])\s*•/g, '$1\n\n•');
    formatted = formatted.replace(/:\s*•/g, ':\n\n•');
    
    // Ensure bullet points are properly spaced
    formatted = formatted.replace(/^•\s*/gm, '• ');
    formatted = formatted.replace(/\n•\s*/g, '\n• ');
    
    // Fix numbered lists - ensure they're properly separated  
    formatted = formatted.replace(/([^:\n])\s*(\d+\.)/g, '$1\n\n$2');
    formatted = formatted.replace(/:\s*(\d+\.)/g, ':\n\n$1');
    formatted = formatted.replace(/^(\d+\.)\s*/gm, '$1 ');
    
    // Fix headers - ensure proper spacing around them
    formatted = formatted.replace(/([^\n])\s*(#{1,6})\s*([^\n]+)/g, '$1\n\n$2 $3\n\n');
    formatted = formatted.replace(/^(#{1,6})\s*([^\n]+)/gm, '$1 $2\n\n');
    
    // Fix bold sections that should be on their own lines (but preserve inline bold)
    formatted = formatted.replace(/([^\n*])\s*\*\*([^*\n]+)\*\*:\s*/g, '$1\n\n**$2:**\n\n');
    
    // Clean up excessive line breaks but preserve intentional spacing
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n');
    formatted = formatted.replace(/\n{3}/g, '\n\n');
    
    // Clean up spaces before bullet points
    formatted = formatted.replace(/\n\s+•/g, '\n•');
    
    // Clean up leading/trailing whitespace
    formatted = formatted.trim();
    
    return formatted;
};

// Test cases based on user examples
console.log('Testing Markdown Formatting...\n');

// Test 1: User's specific example with stray asterisks
const test1 = `What causes anemia?

Anemia can be caused by a variety of factors, including:

• Blood loss: Internal bleeding, surgery, or injury can cause anemia. *
Poor diet: Deficiencies in essential nutrients like iron, vitamin B12, or folate can lead to anemia. *
Chronic diseases: Certain chronic diseases, such as kidney disease, cancer, or rheumatoid arthritis, can cause anemia.`;

console.log('Test 1: Removing stray asterisks');
console.log('Input:', JSON.stringify(test1));
console.log('Output:', JSON.stringify(formatAIResponse(test1)));
console.log('---\n');

// Test 2: Mixed bullet points with proper formatting
const test2 = `Types of anemia:

There are several types of anemia, including:

• Iron-deficiency anemia: The most common type, caused by low iron levels in the body. * Vitamin deficiency anemia: Caused by a lack of vitamin B12 or folate. * Anemia of chronic disease: Caused by chronic diseases like cancer, kidney disease, or rheumatoid arthritis.`;

console.log('Test 2: Fixing mixed bullet point formatting');
console.log('Input:', JSON.stringify(test2));
console.log('Output:', JSON.stringify(formatAIResponse(test2)));
console.log('---\n');

// Test 3: Headers and bullet points combination
const test3 = `## Understanding Anemia
Anemia is a condition. Symptoms include:
• Fatigue or weakness • Shortness of breath • Pale skin`;

console.log('Test 3: Headers with bullet points');
console.log('Input:', JSON.stringify(test3));
console.log('Output:', JSON.stringify(formatAIResponse(test3)));
console.log('---\n');

// Test 4: Bold text with bullet points
const test4 = `**Treatment and management:** Treatment depends on cause. Common treatments include:
• Iron supplements: To increase iron levels. * Folic acid supplements: To increase folate. * Blood transfusions: To increase red blood cell count.`;

console.log('Test 4: Bold text with mixed bullet points');
console.log('Input:', JSON.stringify(test4));
console.log('Output:', JSON.stringify(formatAIResponse(test4)));

console.log('\nTest complete!'); 