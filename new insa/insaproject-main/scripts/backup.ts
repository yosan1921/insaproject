/*
	Simple backup script for MongoDB data.
	This does not modify application logic and can be run manually, e.g.:
	npx ts-node scripts/backup.ts
*/

import fs from "fs";
import path from "path";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

async function main() {
	await dbConnect();

	const dir = path.join(process.cwd(), "backups");
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

	// Example: backup users collection; extend as needed.
	const users = await User.find({}).lean();
	fs.writeFileSync(
		path.join(dir, `users-${timestamp}.json`),
		JSON.stringify(users, null, 2),
		"utf8",
	);

	// Additional collections can be added here in the future

	// eslint-disable-next-line no-console
	console.log("Backup completed at", timestamp);
}

main().catch((err) => {
	// eslint-disable-next-line no-console
	console.error("Backup failed", err);
	process.exit(1);
});

