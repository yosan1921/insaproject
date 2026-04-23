// Script to add Risk Register IDs to existing RiskAnalysis records
const mongoose = require('mongoose');

// MongoDB connection string - hardcoded for migration
const MONGODB_URI = "mongodb+srv://kalid-insa:tOB07nwzRsQKokgn@cluster1.kowbzuv.mongodb.net/insa_questioner?retryWrites=true&w=majority&appName=Cluster1";

async function migrateRiskIds() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');

        const RiskAnalysis = mongoose.model('RiskAnalysis', new mongoose.Schema({}, { strict: false }));

        // Find all records without riskRegisterId
        const recordsWithoutId = await RiskAnalysis.find({
            $or: [
                { riskRegisterId: { $exists: false } },
                { riskRegisterId: null },
                { riskRegisterId: '' }
            ]
        }).sort({ createdAt: 1 });

        console.log(`Found ${recordsWithoutId.length} records without Risk Register ID`);

        if (recordsWithoutId.length === 0) {
            console.log('All records already have Risk Register IDs!');
            await mongoose.connection.close();
            return;
        }

        const year = new Date().getFullYear();
        let counter = 1;

        // Check if there are existing IDs to determine starting counter
        const existingIds = await RiskAnalysis.find({
            riskRegisterId: { $exists: true, $ne: null, $ne: '' }
        }).select('riskRegisterId');

        if (existingIds.length > 0) {
            // Extract the highest sequence number
            const numbers = existingIds
                .map(doc => {
                    const match = doc.riskRegisterId?.match(/RR-\d{4}-(\d{4})/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .filter(num => !isNaN(num));

            if (numbers.length > 0) {
                counter = Math.max(...numbers) + 1;
            }
        }

        console.log(`Starting from counter: ${counter}`);

        // Update each record
        for (const record of recordsWithoutId) {
            const sequenceNumber = String(counter).padStart(4, '0');
            const riskRegisterId = `RR-${year}-${sequenceNumber}`;

            await RiskAnalysis.updateOne(
                { _id: record._id },
                { $set: { riskRegisterId } }
            );

            console.log(`Updated ${record._id} with ${riskRegisterId}`);
            counter++;
        }

        console.log(`\nMigration completed! Updated ${recordsWithoutId.length} records.`);
        await mongoose.connection.close();
        console.log('Database connection closed.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
migrateRiskIds();
