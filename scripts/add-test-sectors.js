/**
 * Script to add sector information to existing questionnaires
 * Run with: node scripts/add-test-sectors.js
 */

const mongoose = require('mongoose');

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csrars';

const sectorKeywords = {
    'Banking & Finance': ['bank', 'financial', 'finance', 'credit'],
    'Healthcare': ['hospital', 'health', 'medical', 'clinic'],
    'Government': ['ministry', 'government', 'federal', 'regional'],
    'Education': ['university', 'school', 'college', 'education'],
    'Telecommunications': ['telecom', 'ethio telecom', 'mobile', 'network'],
    'Manufacturing': ['factory', 'manufacturing', 'industry', 'production'],
    'Energy & Utilities': ['electric', 'power', 'water', 'energy'],
    'Transportation': ['airline', 'transport', 'railway', 'logistics'],
    'Retail & Commerce': ['retail', 'shop', 'store', 'commerce'],
    'Technology & IT': ['tech', 'software', 'IT', 'digital']
};

async function addSectorsToQuestionnaires() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Questionnaire = mongoose.model('Questionnaire', new mongoose.Schema({}, { strict: false }));

        // Get all questionnaires
        const questionnaires = await Questionnaire.find({});
        console.log(`📊 Found ${questionnaires.length} questionnaires`);

        let updated = 0;

        for (const q of questionnaires) {
            // Skip if already has sector
            if (q.sector && q.sector !== 'Other') {
                console.log(`⏭️  Skipping ${q.company} - already has sector: ${q.sector}`);
                continue;
            }

            // Determine sector based on company name
            let assignedSector = 'Other';
            const companyLower = (q.company || '').toLowerCase();

            for (const [sector, keywords] of Object.entries(sectorKeywords)) {
                if (keywords.some(keyword => companyLower.includes(keyword))) {
                    assignedSector = sector;
                    break;
                }
            }

            // Update questionnaire
            await Questionnaire.updateOne(
                { _id: q._id },
                { $set: { sector: assignedSector } }
            );

            console.log(`✅ Updated ${q.company} → ${assignedSector}`);
            updated++;
        }

        console.log(`\n🎉 Successfully updated ${updated} questionnaires!`);
        console.log('\n📊 Sector Distribution:');

        // Show distribution
        const distribution = await Questionnaire.aggregate([
            { $group: { _id: '$sector', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        distribution.forEach(d => {
            console.log(`   ${d._id}: ${d.count} organizations`);
        });

        console.log('\n✨ You can now view the benchmarking dashboard at:');
        console.log('   http://localhost:3000/benchmarking');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

// Run the script
addSectorsToQuestionnaires();
